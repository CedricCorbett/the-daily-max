// App root

function App() {
  const [state, setState] = useState(loadState);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authed' | 'guest' | 'out'
  const [authUser, setAuthUser] = useState(null);
  const [screen, setScreen] = useState(() => {
    try {
      const last = localStorage.getItem('dailymax:entrance');
      const today = new Date().toISOString().split('T')[0];
      return last === today ? 'home' : 'entrance';
    } catch { return 'entrance'; }
  });
  const [draft, setDraft] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => {
    if (screen !== 'entrance') {
      try { localStorage.setItem('dailymax:entrance', new Date().toISOString().split('T')[0]); } catch {}
    }
  }, [screen]);

  // Service worker registration — PWA install + push delivery.
  // Also aggressively checks for updates so the home-screen app refreshes
  // when we deploy: re-check on focus, on visibility, and hourly.
  // When a new SW activates, auto-reload so the user sees the latest build.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });

    navigator.serviceWorker.register('/sw.js').then(reg => {
      const checkForUpdate = () => { reg.update().catch(() => {}); };

      // Check on focus / tab-visible — covers returning to the home-screen app.
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdate();
      });
      // And a slow heartbeat for long-running sessions.
      setInterval(checkForUpdate, 60 * 60 * 1000);

      // When a new SW is installed and the page already has a controller,
      // tell it to activate immediately. controllerchange will reload us.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // A new version is ready — activate now.
            nw.postMessage && nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(err => {
      console.warn('[sw] register failed', err);
    });
  }, []);

  // Auth bootstrap — if Supabase is wired, gate on session; else guest-through.
  useEffect(() => {
    const api = window.api;
    if (!api || !api.enabled) {
      setAuthStatus('guest');
      return;
    }
    let cancelled = false;
    const hydrate = async (user) => {
      setAuthUser(user);
      setState(s => ({ ...s, userId: user.id }));
      setAuthStatus('authed');
      try {
        const res = await api.myClan();
        const row = res && res.data;
        if (row && row.clan) {
          setState(s => ({
            ...s,
            clanId: row.clan.id,
            clanRole: row.role,
            clanIsSystem: !!row.clan.is_system,
          }));
        }
      } catch {}
    };
    api.getSession().then(session => {
      if (cancelled) return;
      if (session && session.user) hydrate(session.user);
      else setAuthStatus('out');
    });
    const unsub = api.onAuthChange((session) => {
      if (session && session.user) hydrate(session.user);
      else {
        setAuthUser(null);
        setAuthStatus('out');
        setState(s => ({ ...s, userId: null, clanId: null, clanRole: null, clanIsSystem: false }));
      }
    });
    return () => { cancelled = true; unsub && unsub(); };
  }, []);

  const go = (s) => setScreen(s);

  const onAuthed = ({ user, guest }) => {
    if (guest) setAuthStatus('guest');
    else {
      setAuthUser(user);
      setAuthStatus('authed');
    }
  };

  // Auth gate — before anything else renders.
  if (authStatus === 'loading') {
    return (
      <Shell bg="var(--bg)">
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-mute)', fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, letterSpacing: 3,
        }}>
          LOADING
        </div>
      </Shell>
    );
  }
  if (authStatus === 'out') {
    return <AuthScreen onAuthed={onAuthed} />;
  }

  let view;
  switch (screen) {
    case 'entrance':    view = <EntranceScreen state={state} setState={setState} go={go} />; break;
    case 'home':        view = <HomeScreen state={state} setState={setState} go={go} openTweaks={() => setTweaksOpen(true)} />; break;
    case 'timer':       view = <TimerScreen state={state} setState={setState} go={go} setDraft={setDraft} />; break;
    case 'log':         view = <LogScreen state={state} setState={setState} draft={draft} go={go} />; break;
    case 'done':        view = <DoneScreen state={state} go={go} />; break;
    case 'share':       view = <MaxCardScreen state={state} go={go} />; break;
    case 'leaderboard': view = <LeaderboardScreen state={state} setState={setState} go={go} />; break;
    case 'draft':       view = <DraftScreen state={state} go={go} />; break;
    case 'night':       view = <NightScreen state={state} go={go} />; break;
    case 'kickoff':     view = <KickoffScreen state={state} go={go} />; break;
    case 'rally':       view = <RallyScreen state={state} setState={setState} go={go} />; break;
    case 'clan':        view = <ClanScreen state={state} setState={setState} go={go} />; break;
    case 'clan-entry':  view = <ClanEntryScreen state={state} setState={setState} go={go} />; break;
    case 'clan-settings': view = <ClanSettingsScreen state={state} setState={setState} go={go} />; break;
    default:            view = <HomeScreen state={state} setState={setState} go={go} openTweaks={() => setTweaksOpen(true)} />;
  }

  return (
    <>
      {view}
      {tweaksOpen && <TweaksPanel state={state} setState={setState} onClose={() => setTweaksOpen(false)} />}
      <ScreenJumper current={screen} go={go} />
    </>
  );
}

// Floating preview-only screen jumper. Lets you hop between screens without re-triggering the daily entrance.
function ScreenJumper({ current, go }) {
  const [open, setOpen] = useState(false);
  const screens = [
    { id: 'entrance',    label: 'ENTRANCE' },
    { id: 'home',        label: 'HOME' },
    { id: 'timer',       label: 'TIMER' },
    { id: 'log',         label: 'LOG' },
    { id: 'done',        label: 'DONE' },
    { id: 'share',       label: 'MAX CARD' },
    { id: 'leaderboard', label: 'LEADER' },
    { id: 'draft',       label: 'DRAFT' },
    { id: 'night',       label: 'NIGHT' },
    { id: 'kickoff',     label: 'KICKOFF' },
    { id: 'rally',       label: 'RALLY' },
    { id: 'clan',        label: 'CLAN' },
    { id: 'clan-entry',  label: 'CREW ENTRY' },
    { id: 'clan-settings', label: 'CREW SET' },
  ];
  return (
    <div style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 50, fontFamily: 'JetBrains Mono, monospace' }}>
      {open && (
        <div style={{
          position: 'absolute', right: 0, bottom: 48,
          background: '#0A0707', border: '1px solid #8B1A1A',
          padding: 10, width: 210,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: '#C9A24A', marginBottom: 8, textTransform: 'uppercase' }}>Jump to screen</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {screens.map(s => (
              <button key={s.id} onClick={() => { go(s.id); setOpen(false); }} style={{
                padding: '6px 8px',
                background: current === s.id ? '#8B1A1A' : '#150D0D',
                border: `1px solid ${current === s.id ? '#B32121' : '#2A1B1B'}`,
                color: current === s.id ? '#F2ECE2' : '#8F857A',
                fontFamily: 'inherit', fontSize: 9, letterSpacing: 1.2,
                textAlign: 'left', cursor: 'pointer', textTransform: 'uppercase',
              }}>{s.label}</button>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => setOpen(v => !v)} style={{
        padding: '8px 12px',
        background: open ? '#8B1A1A' : '#0A0707',
        border: '1px solid #8B1A1A',
        color: '#F2ECE2',
        fontFamily: 'inherit', fontSize: 10, letterSpacing: 2, fontWeight: 700,
        cursor: 'pointer', textTransform: 'uppercase',
        boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
      }}>◇ SCREENS</button>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
