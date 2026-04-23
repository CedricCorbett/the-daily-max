// LOG screen — enter today's count per station. No shame. Effort, not comparison.
//
// Inputs are directly editable: tap the big number, type the final count.
// The +/- buttons are there for tweaking, not the only path. This also kills
// the class of bugs where taps during the Timer pre-seeded the draft and a user
// who thought they were starting at 0 silently added on top of 6 (→ 15 became 21).

function LogScreen({ state, setState, draft, setDraft, go }) {
  const prefill = {
    pushups: draft?.pushups ?? 0,
    squats:  draft?.squats  ?? 0,
    hollow:  draft?.hollow  ?? 0,
    pullups: draft?.pullups ?? 0,
  };
  const [reps, setReps] = useState(prefill);
  const hadDraft = !!(draft && (draft.pushups || draft.squats || draft.hollow || draft.pullups));

  // Consume the draft after seeding — if the user comes back to this screen later
  // (or aborts and retries), we don't want stale tap counts piling on.
  useEffect(() => { if (setDraft) setDraft(null); }, []);

  const total = reps.pushups + reps.squats + reps.hollow + reps.pullups;
  const prT = prSum(state.bests);
  const effortPct = prT > 0 ? Math.min(100, Math.round((total / prT) * 100)) : 0;

  const adjust = (k, d) => setReps(r => ({ ...r, [k]: Math.max(0, (Number(r[k]) || 0) + d) }));
  const setOne = (k, v) => setReps(r => ({ ...r, [k]: Math.max(0, Math.min(9999, Number(v) || 0)) }));
  const resetOne = (k) => setReps(r => ({ ...r, [k]: 0 }));

  const commit = () => {
    const today = new Date().toISOString().split('T')[0];
    const entry = { date: today, ...reps, mode: state.mode, modifier: state.modifier };
    setState(s => {
      const newBests = { ...s.bests };
      Object.keys(reps).forEach(k => { if (reps[k] > newBests[k]) newBests[k] = reps[k]; });
      const newLifetime = { ...s.lifetimeBreakdown };
      Object.keys(reps).forEach(k => { newLifetime[k] = (newLifetime[k] || 0) + reps[k]; });

      // STREAK LOGIC
      // - same day → leave streak alone (user re-logged)
      // - yesterday → +1
      // - gap → reset to 1 (today still counts)
      let streak = s.streak || 0;
      const prev = s.lastLoggedDate;
      if (prev === today) {
        // already logged today — no double-count on streak / totalDays
        streak = streak;
      } else {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (prev === yStr) streak = streak + 1;
        else streak = 1;
      }
      const bestStreak = Math.max(s.bestStreak || 0, streak);
      const totalDays = prev === today ? (s.totalDays || 0) : ((s.totalDays || 0) + 1);
      const history = (() => {
        const h = Array.isArray(s.history) ? [...s.history] : [];
        const idx = h.findIndex(e => e && e.date === today);
        if (idx >= 0) h[idx] = entry; else h.push(entry);
        return h;
      })();

      return {
        ...s,
        today: entry,
        bests: newBests,
        lifetimeBreakdown: newLifetime,
        totalReps: s.totalReps + total,
        streak,
        bestStreak,
        totalDays,
        lastLoggedDate: today,
        history,
        // Any break they were on ends the moment they log — clear the rally flag.
        onRally: false,
        breakReasonLogged: false,
      };
    });

    // Mirror to backend (fire-and-forget — client state already updated).
    try {
      if (window.api && window.api.enabled && window.api.logWorkout) {
        window.api.logWorkout(reps);
      }
    } catch {}

    go('done');
  };

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title="LOG THE DAY"
        sub="WHATEVER YOU HAD TODAY"
      />
      <HazardBar height={4} />
      <div style={{ padding: '18px 20px 120px', flex: 1 }}>

        <div style={{ marginBottom: 14 }}>
          <BigNum n={total} unit="WORK" color="var(--accent)" size={56} />
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, letterSpacing: 1.5 }}>
            EFFORT · {effortPct}% OF YOUR PR TOTAL
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.5 }}>
            NO COMPARISON TO YESTERDAY. MOVEMENT OVER EGO.
          </div>
          {hadDraft && (
            <div className="mono uppercase" style={{
              marginTop: 10, padding: '8px 10px',
              background: 'var(--streak-dim)', border: '1px solid var(--streak)',
              color: 'var(--streak)', fontSize: 9, letterSpacing: 1.5, lineHeight: 1.5,
            }}>
              ◇ PREFILLED FROM TIMER TAPS · TAP A NUMBER TO TYPE THE FINAL COUNT.
            </div>
          )}
        </div>

        {CORE_EXERCISES.map(ex => {
          const v = VARIANTS[ex.id][state.modifier !== 'none' ? state.modifier : state.mode];
          const pb = state.bests[ex.id];
          const isPR = reps[ex.id] > pb && pb > 0;
          const isFirst = pb === 0 && reps[ex.id] > 0;
          const unitLabel = ex.unit === 'sec' ? 'SEC HELD' : 'REPS';
          return (
            <div key={ex.id} style={{
              background: 'var(--card)', border: `1px solid ${isPR ? 'var(--streak)' : 'var(--border)'}`,
              padding: '14px 16px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)' }}>
                    {ex.name} · {unitLabel}
                    {isPR && <span style={{ color: 'var(--streak)', marginLeft: 6 }}>NEW PR</span>}
                    {isFirst && <span style={{ color: 'var(--streak)', marginLeft: 6 }}>FIRST LOG</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v.name}</div>
                </div>
                <button
                  onClick={() => resetOne(ex.id)}
                  className="mono uppercase"
                  style={{
                    background: 'transparent', border: '1px solid var(--border-2)',
                    color: 'var(--text-mute)', fontSize: 9, letterSpacing: 1.5,
                    padding: '4px 8px', cursor: 'pointer',
                  }}
                >
                  RESET
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => adjust(ex.id, -1)} style={stepBtn}>−</button>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={reps[ex.id]}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setOne(ex.id, e.target.value.replace(/\D/g, ''))}
                    className="display"
                    style={{
                      width: '100%', maxWidth: 160,
                      background: 'transparent', border: 'none', outline: 'none',
                      color: isPR ? 'var(--streak)' : 'var(--text)',
                      fontSize: 46, lineHeight: 1,
                      textAlign: 'center', letterSpacing: '-0.02em',
                      padding: 0, margin: 0,
                      caretColor: 'var(--accent)',
                    }}
                  />
                </div>
                <button onClick={() => adjust(ex.id, 1)} style={stepBtn}>+</button>
                <button onClick={() => adjust(ex.id, 5)} style={stepBtnSm}>+5</button>
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 8, textAlign: 'right' }}>
                PB {pb}{ex.unit === 'sec' ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 24px', background: 'linear-gradient(to top, #0A0A0A 60%, rgba(10,10,10,0))' }}>
        <PrimaryBtn onClick={commit}>LOCK IT IN →</PrimaryBtn>
      </div>
    </Shell>
  );
}

const stepBtn = {
  width: 44, height: 44, background: 'var(--bg-2)', border: '1px solid var(--border-2)',
  color: 'var(--text)', fontSize: 22, fontWeight: 700, cursor: 'pointer',
};
const stepBtnSm = { ...stepBtn, width: 40, fontSize: 12, fontFamily: 'JetBrains Mono' };

Object.assign(window, { LogScreen });
