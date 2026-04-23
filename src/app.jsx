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

  // Anchor the 14-day cycle on first app open. Once set, it never moves —
  // the bar walks forward 14 days at a time from this date.
  useEffect(() => {
    if (state.cycleStart) return;
    const todayISO = new Date().toISOString().split('T')[0];
    setState(s => s.cycleStart ? s : { ...s, cycleStart: todayISO });
  }, [state.cycleStart]);
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
            clanName: row.clan.name || null,
            clanTag: row.clan.tag || null,
            clanRole: row.role,
            clanIsSystem: !!row.clan.is_system,
          }));
        }
      } catch {}
      // Pull server PBs + streak into local state so a returning user on a
      // new device sees their real personal records, not the zero defaults.
      try {
        const pbRes = await api.client.from('pbs')
          .select('pushups, squats, hollow_sec, pullups')
          .eq('user_id', user.id)
          .maybeSingle();
        const pb = pbRes && pbRes.data;
        if (pb) {
          setState(s => ({
            ...s,
            bests: {
              pushups: Math.max(s.bests?.pushups || 0, pb.pushups    || 0),
              squats:  Math.max(s.bests?.squats  || 0, pb.squats     || 0),
              hollow:  Math.max(s.bests?.hollow  || 0, pb.hollow_sec || 0),
              pullups: Math.max(s.bests?.pullups || 0, pb.pullups    || 0),
            },
          }));
        }
      } catch {}
      // Pull every workout row so history, lifetime totals, and the streak
      // dots light up on a fresh device. Without this, the home calendar
      // looks empty even though the server knows every day.
      try {
        const wRes = await api.client.from('workouts')
          .select('day, pushups, squats, hollow_sec, pullups')
          .eq('user_id', user.id)
          .order('day', { ascending: true });
        const rows = (wRes && wRes.data) || [];
        if (rows.length) {
          const server = rows.map(r => ({
            date:    r.day,
            pushups: r.pushups    || 0,
            squats:  r.squats     || 0,
            hollow:  r.hollow_sec || 0,
            pullups: r.pullups    || 0,
          }));
          setState(s => {
            // Merge: server wins on overlap (greatest), local-only days kept.
            const byDate = new Map();
            (s.history || []).forEach(h => { if (h && h.date) byDate.set(h.date, { ...h }); });
            server.forEach(srv => {
              const cur = byDate.get(srv.date) || {};
              byDate.set(srv.date, {
                date:    srv.date,
                pushups: Math.max(cur.pushups || 0, srv.pushups),
                squats:  Math.max(cur.squats  || 0, srv.squats),
                hollow:  Math.max(cur.hollow  || 0, srv.hollow),
                pullups: Math.max(cur.pullups || 0, srv.pullups),
              });
            });
            const history = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
            const life = history.reduce((acc, h) => ({
              pushups: acc.pushups + (h.pushups || 0),
              squats:  acc.squats  + (h.squats  || 0),
              hollow:  acc.hollow  + (h.hollow  || 0),
              pullups: acc.pullups + (h.pullups || 0),
            }), { pushups: 0, squats: 0, hollow: 0, pullups: 0 });
            const totalReps = life.pushups + life.squats + life.hollow + life.pullups;
            // If the most-recent server day is today, hydrate state.today too
            // so the "LOGGED ✓" pill shows and the HOME streak dot fills.
            const todayISO = new Date().toISOString().split('T')[0];
            const todayRow = history.find(h => h.date === todayISO) || null;
            return {
              ...s,
              history,
              lifetimeBreakdown: life,
              totalReps,
              totalDays: Math.max(s.totalDays || 0, history.length),
              today: todayRow || s.today,
            };
          });
        }
      } catch {}
      try {
        const stRes = await api.client.from('streaks')
          .select('current_len, longest_len, last_day')
          .eq('user_id', user.id)
          .maybeSingle();
        const st = stRes && stRes.data;
        if (st) {
          setState(s => ({
            ...s,
            streak:         Math.max(s.streak     || 0, st.current_len || 0),
            bestStreak:     Math.max(s.bestStreak || 0, st.longest_len || 0),
            lastLoggedDate: st.last_day || s.lastLoggedDate,
          }));
        }
      } catch {}
      // Pull saved profile prefs so voice/aesthetic/slot follow the user.
      try {
        const prof = await api.myProfile();
        const p = prof && prof.data;
        if (p) {
          setState(s => ({
            ...s,
            // Prefer the server's display_name so "Hello X" is personal even
            // after the user clears storage or opens on a new device.
            name:      p.display_name || s.name,
            username:  p.username     || s.username,
            voice:     p.voice        || s.voice,
            aesthetic: p.aesthetic    || s.aesthetic,
            slot:      p.slot         || s.slot,
            partner:   p.partner      || s.partner,
            city:      p.city         || s.city,
          }));
          if (p.aesthetic) {
            const map = { oxblood: '#8B1A1A', gold: '#C9A24A', crimson: '#B32121', graphite: '#6B6159' };
            const hex = map[p.aesthetic];
            if (hex) {
              document.documentElement.style.setProperty('--accent', hex);
              document.documentElement.style.setProperty('--accent-dim', hex + '22');
            }
          }
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

  // Sync profile preferences (voice/aesthetic/slot/partner/city) to server
  // whenever they change locally. Debounced so rapid toggles don't flood the
  // RPC. Only fires when signed in — guests stay local-only.
  useEffect(() => {
    if (authStatus !== 'authed') return;
    const api = window.api;
    if (!api || !api.enabled) return;
    const t = setTimeout(() => {
      const patch = {
        voice:     state.voice     || null,
        aesthetic: state.aesthetic || null,
        slot:      state.slot      || null,
        partner:   state.partner   || null,
        city:      state.city      || null,
      };
      try { api.upsertProfile(patch).catch(() => {}); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [authStatus, state.voice, state.aesthetic, state.slot, state.partner, state.city]);

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
    case 'log':         view = <LogScreen state={state} setState={setState} draft={draft} setDraft={setDraft} go={go} />; break;
    case 'done':        view = <DoneScreen state={state} go={go} />; break;
    case 'share':       view = <MaxCardScreen state={state} go={go} />; break;
    case 'leaderboard': view = <LeaderboardScreen state={state} setState={setState} go={go} />; break;
    case 'calendar':    view = <CalendarScreen state={state} go={go} />; break;
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
      <UpdateBanner />
      <ScreenJumper current={screen} go={go} />
    </>
  );
}

// Polls /version.txt for a build newer than window.APP_BUILD. When a new
// version lands, shows a top banner the user can tap to wipe caches and reload.
// Triggers: mount, window focus, visibilitychange, and a 60s heartbeat.
function UpdateBanner() {
  const [latest, setLatest] = useState(null);
  const current = (typeof window !== 'undefined' && window.APP_BUILD) || '';

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/version.txt?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const txt = (await res.text()).trim();
        if (alive && txt) setLatest(txt);
      } catch {}
    };
    check();
    const onFocus = () => check();
    const onVis = () => { if (!document.hidden) check(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(check, 60 * 1000);
    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, []);

  const stale = latest && current && latest !== current;
  if (!stale) return null;

  const hardReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch {}
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {}
    location.reload();
  };

  return (
    <button onClick={hardReload} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
      padding: '10px 14px',
      background: '#C9A24A', color: '#0A0707',
      border: 'none', borderBottom: '2px solid #0A0707',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11, letterSpacing: 2.2, fontWeight: 800,
      textTransform: 'uppercase', textAlign: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    }}>
      ◇ NEW VERSION · TAP TO RELOAD
    </button>
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
    { id: 'calendar',    label: 'CALENDAR' },
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
