// Round-up push fan-out. Called by the client right after post_crew_roundup
// succeeds, with the new roundup_id in the body. We look up the crew, build
// the payload, and fire one web-push per member subscription (minus the
// leader who just posted it). Dead subscriptions (404/410) get GC'd.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

interface Body {
  roundup_id?: string;
  dry_run?: boolean;
}

// CORS for browser-invoked function (Supabase JS client does a preflight).
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSub = Deno.env.get('VAPID_SUBJECT') || 'mailto:ops@dailymax.app';
  if (!url || !svc) {
    return new Response('missing supabase env', { status: 500, headers: CORS });
  }

  const body: Body = req.method === 'POST'
    ? await req.json().catch(() => ({}))
    : {};
  const roundupId = body.roundup_id;
  const dryRun = body.dry_run ?? false;
  if (!roundupId) {
    return new Response(JSON.stringify({ error: 'roundup_id required' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const sb = createClient(url, svc, { auth: { persistSession: false } });
  const canPush = !!(vapidPub && vapidPriv);
  if (canPush) {
    webpush.setVapidDetails(vapidSub, vapidPub!, vapidPriv!);
  }

  // Load the round-up + its crew.
  const { data: rnd, error: rErr } = await sb
    .from('crew_roundups')
    .select('id, clan_id, title, cue, created_by, expires_at')
    .eq('id', roundupId)
    .single();
  if (rErr || !rnd) {
    return new Response(JSON.stringify({ error: rErr?.message || 'not found' }), {
      status: 404, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const { data: members } = await sb
    .from('clan_members')
    .select('user_id')
    .eq('clan_id', rnd.clan_id);
  const recipients = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== rnd.created_by);
  if (recipients.length === 0) {
    return new Response(JSON.stringify({ dispatched: 0, recipients: 0 }), {
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', recipients);

  const payload = JSON.stringify({
    title: `🚩 ${rnd.title}`,
    body: (rnd.cue || '').slice(0, 140),
    url: '/',
    tag: `roundup-${rnd.id}`,
  });

  let delivered = 0;
  let dead = 0;
  if (canPush && !dryRun) {
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        delivered++;
        sb.from('push_subscriptions')
          .update({ last_ok_at: new Date().toISOString() })
          .eq('endpoint', s.endpoint)
          .eq('user_id', s.user_id)
          .then(() => {}, () => {});
      } catch (err: any) {
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          dead++;
          await sb.from('push_subscriptions')
            .delete()
            .eq('endpoint', s.endpoint)
            .eq('user_id', s.user_id);
        }
      }
    }
  }

  return new Response(JSON.stringify({
    roundup_id: rnd.id,
    recipients: recipients.length,
    subscriptions: (subs ?? []).length,
    delivered,
    dead,
    push_enabled: canPush,
    dry_run: dryRun,
  }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
});
