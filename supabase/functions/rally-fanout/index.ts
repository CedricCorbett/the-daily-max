// Rally fan-out. Runs on a cron (6am local). Collects un-pushed rallies per recipient
// and fires one combined web-push per subscription. Dead subscriptions (410/404) are
// garbage-collected. Rallies are only marked `pushed=true` if at least one delivery
// succeeded (so a recipient without a subscription still sees the in-app notice).
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

interface FanoutPayload {
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSub = Deno.env.get('VAPID_SUBJECT') || 'mailto:ops@dailymax.app';
  if (!url || !key) {
    return new Response('missing supabase env', { status: 500 });
  }

  const body: FanoutPayload = req.method === 'POST'
    ? await req.json().catch(() => ({}))
    : {};
  const dryRun = body.dry_run ?? false;

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const canPush = !!(vapidPub && vapidPriv);
  if (canPush) {
    webpush.setVapidDetails(vapidSub, vapidPub!, vapidPriv!);
  }

  // Pending rallies from the last 24h, grouped by recipient
  const { data: pending, error } = await sb
    .from('rallies')
    .select('id, to_user, from_user, msg, sent_at, pushed')
    .eq('pushed', false)
    .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const byRecipient = new Map<string, typeof pending>();
  for (const r of pending ?? []) {
    const list = byRecipient.get(r.to_user) ?? [];
    list.push(r);
    byRecipient.set(r.to_user, list);
  }

  const summaries: Array<{
    to_user: string;
    count: number;
    delivered: number;
    dead: number;
  }> = [];

  for (const [to_user, rows] of byRecipient) {
    const count = rows.length;
    let delivered = 0;
    let dead = 0;

    if (canPush && !dryRun) {
      const { data: subs } = await sb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', to_user);

      const payload = JSON.stringify({
        title: '✊ The crew pulled up',
        body: count === 1
          ? '1 rally waiting. Tap to read.'
          : `${count} rallies waiting. Tap to read.`,
        url: '/',
        tag: 'rally-digest',
      });

      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          delivered++;
          // Best-effort: mark last_ok_at (ignore errors)
          sb.from('push_subscriptions')
            .update({ last_ok_at: new Date().toISOString() })
            .eq('endpoint', s.endpoint)
            .eq('user_id', to_user)
            .then(() => {}, () => {});
        } catch (err: any) {
          const status = err?.statusCode || err?.status;
          if (status === 404 || status === 410) {
            dead++;
            await sb.from('push_subscriptions')
              .delete()
              .eq('endpoint', s.endpoint)
              .eq('user_id', to_user);
          }
        }
      }
    }

    summaries.push({ to_user, count, delivered, dead });

    if (!dryRun) {
      await sb
        .from('rallies')
        .update({ pushed: true })
        .in('id', rows.map((r) => r.id));
    }
  }

  return new Response(JSON.stringify({
    dispatched: summaries,
    push_enabled: canPush,
    dry_run: dryRun,
  }), {
    headers: { 'content-type': 'application/json' },
  });
});
