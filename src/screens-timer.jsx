// TIMER screen — 15s warmup countdown, then 4 stations + rest interludes (manual advance).
// Only the hollow hold is timed (counts up). All other stations are static —
// do your reps at your own pace, tap NEXT when ready. Rest interludes are also manual.

const WARMUP_SECONDS = 15;

function buildSequence() {
  const seq = [{ type: 'warmup', duration: WARMUP_SECONDS }];
  CORE_EXERCISES.forEach((ex, i) => {
    seq.push({ type: 'station', exercise: ex, idx: i });
    if (i < CORE_EXERCISES.length - 1) seq.push({ type: 'rest', nextIdx: i + 1 });
  });
  return seq;
}
const SEQUENCE = buildSequence();

function fmt(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function TimerScreen({ state, go, setState, setDraft }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);     // seconds in current step (drives warmup countdown + hollow count-up)
  const [totalElapsed, setTotalElapsed] = useState(0); // total time on session (count-up, shown in top bar)
  const [running, setRunning] = useState(false);
  const [coffeeSync, setCoffeeSync] = useState(false);
  const [taps, setTaps] = useState({ pushups: 0, squats: 0, hollow: 0, pullups: 0 });
  const [holding, setHolding] = useState(true); // for hollow station: true until user drops
  const [howOpen, setHowOpen] = useState(false);
  const ref = useRef(null);

  const step = SEQUENCE[stepIdx];
  const remaining = step.duration ? step.duration - elapsed : 0;
  const pct = step.duration ? elapsed / step.duration : 0;
  const isLast = stepIdx + 1 >= SEQUENCE.length;

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setElapsed(e => e + 1);
      setTotalElapsed(t => t + 1);
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  // Auto-advance ONLY the warmup countdown. Stations and rests advance manually.
  useEffect(() => {
    if (step.type === 'warmup' && step.duration && elapsed >= step.duration) {
      setStepIdx(i => i + 1);
      setElapsed(0);
    }
  }, [elapsed, step.type, step.duration]);

  const advance = () => {
    if (isLast) {
      setRunning(false);
      setDraft(taps);
      setTimeout(() => go('log'), 200);
    } else {
      setStepIdx(i => i + 1);
      setElapsed(0);
    }
  };

  const currentStation = step.type === 'station' ? step : (step.type === 'rest' ? SEQUENCE[stepIdx + 1] : (step.type === 'warmup' ? SEQUENCE[1] : null));
  const currentExercise = currentStation?.exercise;
  const variant = currentExercise ? VARIANTS[currentExercise.id][state.modifier !== 'none' ? state.modifier : state.mode] : null;

  const label = step.type === 'warmup' ? 'GET READY' : step.type === 'rest' ? 'TRANSITION' : 'MAX REPS';
  const labelColor = step.type === 'station' ? 'var(--accent)' : 'var(--streak)';

  // tap to increment current station (reps stations)
  const tapRep = () => {
    if (step.type !== 'station') return;
    const id = step.exercise.id;
    if (step.exercise.unit === 'sec') return; // hollow uses hold toggle instead
    setTaps(t => ({ ...t, [id]: t[id] + 1 }));
  };

  // Hollow station: accumulate elapsed seconds while "holding" is true.
  // Tap DROP to stop counting for this set. Reset holding at step change.
  useEffect(() => {
    setHolding(true);
  }, [stepIdx]);
  useEffect(() => {
    if (!running) return;
    if (step.type !== 'station') return;
    if (step.exercise.unit !== 'sec') return;
    if (!holding) return;
    setTaps(t => ({ ...t, hollow: t.hollow + 1 }));
  }, [elapsed]);

  const stationNum = step.type === 'station' ? step.idx + 1 : (step.type === 'rest' ? step.nextIdx + 1 : 1);

  // pre-start coffee-sync screen
  if (!running && elapsed === 0 && stepIdx === 0) {
    return (
      <Shell>
        <TopBar
          left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
          title="READY"
          right={<span />}
        />
        <HazardBar height={4} />
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginTop: 12 }}>
            <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-mute)' }}>FOUR STATIONS · SIX-MINUTE GUIDE</div>
            <div className="display" style={{ fontSize: 44, lineHeight: 1, marginTop: 8, color: 'var(--text)' }}>ALL YOU'VE<br/>GOT TODAY.</div>
          </div>

          <div style={{ marginTop: 24, background: 'var(--card)', border: '1px solid var(--border)' }}>
            {CORE_EXERCISES.map((ex, i) => {
              const v = VARIANTS[ex.id][state.modifier !== 'none' ? state.modifier : state.mode];
              return (
                <div key={ex.id} style={{ padding: '14px 16px', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="display" style={{
                    width: 36, height: 36, background: 'var(--accent)', color: '#0A0A0A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{v.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 1 }}>STATION · THEN TRANSITION</div>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>PB {state.bests[ex.id]}</div>
                </div>
              );
            })}
          </div>

          <button onClick={() => setCoffeeSync(c => !c)} className="mono uppercase" style={{
            marginTop: 16, padding: '10px 12px',
            background: coffeeSync ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${coffeeSync ? 'var(--accent)' : 'var(--border-2)'}`,
            color: coffeeSync ? 'var(--accent)' : 'var(--text-dim)',
            fontSize: 11, letterSpacing: 2,
          }}>
            ☕ COFFEE CLOCK {coffeeSync ? 'SYNCED' : 'OFF'} · start when espresso pulls
          </button>

          <button onClick={() => setHowOpen(true)} className="mono uppercase" style={{
            marginTop: 8, padding: '10px 12px',
            background: 'transparent',
            border: '1px dashed var(--border-2)',
            color: 'var(--text-mute)',
            fontSize: 11, letterSpacing: 2.5,
            cursor: 'pointer',
          }}>
            ◇ HOW TO DO THE DAILY MAX
          </button>

          <div style={{ flex: 1 }} />
          <PrimaryBtn onClick={() => setRunning(true)}>GO →</PrimaryBtn>
        </div>
        {howOpen && <HowToModal onClose={() => setHowOpen(false)} />}
      </Shell>
    );
  }

  return (
    <Shell bg="var(--bg)">
      <TopBar
        left={<IconBtn onClick={() => { if (confirm('Abort the set?')) go('home'); }}>×</IconBtn>}
        title={label}
        sub={`STATION ${stationNum}/4 · ${fmt(totalElapsed)}`}
        right={<IconBtn onClick={() => setRunning(r => !r)}>{running ? '❚❚' : '▶'}</IconBtn>}
      />
      <HazardBar height={4} />

      {/* Step progress row */}
      <div style={{ display: 'flex', gap: 3, padding: '8px 20px' }}>
        {CORE_EXERCISES.map((ex, i) => {
          const isCurrent = step.type === 'station' && step.idx === i;
          const isDone = step.type === 'station' ? step.idx > i : (step.type === 'rest' ? step.nextIdx > i : false);
          return (
            <div key={i} style={{ flex: 1, height: 4, background: isDone ? 'var(--streak)' : isCurrent ? 'var(--accent)' : 'var(--border-2)' }} />
          );
        })}
      </div>

      {/* Big number area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
        {(step.type === 'warmup' || (step.type === 'station' && step.exercise.unit === 'sec')) && (
          <div className="mono uppercase" style={{ fontSize: 12, letterSpacing: 3, color: labelColor, marginBottom: 4 }}>
            {step.type === 'warmup' ? 'GET IN POSITION' : variant?.name}
          </div>
        )}
        {step.type === 'station' && step.exercise.unit === 'sec' && (
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-mute)', marginBottom: 18 }}>
            {variant.swap} · target {variant.target}+
          </div>
        )}

        {/* Warmup: 15s countdown */}
        {step.type === 'warmup' && (
          <>
            <div className="display" style={{
              fontSize: 140, lineHeight: 0.85, letterSpacing: '-0.06em',
              color: remaining <= 3 ? 'var(--accent)' : 'var(--text)',
              animation: remaining <= 3 ? 'flash 0.5s infinite' : 'none',
            }}>
              {remaining}
            </div>
            <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-mute)', marginTop: 6 }}>
              SECONDS
            </div>
            <div style={{ width: '80%', height: 2, background: 'var(--card-2)', marginTop: 26 }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: labelColor, transition: 'width 1s linear' }} />
            </div>
            <div style={{ marginTop: 28, fontSize: 15, color: 'var(--text-dim)', maxWidth: 280 }}>
              Shake out. Three deep breaths. The first station is <strong style={{ color: 'var(--accent)' }}>{VARIANTS.pushups[state.modifier !== 'none' ? state.modifier : state.mode].name}</strong>.
            </div>
          </>
        )}

        {/* Hollow station: count UP — the only timer */}
        {step.type === 'station' && step.exercise.unit === 'sec' && (
          <>
            <div className="display" style={{
              fontSize: 140, lineHeight: 0.85, letterSpacing: '-0.06em',
              color: holding ? 'var(--accent)' : 'var(--text)',
              animation: holding ? 'flash 1.4s infinite' : 'none',
            }}>
              {taps.hollow}
            </div>
            <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-mute)', marginTop: 6 }}>
              SECONDS HELD
            </div>
            <div style={{ marginTop: 30, width: '100%' }}>
              <button onClick={() => setHolding(h => !h)} style={{
                width: '100%', padding: '26px 0',
                background: holding ? 'var(--accent-dim)' : 'var(--card)',
                border: `2px solid ${holding ? 'var(--accent)' : 'var(--border-2)'}`,
                color: holding ? 'var(--accent)' : 'var(--text-mute)',
                fontFamily: 'Archivo Black', fontSize: 20, letterSpacing: 3,
                cursor: 'pointer', animation: holding ? 'pulse-hazard 1.8s infinite' : 'none',
              }}>
                {holding ? `HOLDING · ${taps.hollow}s` : `DROPPED · ${taps.hollow}s`}
              </button>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 6, textAlign: 'center' }}>
                tap when you drop — seconds lock at that moment
              </div>
              <button onClick={advance} className="mono uppercase" style={{
                marginTop: 14, width: '100%', padding: '14px 0',
                background: 'transparent', border: '1px solid var(--border-2)',
                color: 'var(--text-dim)', fontSize: 12, letterSpacing: 2.5, cursor: 'pointer',
              }}>
                {isLast ? 'FINISH →' : 'NEXT STATION →'}
              </button>
            </div>
          </>
        )}

        {/* Rep stations: static workout card, no timer */}
        {step.type === 'station' && step.exercise.unit !== 'sec' && (
          <>
            <div style={{ marginTop: 8, width: '100%', background: 'var(--card)', border: '1px solid var(--border)', padding: 16 }}>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)' }}>WORKOUT</div>
              <div className="display" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 6, color: 'var(--text)' }}>
                {variant.name}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                {variant.swap}
              </div>
              <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--streak)', marginTop: 10 }}>
                TARGET · {variant.target}+ REPS
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 10 }}>
                Go at your own pace. Rest as needed. Tap NEXT when ready.
              </div>
            </div>
            <div style={{ marginTop: 16, width: '100%' }}>
              <button onClick={tapRep} style={{
                width: '100%', padding: '26px 0', background: 'var(--accent-dim)',
                border: '2px solid var(--accent)', color: 'var(--accent)',
                fontFamily: 'Archivo Black', fontSize: 20, letterSpacing: 3,
                cursor: 'pointer', animation: 'pulse-hazard 1.8s infinite',
              }}>
                TAP EACH REP · {taps[step.exercise.id]}
              </button>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 6, textAlign: 'center' }}>
                or just go, log the count after
              </div>
              <button onClick={advance} className="mono uppercase" style={{
                marginTop: 14, width: '100%', padding: '16px 0',
                background: 'var(--streak)', border: '2px solid var(--streak)',
                color: '#0A0A0A', fontFamily: 'Archivo Black', fontSize: 14, letterSpacing: 3,
                cursor: 'pointer',
              }}>
                {isLast ? 'FINISH →' : 'NEXT STATION →'}
              </button>
            </div>
          </>
        )}

        {/* Rest: static — next station preview, manual continue */}
        {step.type === 'rest' && (
          <>
            <div className="display" style={{ fontSize: 56, lineHeight: 1, color: 'var(--streak)', marginTop: 8 }}>
              REST
            </div>
            <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-mute)', marginTop: 8 }}>
              CATCH YOUR BREATH
            </div>
            <div style={{ marginTop: 24, width: '100%', background: 'var(--card)', border: '1px solid var(--border)', padding: 16 }}>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)' }}>NEXT STATION</div>
              <div className="display" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 6, color: 'var(--text)' }}>
                {VARIANTS[SEQUENCE[stepIdx + 1].exercise.id][state.modifier !== 'none' ? state.modifier : state.mode].name}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                {VARIANTS[SEQUENCE[stepIdx + 1].exercise.id][state.modifier !== 'none' ? state.modifier : state.mode].swap}
              </div>
              <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--streak)', marginTop: 10 }}>
                TARGET · {VARIANTS[SEQUENCE[stepIdx + 1].exercise.id][state.modifier !== 'none' ? state.modifier : state.mode].target}+ {SEQUENCE[stepIdx + 1].exercise.unit === 'sec' ? 'SECONDS' : 'REPS'}
              </div>
            </div>
            <button onClick={advance} className="mono uppercase" style={{
              marginTop: 18, width: '100%', padding: '20px 0',
              background: 'var(--accent-dim)', border: '2px solid var(--accent)',
              color: 'var(--accent)', fontFamily: 'Archivo Black', fontSize: 16, letterSpacing: 3,
              cursor: 'pointer',
            }}>
              CONTINUE →
            </button>
          </>
        )}
      </div>
    </Shell>
  );
}

Object.assign(window, { TimerScreen, fmt });
