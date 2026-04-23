// Push-subscription helper + soft-prompt component.
// Flow:
//   1. User taps "Turn on crew nudges" (soft prompt) — protects the native one-shot ask.
//   2. We call Notification.requestPermission().
//   3. On granted, subscribe via the active SW registration using window.VAPID_PUBLIC_KEY.
//   4. POST subscription keys to public.subscribe_push RPC.
//   5. Persist a flag so we don't nag again.

const PUSH_FLAG_KEY = 'dailymax:push_status'; // 'granted' | 'denied' | 'dismissed' | 'unsupported'

function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function supportsPush() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function subscribeToPush() {
  if (!supportsPush()) return { ok: false, reason: 'unsupported' };
  const vapid = window.VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: 'no-vapid-key' };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    });
  }
  const json = sub.toJSON();
  const api = window.api;
  if (api && api.enabled) {
    const res = await api.subscribePush({
      endpoint: sub.endpoint,
      p256dh: json.keys && json.keys.p256dh,
      auth:   json.keys && json.keys.auth,
      ua:     navigator.userAgent,
    });
    if (res && res.error) return { ok: false, reason: 'server-error', error: res.error };
  }
  return { ok: true, subscription: sub };
}

async function requestAndSubscribe() {
  if (!supportsPush()) {
    localStorage.setItem(PUSH_FLAG_KEY, 'unsupported');
    return { ok: false, reason: 'unsupported' };
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    localStorage.setItem(PUSH_FLAG_KEY, perm);
    return { ok: false, reason: 'denied' };
  }
  const res = await subscribeToPush();
  if (res.ok) localStorage.setItem(PUSH_FLAG_KEY, 'granted');
  return res;
}

// Soft prompt banner — render anywhere. Self-dismissing, one-shot per browser.
function PushSoftPrompt({ onResolved, tone = 'inline' }) {
  const [status, setStatus] = useState(() => {
    try { return localStorage.getItem(PUSH_FLAG_KEY) || null; } catch { return null; }
  });
  const [busy, setBusy] = useState(false);

  if (!supportsPush()) return null;
  if (status === 'granted' || status === 'denied' || status === 'dismissed' || status === 'unsupported') return null;
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') return null;

  const dismiss = () => {
    localStorage.setItem(PUSH_FLAG_KEY, 'dismissed');
    setStatus('dismissed');
    onResolved && onResolved('dismissed');
  };

  const confirm = async () => {
    setBusy(true);
    const res = await requestAndSubscribe();
    setBusy(false);
    setStatus(res.ok ? 'granted' : 'denied');
    onResolved && onResolved(res.ok ? 'granted' : 'denied');
  };

  return (
    <div style={{
      margin: tone === 'inline' ? '0 0 14px' : 14,
      padding: 14,
      background: '#150D0D',
      border: '1px solid var(--accent, #8B1A1A)',
    }}>
      <div className="mono uppercase" style={{
        fontSize: 10, letterSpacing: 3, color: 'var(--gold, #C9A24A)', marginBottom: 6,
      }}>
        CREW NUDGES
      </div>
      <div style={{ fontSize: 13, color: 'var(--text, #F2ECE2)', lineHeight: 1.45, marginBottom: 10 }}>
        Get a single nudge when the crew needs you — missed days, rallies, nothing else.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={confirm}
          disabled={busy}
          className="mono uppercase"
          style={{
            flex: 1, padding: '10px 12px',
            background: 'var(--accent, #8B1A1A)',
            border: '1px solid var(--accent, #8B1A1A)',
            color: '#F2ECE2',
            fontSize: 11, letterSpacing: 2, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '...' : 'TURN ON'}
        </button>
        <button
          onClick={dismiss}
          className="mono uppercase"
          style={{
            padding: '10px 12px',
            background: 'transparent',
            border: '1px solid var(--border, #2A1B1B)',
            color: 'var(--text-mute, #8F857A)',
            fontSize: 11, letterSpacing: 2,
            cursor: 'pointer',
          }}
        >
          LATER
        </button>
      </div>
    </div>
  );
}

window.PushSoftPrompt = PushSoftPrompt;
window.requestAndSubscribe = requestAndSubscribe;
window.supportsPush = supportsPush;
