// CREW BATTLE — team vs team, effort-capped at 1.0. No one carries.
// Clan score = mean of members' min(today_work / personal_PR, 1.0).
// Team class by mean team PR. Cross-class matches auto-switch to pure % scoring (same math, just relabeled).

function ClanScreen({ state, setState, go }) {
  const clan = state.clan || CLAN_SEED;
  const yourEffort = effortScore(state.today || {}, state.bests);

  // Update YOU's contribution live from today's log
  const members = clan.members.map(m => m.isYou ? { ...m, contributedToday: yourEffort, prTotal: prSum(state.bests) || m.prTotal } : m);

  const prMean = Math.round(members.reduce((a, m) => a + m.prTotal, 0) / members.length);
  const cls = clanClass(prMean);
  const contributed = members.filter(m => m.contributedToday > 0).length;
  const yourClanScore = members.reduce((a, m) => a + Math.min(1, m.contributedToday), 0) / members.length;

  const opp = clan.battleAgainst;
  const oppCls = clanClass(prMean); // mock: same tier
  const crossClass = cls !== oppCls;

  const hoursLeft = Math.max(0, Math.round((clan.battleEndsAt - Date.now()) / (1000 * 60 * 60)));
  const winning = yourClanScore > opp.meanScore;
  const diff = Math.abs(yourClanScore - opp.meanScore);

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title={clan.name}
        sub={`CLASS ${cls} · ${members.length} CREW`}
        right={<span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{hoursLeft}h</span>}
      />
      <HazardBar height={4} />

      <div style={{ padding: '14px 20px 40px', flex: 1 }}>

        {/* BATTLE HEADLINE */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 14, marginBottom: 12 }}>
          <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 8 }}>
            BATTLE · {crossClass ? 'CROSS-CLASS · % SCORING' : `IN CLASS · ${cls}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: winning ? 'var(--streak)' : 'var(--text)' }}>{clan.name}</div>
              <div className="display" style={{ fontSize: 30, color: winning ? 'var(--streak)' : 'var(--text)', lineHeight: 1 }}>
                {Math.round(yourClanScore * 100)}<span className="mono" style={{ fontSize: 12, color: 'var(--text-mute)', marginLeft: 2 }}>%</span>
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 2 }}>{contributed}/{members.length} IN</div>
            </div>
            <div className="display" style={{ fontSize: 24, color: 'var(--text-mute)' }}>VS</div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: !winning ? 'var(--accent)' : 'var(--text)' }}>{opp.name}</div>
              <div className="display" style={{ fontSize: 30, color: !winning ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>
                {Math.round(opp.meanScore * 100)}<span className="mono" style={{ fontSize: 12, color: 'var(--text-mute)', marginLeft: 2 }}>%</span>
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 2 }}>{opp.contributedCount}/{opp.memberCount} IN</div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 6, background: 'var(--border)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${yourClanScore * 100}%`, background: 'var(--streak)' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${opp.meanScore * 100}%`, background: 'var(--accent)', opacity: 0.4 }} />
          </div>
          <div className="mono" style={{ fontSize: 10, color: winning ? 'var(--streak)' : 'var(--accent)', marginTop: 8, textAlign: 'center' }}>
            {winning ? `▲ LEADING BY ${Math.round(diff * 100)}%` : `▼ TRAILING BY ${Math.round(diff * 100)}%`}
          </div>
        </div>

        {/* RULES REMINDER */}
        <div style={{ background: 'var(--bg-2)', borderLeft: '3px solid var(--accent)', padding: '10px 12px', marginBottom: 12 }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)', marginBottom: 4 }}>CREW RULE</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Each score caps at 100% of your own PR. Titans can't carry. Whole crew contributes or the whole crew loses.
          </div>
        </div>

        {/* MEMBER GRID */}
        <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-dim)', marginBottom: 8 }}>CREW · TODAY</div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {members.map((m, i) => {
            const pct = Math.min(1, m.contributedToday);
            const done = pct > 0;
            return (
              <div key={m.name} style={{
                padding: '12px 14px',
                borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                background: m.isYou ? 'var(--accent-dim)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="display" style={{
                    width: 32, height: 32, background: done ? 'var(--streak-dim)' : 'var(--bg-2)',
                    border: `1px solid ${done ? 'var(--streak)' : 'var(--border-2)'}`,
                    color: done ? 'var(--streak)' : 'var(--text-mute)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  }}>{done ? '✓' : '◯'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: m.isYou ? 'var(--accent)' : 'var(--text)' }}>
                      {m.name} {m.isYou && <span className="mono" style={{ fontSize: 9, color: 'var(--accent)', marginLeft: 4 }}>· YOU</span>}
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)' }}>PR {m.prTotal}</div>
                  </div>
                  <div className="display" style={{ fontSize: 18, color: done ? 'var(--streak)' : 'var(--text-mute)' }}>
                    {Math.round(pct * 100)}<span className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>%</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, height: 3, background: 'var(--border)' }}>
                  <div style={{ width: `${pct * 100}%`, height: '100%', background: done ? 'var(--streak)' : 'transparent' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* HOW SCORING WORKS */}
        <div style={{ marginTop: 14, background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: 12 }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 6 }}>HOW SCORING WORKS</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Your score = min(today's work ÷ your PR, 1.0).<br/>
            Crew score = mean across members.<br/>
            Highest crew score at {hoursLeft}h mark wins. One inactive member ≠ auto-loss — but their 0% drags the mean.
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 14 }}>
          {yourEffort >= 1 ? (
            <div style={{ background: 'var(--streak-dim)', border: '1px solid var(--streak)', padding: 14, textAlign: 'center' }}>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--streak)' }}>✓ MAXED FOR THE CREW</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>You've contributed 100%. Rest of the crew is up.</div>
            </div>
          ) : yourEffort > 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--accent)', padding: 14, textAlign: 'center' }}>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)' }}>
                YOU'RE AT {Math.round(yourEffort * 100)}% · ROOM TO GROW
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>
                Go again or log more. Cap hits at 100% — no overcooking.
              </div>
            </div>
          ) : (
            <PrimaryBtn onClick={() => go('timer')}>GO FOR THE CREW →</PrimaryBtn>
          )}
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { ClanScreen });
