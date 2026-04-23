// DONE screen — celebration + share + spouse notify + next actions

function DoneScreen({ state, go }) {
  const t = state.today;
  const total = t.pushups + t.squats + t.hollow + t.pullups;
  const finishLine = useMemo(() => voiceLine('finish', state.streak, state.voice), []);
  const isPR = CORE_EXERCISES.some(ex => t[ex.id] >= state.bests[ex.id]);

  // Find the most relevant club: whichever exercise is closest (by %) to its next tier.
  const progress = CORE_EXERCISES.map(ex => ({
    ex, count: state.lifetimeBreakdown[ex.id] || 0,
    ...milestoneProgress(ex.id, state.lifetimeBreakdown[ex.id] || 0),
  }));
  const featured = progress.filter(p => p.next).sort((a, b) => b.pct - a.pct)[0] || progress[0];

  return (
    <Shell>
      <TopBar title="DAY LOGGED" />
      <HazardBar height={4} />
      <div style={{ padding: '20px 20px 120px', flex: 1, animation: 'slide-up 0.4s ease-out' }}>

        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 20 }}>
          <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--streak)' }}>✓ DEFAULT · NOT · FAIL</div>
          <BigNum n={total} unit="REPS" color="var(--text)" size={78} />
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 6 }}>
            {t.pushups} PUSH / {t.squats} SQ / {t.hollow}s HOLD / {t.pullups} PULL
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 10, letterSpacing: 1.5 }}>
            EFFORT · {Math.round(effortScore(t, state.bests) * 100)}% OF YOUR PR
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', borderLeft: '3px solid var(--accent)', padding: '12px 14px', marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{finishLine}</div>
        </div>

        {/* STREAK CARD */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--streak)', padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--streak)' }}>STREAK</div>
              <BigNum n={state.streak} unit="DAYS" color="var(--streak)" size={44} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>LIFETIME</div>
              <div className="display" style={{ fontSize: 22 }}>{state.totalReps.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* ELITE CLUB PROGRESS — per-exercise */}
        {featured && featured.next && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)' }}>
                NEXT · {featured.next.label} · {featured.ex.name}
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{featured.pct}%</div>
            </div>
            <div style={{ height: 6, background: 'var(--border)' }}>
              <div style={{ height: '100%', width: `${featured.pct}%`, background: 'var(--accent)' }} />
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 6 }}>
              {(featured.next.reps - featured.count).toLocaleString()} reps to {featured.next.tier}
            </div>
          </div>
        )}

        {/* Four-station mini ladder */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 12, marginBottom: 12 }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 10 }}>ELITE CLUBS · LIFETIME</div>
          {progress.map(p => (
            <div key={p.ex.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div className="mono" style={{ width: 60, fontSize: 10, color: 'var(--text-dim)' }}>{p.ex.short}</div>
              <div style={{ flex: 1, height: 4, background: 'var(--border)' }}>
                <div style={{ height: '100%', width: `${p.next ? p.pct : 100}%`, background: p.next ? 'var(--accent)' : 'var(--streak)' }} />
              </div>
              <div className="mono" style={{ width: 92, textAlign: 'right', fontSize: 10, color: 'var(--text)' }}>
                {p.count.toLocaleString()}{p.next ? ` / ${p.next.reps.toLocaleString()}` : ' · ELITE'}
              </div>
            </div>
          ))}
        </div>

        {isPR && (
          <div style={{ background: 'var(--streak-dim)', border: '1px solid var(--streak)', padding: 12, marginBottom: 12, textAlign: 'center' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--streak)' }}>★ NEW PERSONAL BEST ★</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
          <GhostBtn onClick={() => go('share')}>SHARE MAX CARD</GhostBtn>
          <GhostBtn onClick={() => go('leaderboard')}>LEADERBOARD</GhostBtn>
        </div>

        {state.streak % 7 === 0 && state.streak > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--accent)', padding: 12, marginTop: 12, textAlign: 'center' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)' }}>
              WEEK {Math.floor(state.streak / 7)} COMPLETE · Lights Out Mobility stays unlocked
            </div>
          </div>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 24px' }}>
        <PrimaryBtn onClick={() => go('home')}>BACK TO HOME</PrimaryBtn>
      </div>
    </Shell>
  );
}

Object.assign(window, { DoneScreen });
