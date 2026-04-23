// Extra screens: Max Card share, Leaderboard, Draft (tier-matched), Night, Kickoff 24

function MaxCardScreen({ state, go }) {
  const t = state.today || { pushups: state.bests.pushups, squats: state.bests.squats, hollow: state.bests.hollow, pullups: state.bests.pullups };
  const total = t.pushups + t.squats + t.hollow + t.pullups;
  const caption = MAX_CARD_CAPTIONS[state.streak % MAX_CARD_CAPTIONS.length].replace('%STREAK%', state.streak);
  const [copied, setCopied] = useState(false);
  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="MAX CARD" sub="SHARE TO THE CREW" />
      <HazardBar height={4} />
      <div style={{ padding: 20, flex: 1 }}>
        <div style={{
          background: 'var(--bone)', color: '#0A0A0A', padding: 22,
          position: 'relative', boxShadow: '0 20px 40px rgba(201,162,74,0.25)',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}><HazardBar height={6} /></div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 3, color: '#666' }}>THE DAILY MAX</div>
              <div className="display" style={{ fontSize: 20, color: '#0A0A0A', marginTop: 2 }}>{state.name.toUpperCase() || 'CREW MEMBER'}</div>
              <div className="mono" style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{state.city.toUpperCase()} · {state.ageBracket}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 9, color: '#666' }}>DAY</div>
              <div className="display" style={{ fontSize: 28, color: 'var(--accent)', lineHeight: 1 }}>{state.streak}</div>
            </div>
          </div>
          <div style={{ margin: '18px 0', borderTop: '2px solid #0A0A0A' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CORE_EXERCISES.map(ex => (
              <div key={ex.id}>
                <div className="mono uppercase" style={{ fontSize: 8, letterSpacing: 2, color: '#666' }}>{ex.name}</div>
                <div className="display" style={{ fontSize: 36, color: '#0A0A0A', lineHeight: 1, marginTop: 2 }}>
                  {t[ex.id]}{ex.unit === 'sec' && <span style={{ fontSize: 18, color: '#666' }}>s</span>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ margin: '16px 0 0', borderTop: '2px solid #0A0A0A', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="mono uppercase" style={{ fontSize: 8, letterSpacing: 2, color: '#666' }}>TOTAL WORK</div>
              <div className="display" style={{ fontSize: 26, color: 'var(--accent)', lineHeight: 1 }}>{total}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono uppercase" style={{ fontSize: 8, letterSpacing: 2, color: '#666' }}>LIFETIME</div>
              <div className="display" style={{ fontSize: 16, color: '#0A0A0A', lineHeight: 1, marginTop: 4 }}>{state.totalReps.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, fontStyle: 'italic', color: '#333' }}>"{caption}"</div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px dashed #999', paddingTop: 10 }}>
            <div style={{ width: 44, height: 44, background: '#0A0A0A', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 4, background: 'var(--bone)' }} />
              <div style={{ position: 'absolute', inset: 8, background: '#0A0A0A' }} />
              <div style={{ position: 'absolute', inset: 12, background: 'var(--bone)' }} />
              <div style={{ position: 'absolute', inset: 16, background: '#0A0A0A' }} />
            </div>
            <div>
              <div className="mono uppercase" style={{ fontSize: 8, letterSpacing: 2, color: '#666' }}>JOIN THE CREW</div>
              <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: '#0A0A0A' }}>dailymax.app/{state.referralCode}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 16 }}>
          <GhostBtn onClick={() => {
            navigator.clipboard && navigator.clipboard.writeText(
              `${caption}\n\n${t.pushups} push / ${t.squats} sq / ${t.hollow}s hold / ${t.pullups} pull\nDay ${state.streak} · dailymax.app/${state.referralCode}`
            );
            setCopied(true); setTimeout(() => setCopied(false), 2000);
          }}>
            {copied ? '✓ COPIED' : 'COPY TEXT'}
          </GhostBtn>
          <GhostBtn onClick={() => alert('Share link copied to clipboard')}>SEND →</GhostBtn>
        </div>
      </div>
    </Shell>
  );
}

