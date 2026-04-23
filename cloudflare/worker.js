// Cloudflare Worker — schedules edge-function invocations on the Supabase project.
// Cron triggers live in wrangler.toml. Each fires a POST to the matching Supabase fn.

const FN_RALLY   = 'rally-fanout';
const FN_SETTLE  = 'settle-battles';
const FN_STREAK  = 'streak-sweep';

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function invoke(env, fn, body = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return { fn, status: res.status, text: await res.text() };
}

export default {
  async scheduled(event, env, ctx) {
    const cron = event.cron;
    let fn = null;
    if (cron === '0 10 * * *')       fn = FN_RALLY;
    else if (cron === '5 4 * * *')   fn = FN_STREAK;
    else if (cron === '*/15 * * * *') fn = FN_SETTLE;
    if (!fn) return;
    ctx.waitUntil(invoke(env, fn));
  },

  // Manual trigger for testing: GET /run/<fn> with `Authorization: Bearer <CRON_SHARED_SECRET>`
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/run\/([a-z\-]+)$/);
    if (!m) return new Response('ok', { status: 200 });

    const secret = env.CRON_SHARED_SECRET;
    if (!secret) {
      return new Response('server misconfigured (no CRON_SHARED_SECRET)', { status: 500 });
    }
    const auth = req.headers.get('authorization') || '';
    const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!timingSafeEqual(provided, secret)) {
      return new Response('forbidden', { status: 403 });
    }

    const fn = m[1];
    if (![FN_RALLY, FN_SETTLE, FN_STREAK].includes(fn)) {
      return new Response('unknown fn', { status: 404 });
    }
    const out = await invoke(env, fn);
    return new Response(JSON.stringify(out), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
