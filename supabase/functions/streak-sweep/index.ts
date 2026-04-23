// Nightly streak sweep. For every user whose last_day is >= 2 days ago, either
// consume insurance or list them on the rally board. Invoked by Cloudflare cron.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const today = new Date();
  const cutoff = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: stale, error } = await sb
    .from('streaks')
    .select('user_id, current_len, last_day, insurance')
    .lt('last_day', cutoff)
    .gt('current_len', 0);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const listed: string[] = [];
  const insured: string[] = [];

  for (const s of stale ?? []) {
    if (s.insurance > 0) {
      await sb
        .from('streaks')
        .update({ insurance: s.insurance - 1, last_day: cutoff })
        .eq('user_id', s.user_id);
      insured.push(s.user_id);
    } else {
      await sb
        .from('streaks')
        .update({ current_len: 0 })
        .eq('user_id', s.user_id);
      await sb.from('rally_board').upsert({
        user_id: s.user_id,
        days_off: 1,
        streak_lost: s.current_len,
      });
      listed.push(s.user_id);
    }
  }

  return new Response(JSON.stringify({ listed, insured }), {
    headers: { 'content-type': 'application/json' },
  });
});
