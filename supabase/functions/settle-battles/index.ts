// Settle finished clan battles. Invoked by Cloudflare cron.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: ended, error } = await sb
    .from('clan_battles')
    .select('id')
    .is('winner_id', null)
    .lt('ends_at', new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const settled: string[] = [];
  for (const b of ended ?? []) {
    const { error: sErr } = await sb.rpc('settle_battle', { p_battle_id: b.id });
    if (!sErr) settled.push(b.id);
  }

  return new Response(JSON.stringify({ settled }), {
    headers: { 'content-type': 'application/json' },
  });
});