function LeaderboardScreen({ state, setState, go }) {
  const bracket = state.ageBracket || '30s';
  const list = (LEADERBOARD[bracket] || [])
    .map(p => p.isYou ? { ...p, pu: state.bests.pushups, sq: state.bests.squats, ho: state.bests.hollow, pl: state.bests.pullups, streak: state.streak } : p)
    .map(p => ({ ...p, total: (p.pu || 0) + (p.sq || 0) + (p.ho || 0) + (p.pl || 0) }))
    .sort((a, b) => b.total - a.total);

  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="CREW LEADERBOARD" sub="YOUR BRACKET" />
      <HazardBar height={4} />
      <div style={{ padding: '14px 20px 80px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['20s', '30s', '40s', '50s'].map(b => (
            <button key={b} onClick={() => setState(s => ({ ...s, ageBracket: b }))} style={{
              flex: 1, padding: '10px 0',
              background: bracket === b ? 'var(--accent)' : 'var(--card)',
              border: `1px solid ${bracket === b ? 'var(--accent)' : 'var(--border)'}`,
              color: bracket === b ? '#0A0A0A' : 'var(--text-dim)',
              fontFamily: 'Archivo Black', fontSize: 12, letterSpacing: 2,
            }}>{b}</button>
          ))}
        </div>
        <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 8 }}>
          RANKED BY TOTAL WORK (TODAY)
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {list.map((p, i) => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
              background: p.isYou ? 'var(--accent-dim)' : 'transparent',
            }}>
              <div className="display" style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: i < 3 ? 'var(--accent)' : 'var(--text-mute)',
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: p.isYou ? 'var(--accent)' : 'var(--text)' }}>
                  {p.name} {p.isYou && <span className="mono" style={{ fontSize: 9, marginLeft: 4, color: 'var(--accent)' }}>· YOU</span>}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 1 }}>
                  {p.city} · {p.streak}d streak
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="display" style={{ fontSize: 18, color: p.isYou ? 'var(--accent)' : 'var(--text)' }}>{p.total}</div>
                <div className="mono" style={{ fontSize: 8, color: 'var(--text-mute)' }}>{p.pu}/{p.sq}/{p.ho}s/{p.pl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// DRAFT — tier-matched 1v1.
// In-class: opponent within ±10% of your PR total → raw reps wins.
// Cross-class: auto-switches to % of PR scoring (effort scored, cap 1.0).
function DraftScreen({ state, go }) {
  const pool = (LEADERBOARD[state.ageBracket] || []).filter(p => !p.isYou);
  const yourPR = prSum(state.bests);
  const [sent, setSent] = useState(null);
  const [mode, setMode] = useState('auto'); // auto | inclass | effort

  const opponents = pool.map(p => {
    const theirPR = (p.pu || 0) + (p.sq || 0) + (p.ho || 0) + (p.pl || 0);
    const inClass = draftInClass(yourPR, theirPR, 0.10);
    return { ...p, theirPR, inClass };
  });

  const filtered = mode === 'inclass' ? opponents.filter(p => p.inClass)
                 : mode === 'effort'  ? opponents.filter(p => !p.inClass)
                 : opponents;

  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="THE DRAFT" sub="TIER-MATCHED · 7-DAY DUEL" />
      <HazardBar height={4} />
      <div style={{ padding: 20, flex: 1 }}>
        <div className="display" style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>PICK YOUR<br/>OPPONENT.</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.4 }}>
          Within ±10% of your PR total: raw reps wins. Outside that class: scored on <span style={{ color: 'var(--accent)' }}>% of your own PR</span>. Movement over ego.
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {[
            { id: 'auto',    l: 'ALL' },
            { id: 'inclass', l: 'IN CLASS' },
            { id: 'effort',  l: 'CROSS CLASS' },
          ].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} className="mono uppercase" style={{
              flex: 1, padding: '8px 0',
              background: mode === t.id ? 'var(--accent)' : 'var(--card)',
              border: `1px solid ${mode === t.id ? 'var(--accent)' : 'var(--border)'}`,
              color: mode === t.id ? '#0A0A0A' : 'var(--text-dim)',
              fontSize: 10, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
            }}>{t.l}</button>
          ))}
        </div>

        <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 10 }}>
          YOUR PR TOTAL · {yourPR || '—'}
        </div>

        {filtered.length === 0 && (
          <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: 14, textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>NO OPPONENTS IN THIS BAND. TRY ANOTHER MODE.</div>
          </div>
        )}

        {filtered.map(p => {
          const isSent = sent === p.name;
          const scoreMode = p.inClass ? 'RAW REPS' : '% OF PR';
          return (
            <div key={p.name} style={{ background: 'var(--card)', border: `1px solid ${isSent ? 'var(--streak)' : 'var(--border)'}`, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="display" style={{
                  width: 44, height: 44, background: 'var(--accent-dim)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>{p.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>{p.city} · PR {p.theirPR} · {p.streak}d</div>
                </div>
                <button onClick={() => setSent(p.name)} className="mono uppercase" style={{
                  padding: '8px 12px',
                  background: isSent ? 'var(--streak)' : 'transparent',
                  border: `1px solid ${isSent ? 'var(--streak)' : 'var(--accent)'}`,
                  color: isSent ? '#0A0A0A' : 'var(--accent)',
                  fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
                }}>{isSent ? 'CHALLENGED' : 'CHALLENGE'}</button>
              </div>
              <div style={{
                marginTop: 10, padding: '6px 10px',
                background: p.inClass ? 'var(--streak-dim)' : 'var(--accent-dim)',
                border: `1px solid ${p.inClass ? 'var(--streak)' : 'var(--accent)'}`,
              }}>
                <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: p.inClass ? 'var(--streak)' : 'var(--accent)' }}>
                  SCORING · {scoreMode}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>
                  {p.inClass
                    ? `Within ±10% of your PR (${yourPR} vs ${p.theirPR}). Total reps over 7 days wins.`
                    : `Outside your class (${yourPR} vs ${p.theirPR}). Whoever averages highest % of their own PR wins. Cap 100%.`}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 14, background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: 14 }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 6 }}>OR INVITE A FRIEND</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)', fontSize: 12 }} className="mono">
              dailymax.app/{state.referralCode}
            </div>
            <GhostBtn onClick={() => alert('Link copied')}>COPY</GhostBtn>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function NightScreen({ state, go }) {
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(NIGHT_FLOW[0].time);
  const ref = useRef(null);
  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);
  useEffect(() => {
    if (left <= 0) {
      if (idx + 1 < NIGHT_FLOW.length) { setIdx(i => i + 1); setLeft(NIGHT_FLOW[idx + 1].time); }
      else { setRunning(false); }
    }
  }, [left]);

  const step = NIGHT_FLOW[idx];
  return (
    <Shell bg="#050508">
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="LIGHTS OUT" sub="MOBILITY · UNLOCKED" />
      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--streak)', marginBottom: 8 }}>
          STEP {idx + 1} / {NIGHT_FLOW.length}
        </div>
        <div className="display" style={{ fontSize: 26, textAlign: 'center', lineHeight: 1.1, color: 'var(--text)' }}>{step.name}</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 8, textAlign: 'center' }}>{step.cue}</div>

        <div className="display" style={{ fontSize: 110, color: 'var(--streak)', marginTop: 32, letterSpacing: '-0.04em' }}>{left}</div>
        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--text-mute)' }}>SECONDS</div>

        <div style={{ marginTop: 32, width: '100%' }}>
          {!running ? (
            <button onClick={() => setRunning(true)} style={{
              width: '100%', padding: '16px 0', background: 'var(--streak)', color: '#FFF',
              border: 'none', fontFamily: 'Archivo Black', fontSize: 15, letterSpacing: 3,
            }}>BEGIN FLOW</button>
          ) : (
            <button onClick={() => setRunning(false)} style={{
              width: '100%', padding: '16px 0', background: 'transparent', border: '1px solid var(--streak)',
              color: 'var(--streak)', fontFamily: 'Archivo Black', fontSize: 13, letterSpacing: 2,
            }}>PAUSE</button>
          )}
        </div>
      </div>
    </Shell>
  );
}

