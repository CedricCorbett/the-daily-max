// Rally fan-out. Runs on a cron (6am local). Collects un-pushed rallies per recipient
// and fires one combined nudge (push provider wired by caller — this just aggregates
// and marks them pushed so the client doesn't double-notify).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface FanoutPayload {
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!url || !key) {
    return new Response('missing env', { status: 500 });
  }

  const body: FanoutPayload = req.method === 'POST'
    ? await req.json().catch(() => ({}))
    : {};
  const dryRun = body.dry_run ?? false;

  const sb = createClient(url, key, { auth: { persistSession: false } });

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

  const summaries: Array<{ to_user: string; count: number }> = [];
  for (const [to_user, rows] of byRecipient) {
    summaries.push({ to_user, count: rows.length });
    // TODO: send push to to_user via APNs/FCM (one nudge with rows.length rallies)
    if (!dryRun) {
      await sb
        .from('rallies')
        .update({ pushed: true })
        .in('id', rows.map((r) => r.id));
    }
  }

  return new Response(JSON.stringify({ dispatched: summaries, dry_run: dryRun }), {
    headers: { 'content-type': 'application/json' },
  });
});
