// App root

function App() {
  const [state, setState] = useState(loadState);
  const [screen, setScreen] = useState(() => {
    // Show entrance once per day (or on firstRun)
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

  const go = (s) => setScreen(s);

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