// KICKOFF 24 — formerly Dadvent. 24-day ramp-in challenge.
function KickoffScreen({ state, go }) {
  const days = Array.from({ length: 24 }, (_, i) => ({
    day: i + 1,
    done: i < state.kickoffDay,
    locked: i + 1 > state.kickoffDay,
    current: i + 1 === state.kickoffDay,
  }));
  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="KICKOFF 24" sub="24-DAY RAMP" />
      <HazardBar height={4} />
      <div style={{ padding: 20, flex: 1 }}>
        <div className="display" style={{ fontSize: 32, lineHeight: 1 }}>24 DAYS.<br/>ONE TO OPEN.</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, marginBottom: 16 }}>
          Each day unlocks a crew-proven challenge. Skip one and it's gone.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {days.map(d => (
            <div key={d.day} style={{
              aspectRatio: '1',
              background: d.current ? 'var(--accent)' : d.done ? 'var(--card)' : 'var(--bg-2)',
              border: `1px solid ${d.current ? 'var(--accent)' : d.done ? 'var(--streak)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <div className="display" style={{
                fontSize: 20,
                color: d.current ? '#0A0A0A' : d.done ? 'var(--streak)' : 'var(--text-mute)',
              }}>{d.day}</div>
              <div className="mono" style={{ fontSize: 8, color: d.current ? '#0A0A0A' : 'var(--text-mute)', marginTop: 2 }}>
                {d.current ? 'TODAY' : d.done ? '✓' : '◯'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, background: 'var(--card)', border: '1px solid var(--accent)', padding: 14 }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)' }}>DAY {state.kickoffDay} · TODAY</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>The Loaded Carry</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.4 }}>
            Finish your Daily Max with a 60-second farmer carry. Groceries, a backpack, whatever's heaviest in reach.
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { MaxCardScreen, LeaderboardScreen, DraftScreen, NightScreen, KickoffScreen });
