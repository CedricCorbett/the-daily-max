// LOG screen — enter today's count per station. No shame. Effort, not comparison.

function LogScreen({ state, setState, draft, go }) {
  const [reps, setReps] = useState(() => ({
    pushups: draft?.pushups ?? 0,
    squats:  draft?.squats  ?? 0,
    hollow:  draft?.hollow  ?? 0,
    pullups: draft?.pullups ?? 0,
  }));

  const total = reps.pushups + reps.squats + reps.hollow + reps.pullups;
  const prT = prSum(state.bests);
  const effortPct = prT > 0 ? Math.min(100, Math.round((total / prT) * 100)) : 0;

  const adjust = (k, d) => setReps(r => ({ ...r, [k]: Math.max(0, r[k] + d) }));

  const commit = () => {
    const today = new Date().toISOString().split('T')[0];
    const entry = { date: today, ...reps, mode: state.mode, modifier: state.modifier };
    setState(s => {
      const newBests = { ...s.bests };
      Object.keys(reps).forEach(k => { if (reps[k] > newBests[k]) newBests[k] = reps[k]; });
      const newLifetime = { ...s.lifetimeBreakdown };
      Object.keys(reps).forEach(k => { newLifetime[k] = (newLifetime[k] || 0) + reps[k]; });
      return {
        ...s, today: entry, bests: newBests, lifetimeBreakdown: newLifetime,
        totalReps: s.totalReps + total,
      };
    });
    go('done');
  };

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('timer')}>←</IconBtn>}
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
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>PB {pb}{ex.unit === 'sec' ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => adjust(ex.id, -1)} style={stepBtn}>−</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <BigNum n={reps[ex.id]} size={46} color={isPR ? 'var(--streak)' : 'var(--text)'} />
                </div>
                <button onClick={() => adjust(ex.id, 1)} style={stepBtn}>+</button>
                <button onClick={() => adjust(ex.id, 5)} style={stepBtnSm}>+5</button>
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
