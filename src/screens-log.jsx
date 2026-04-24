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
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
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

  const commit = async () => {
    if (saving) return;
    setSaving(true);
    setSaveErr('');
    const today = todayLocal();
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
        const yStr = localKeyOffset(today, -1);
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

    // Mirror to backend. We await so we can tell the user if the row never
    // landed in public.workouts (guest session, expired token, RLS, offline).
    // Client streak already updated above — this is just about the leaderboard
    // and server truth.
    let backendOk = true;
    try {
      const api = window.api;
      if (!api || !api.enabled) {
        backendOk = false;
        console.warn('[log_workout] api disabled — running in guest/local mode, workout NOT saved to server.');
        setSaveErr('Signed out — saved locally only. Sign in to count on the leaderboard.');
      } else {
        const session = await api.getSession();
        if (!session || !session.user) {
          backendOk = false;
          console.warn('[log_workout] no session — workout NOT saved to server.');
          setSaveErr('Signed out — saved locally only. Sign in to count on the leaderboard.');
        } else {
          const res = await api.logWorkout(reps);
          if (res && res.error) {
            backendOk = false;
            console.error('[log_workout] RPC error:', res.error);
            setSaveErr('Server rejected the log: ' + (res.error.message || 'unknown'));
          } else {
            console.log('[log_workout] saved to server:', res && res.data);
          }
        }
      }
    } catch (e) {
      backendOk = false;
      console.error('[log_workout] threw:', e);
      setSaveErr('Network error — saved locally only. Will not appear on leaderboard.');
    } finally {
      setSaving(false);
    }

    // Still advance to done — local state is already updated.
    // If backend failed, the error banner on Done tells them why they're not on the board.
    try { sessionStorage.setItem('dm:lastLogBackendOk', backendOk ? '1' : '0'); } catch {}
    try { sessionStorage.setItem('dm:lastLogErr', saveErr || ''); } catch {}
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
      <div style={{ padding: '18px 20px 20px', flex: 1 }}>

        <div style={{ marginBottom: 14 }}>
          <BigNum n={total} unit="WORK" color="var(--accent)" size={56} />
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, letterSpacing: 1.5 }}>
            EFFORT · {effortPct}% OF YOUR PR TOTAL
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.5 }}>
            NO COMPARISON TO YESTERDAY. MOVEMENT OVER EGO.
          </div>
          {hadDraft && (
            <div className="mono uppercase" style={{
              marginTop: 10, padding: '8px 10px',
              background: 'var(--streak-dim)', border: '1px solid var(--streak)',
              color: 'var(--streak)', fontSize: 10, letterSpacing: 1.5, lineHeight: 1.5,
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
                  <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)' }}>
                    {ex.name} · {unitLabel}
                    {isPR && <span style={{ color: 'var(--streak)', marginLeft: 6 }}>NEW PR</span>}
                    {isFirst && <span style={{ color: 'var(--streak)', marginLeft: 6 }}>FIRST LOG</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{v.name}</div>
                </div>
                <button
                  onClick={() => resetOne(ex.id)}
                  className="mono uppercase"
                  style={{
                    background: 'transparent', border: '1px solid var(--border-2)',
                    color: 'var(--text-mute)', fontSize: 10, letterSpacing: 1.5,
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
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 8, textAlign: 'right' }}>
                PB {pb}{ex.unit === 'sec' ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '16px 20px 24px', background: 'linear-gradient(to top, #0A0A0A 60%, rgba(10,10,10,0))' }}>
        {saveErr && (
          <div className="mono uppercase" style={{
            marginBottom: 10, padding: '8px 10px',
            background: '#1F0D0D', border: '1px solid #5A1F1F', color: '#FF8E8E',
            fontSize: 10, letterSpacing: 1.5, lineHeight: 1.5,
          }}>
            ⚠ {saveErr}
          </div>
        )}
        <PrimaryBtn onClick={commit}>{saving ? 'SAVING…' : 'LOCK IT IN →'}</PrimaryBtn>
      </div>
    </Shell>
  );
}

const stepBtn = {
  width: 44, height: 44, background: 'var(--bg-2)', border: '1px solid var(--border-2)',
  color: 'var(--text)', fontSize: 22, fontWeight: 700, cursor: 'pointer',
};
const stepBtnSm = { ...stepBtn, width: 40, fontSize: 13, fontFamily: 'JetBrains Mono' };

Object.assign(window, { LogScreen });
