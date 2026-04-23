// Extra screens: Max Card share, Leaderboard, Draft (tier-matched), Night, Kickoff 24

// Full-history calendar. Shows the last ~12 weeks as a GitHub-style grid with
// gold cells on logged days. Tap a cell to see the day's totals.
function CalendarScreen({ state, go }) {
  const weeks = 14; // ~3 months visible
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Align grid so the rightmost column ends on today.
  const end = new Date(today);
  const start = new Date(end); start.setDate(start.getDate() - (weeks * 7 - 1));
  const iso = (d) => d.toISOString().split('T')[0];
  const byDate = {};
  (state.history || []).forEach(h => { if (h && h.date) byDate[h.date] = h; });
  if (state.today && state.today.date) byDate[state.today.date] = { ...(byDate[state.today.date] || {}), ...state.today };

  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const k = iso(d);
    const hit = byDate[k];
    cells.push({ k, d, hit });
  }
  const [sel, setSel] = useState(null);
  const selHit = sel ? byDate[sel] : null;

  const monthLabels = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks; col++) {
    const first = cells[col * 7];
    const m = first.d.getMonth();
    monthLabels.push(m !== lastMonth ? first.d.toLocaleString('en', { month: 'short' }).toUpperCase() : '');
    lastMonth = m;
  }

  const logged = Object.keys(byDate).length;
  const lastWeek = cells.slice(-7).filter(c => c.hit).length;

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title="CALENDAR"
        sub={`${logged} TOTAL · ${lastWeek}/7 THIS WEEK`}
      />
      <HazardBar height={3} />
      <div style={{ padding: 20, flex: 1 }}>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          padding: 14, marginBottom: 14,
        }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-mute)', marginBottom: 10 }}>
            LAST {weeks} WEEKS
          </div>

          {/* month row */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks}, 1fr)`, gap: 3, marginBottom: 4 }}>
            {monthLabels.map((m, i) => (
              <div key={i} className="mono" style={{ fontSize: 7, color: 'var(--text-mute)', letterSpacing: 0.5, textAlign: 'left' }}>{m}</div>
            ))}
          </div>

          {/* grid: 7 rows × weeks columns */}
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: weeks }).map((_, col) => (
              <div key={col} style={{ flex: 1, display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 3 }}>
                {Array.from({ length: 7 }).map((_, row) => {
                  const c = cells[col * 7 + row];
                  const isToday = c.k === iso(today);
                  const isFuture = c.d > today;
                  return (
                    <button
                      key={row}
                      onClick={() => !isFuture && setSel(c.k)}
                      disabled={isFuture}
                      title={c.k}
                      style={{
                        aspectRatio: '1 / 1',
                        background: isFuture
                          ? 'transparent'
                          : c.hit ? 'var(--streak)' : 'var(--card-2)',
                        border: isToday
                          ? '1px solid var(--accent)'
                          : c.hit ? 'none' : '1px solid var(--border)',
                        borderRadius: 2,
                        padding: 0, cursor: isFuture ? 'default' : 'pointer',
                        opacity: isFuture ? 0.2 : 1,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', letterSpacing: 1.5 }}>TAP A DAY FOR DETAIL</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, background: 'var(--card-2)', border: '1px solid var(--border)' }} />
              <div style={{ width: 10, height: 10, background: 'var(--streak)' }} />
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)' }}>LOGGED</div>
            </div>
          </div>
        </div>

        {/* Day detail */}
        {sel && (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text)' }}>{sel}</div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
            {selHit ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                <DayStat label="PUSH"   v={selHit.pushups} />
                <DayStat label="SQUAT"  v={selHit.squats} />
                <DayStat label="HOLD"   v={selHit.hollow} unit="s" />
                <DayStat label="PULL"   v={selHit.pullups} />
              </div>
            ) : (
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', letterSpacing: 1.5 }}>NO ENTRY</div>
            )}
          </div>
        )}

        {/* Lifetime summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {CORE_EXERCISES.map(ex => (
            <div key={ex.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '10px 8px' }}>
              <div className="mono uppercase" style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-mute)' }}>{ex.short} LIFE</div>
              <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1, marginTop: 4 }}>
                {(state.lifetimeBreakdown[ex.id] || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

      </div>
    </Shell>
  );
}

function DayStat({ label, v, unit }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '8px 6px', textAlign: 'center' }}>
      <div className="mono uppercase" style={{ fontSize: 7, letterSpacing: 1.5, color: 'var(--text-mute)' }}>{label}</div>
      <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1, marginTop: 4 }}>
        {v || 0}{unit && <span className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginLeft: 1 }}>{unit}</span>}
      </div>
    </div>
  );
}

function MaxCardScreen({ state, go }) {
  const t = state.today || { pushups: state.bests.pushups, squats: state.bests.squats, hollow: state.bests.hollow, pullups: state.bests.pullups };
  const total = t.pushups + t.squats + t.hollow + t.pullups;
  const caption = MAX_CARD_CAPTIONS[state.streak % MAX_CARD_CAPTIONS.length].replace('%STREAK%', state.streak);
  const [status, setStatus] = useState(''); // '', 'rendering', 'saved', 'shared', 'error'
  const cardRef = useRef(null);

  const renderCard = async () => {
    if (!window.html2canvas) throw new Error('Card renderer not loaded yet. Try again in a moment.');
    // 2× scale keeps the card crisp on retina feeds.
    return window.html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    });
  };

  const filename = `daily-max-day-${state.streak || 0}-${(state.name || 'crew').replace(/\s+/g, '-').toLowerCase()}.png`;

  const download = async () => {
    setStatus('rendering');
    try {
      const canvas = await renderCard();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus('saved');
      setTimeout(() => setStatus(''), 2200);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus(''), 2500);
    }
  };

  const share = async () => {
    setStatus('rendering');
    try {
      const canvas = await renderCard();
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
      if (!blob) throw new Error('empty blob');
      const file = new File([blob], filename, { type: 'image/png' });

      // Prefer native share sheet (iOS/Android). Falls back to download.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'The Daily Max',
          text: `${caption}\nDay ${state.streak} · dailymax.app/${state.referralCode}`,
        });
        setStatus('shared');
      } else {
        // No share API — save the image so they can post it manually.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('saved');
      }
      setTimeout(() => setStatus(''), 2200);
    } catch (e) {
      // Share sheet cancellation throws AbortError — treat that as silent
      if (e && e.name === 'AbortError') { setStatus(''); return; }
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus(''), 2500);
    }
  };

  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="MAX CARD" sub="SHARE TO THE CREW" />
      <HazardBar height={4} />
      <div style={{ padding: 20, flex: 1 }}>
        <div ref={cardRef} style={{
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
          <GhostBtn onClick={download} disabled={status === 'rendering'}>
            {status === 'rendering' ? '...' : status === 'saved' ? '✓ SAVED' : '↓ SAVE IMAGE'}
          </GhostBtn>
          <GhostBtn onClick={share} disabled={status === 'rendering'}>
            {status === 'rendering' ? '...' : status === 'shared' ? '✓ SHARED' : 'SHARE →'}
          </GhostBtn>
        </div>
        {status === 'error' && (
          <div className="mono uppercase" style={{
            marginTop: 10, padding: '8px 10px',
            background: '#1F0D0D', border: '1px solid #5A1F1F',
            color: '#FF6B6B', fontSize: 10, letterSpacing: 1.5, textAlign: 'center',
          }}>
            COULDN'T RENDER THE CARD · TRY AGAIN
          </div>
        )}
        <div className="mono" style={{
          marginTop: 10, fontSize: 9, color: 'var(--text-mute)',
          letterSpacing: 1.5, textAlign: 'center', lineHeight: 1.5,
        }}>
          SAVES A PNG TO YOUR PHOTOS · SHARE SENDS IT STRAIGHT TO THE CREW
        </div>
      </div>
    </Shell>
  );
}

function LeaderboardScreen({ state, setState, go }) {
  const bracket = state.ageBracket || '30s';
  const api = window.api;
  const apiEnabled = api && api.enabled;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    if (!apiEnabled) { setRows([]); return; }
    setLoading(true); setErr('');
    try {
      const { data, error } = await api.listLeaderboard({ bracket });
      if (error) { setErr(error.message || 'Could not load.'); setRows([]); }
      else setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || 'Network error.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [bracket]);
  // Re-pull on tab-visible so the board updates after the user logs a day.
  useEffect(() => {
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [bracket]);

  // Normalize RPC shape → display shape.
  const list = rows.map(r => ({
    id: r.user_id,
    name: r.display_name || r.handle || 'CREW',
    city: r.city || '—',
    streak: r.streak || 0,
    pu: r.pushups || 0,
    sq: r.squats || 0,
    ho: r.hollow_sec || 0,
    pl: r.pullups || 0,
    total: r.total || 0,
    isYou: !!r.is_you,
  }));

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={() => go('home')}>←</IconBtn>}
        title="CREW LEADERBOARD"
        sub="YOUR BRACKET"
        right={<IconBtn onClick={load}>↻</IconBtn>}
      />
      <HazardBar height={4} />
      <div style={{ padding: '14px 20px 80px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {['20s', '30s', '40s', '50s', '60+'].map(b => (
            <button key={b} onClick={() => setState(s => ({ ...s, ageBracket: b }))} style={{
              flex: 1, padding: '10px 0',
              background: bracket === b ? 'var(--accent)' : 'var(--card)',
              border: `1px solid ${bracket === b ? 'var(--accent)' : 'var(--border)'}`,
              color: bracket === b ? '#0A0A0A' : 'var(--text-dim)',
              fontFamily: 'Archivo Black', fontSize: 11, letterSpacing: 1.5,
            }}>{b}</button>
          ))}
        </div>
        <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 8 }}>
          RANKED BY TOTAL WORK (TODAY){loading ? ' · LOADING…' : ''}
        </div>

        {err && (
          <div className="mono" style={{
            fontSize: 10, color: '#FF6B6B', padding: '8px 10px',
            border: '1px solid #5A1F1F', background: '#1F0D0D', marginBottom: 10, letterSpacing: 1.5,
          }}>
            {err}
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{
            background: 'var(--card)', border: '1px dashed var(--border-2)',
            padding: '28px 18px', textAlign: 'center',
          }}>
            <div className="display" style={{ fontSize: 18, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              NO ONE HERE YET.
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
              The board fills in as the crew logs today's max.<br/>
              Be the first pin on the map.
            </div>
          </div>
        )}

        <div style={{ background: list.length ? 'var(--card)' : 'transparent', border: list.length ? '1px solid var(--border)' : 'none' }}>
          {list.map((p, i) => (
            <div key={p.id || p.name + i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderBottom: i < list.length - 1 ? '1px solid var(--border)' : 'none',
              background: p.isYou ? 'var(--accent-dim)' : 'transparent',
            }}>
              <div className="display" style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: i < 3 ? 'var(--accent)' : 'var(--text-mute)',
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: p.isYou ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: '20px 14px', textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.5 }}>
              {pool.length === 0
                ? "NO CREW IN YOUR BRACKET YET.\nINVITE SOMEONE AND PICK A FIGHT."
                : "NO OPPONENTS IN THIS BAND. TRY ANOTHER MODE."}
            </div>
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

// KICKOFF 30 — 30-day ramp-in challenge. One bonus per day, built-to-miss.
function KickoffScreen({ state, go }) {
  // Day N: past days (< N) are done, day N is current, day N+... is locked.
  // At kickoffDay = 1, nothing is done yet — day 1 is the one to open.
  const TOTAL = 30;
  const bonuses = (typeof KICKOFF_BONUSES !== 'undefined' && KICKOFF_BONUSES) ? KICKOFF_BONUSES : [];
  const today = Math.min(Math.max(1, state.kickoffDay || 1), TOTAL);
  const days = Array.from({ length: TOTAL }, (_, i) => ({
    day: i + 1,
    done: i + 1 < today,
    locked: i + 1 > today,
    current: i + 1 === today,
  }));
  const [pickedDay, setPickedDay] = useState(today);
  const selected = Math.min(Math.max(1, pickedDay), TOTAL);
  const bonus = bonuses[selected - 1] || { name: 'TBD', cue: 'Bonus loading…' };
  const isToday = selected === today;
  const isFuture = selected > today;
  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="KICKOFF 30" sub="30-DAY RAMP" />
      <HazardBar height={4} />
      <div style={{ padding: 20, flex: 1 }}>
        <div className="display" style={{ fontSize: 32, lineHeight: 1 }}>30 DAYS.<br/>ONE TO OPEN.</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, marginBottom: 16 }}>
          Each day adds one bonus on top of your Daily Max. Skip one and it's gone — no make-ups.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {days.map(d => {
            const isSelected = d.day === selected;
            return (
              <button
                key={d.day}
                onClick={() => setPickedDay(d.day)}
                style={{
                  aspectRatio: '1',
                  background: d.current ? 'var(--accent)' : d.done ? 'var(--card)' : 'var(--bg-2)',
                  border: `${isSelected ? 2 : 1}px solid ${d.current ? 'var(--accent)' : d.done ? 'var(--streak)' : isSelected ? 'var(--text)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', cursor: 'pointer', padding: 0,
                }}
              >
                <div className="display" style={{
                  fontSize: 16,
                  color: d.current ? '#0A0A0A' : d.done ? 'var(--streak)' : 'var(--text-mute)',
                }}>{d.day}</div>
                <div className="mono" style={{ fontSize: 7, color: d.current ? '#0A0A0A' : 'var(--text-mute)', marginTop: 1 }}>
                  {d.current ? 'TODAY' : d.done ? '✓' : '◯'}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{
          marginTop: 20,
          background: 'var(--card)',
          border: `1px solid ${isToday ? 'var(--accent)' : isFuture ? 'var(--border)' : 'var(--streak)'}`,
          padding: 14,
        }}>
          <div className="mono uppercase" style={{
            fontSize: 9, letterSpacing: 2,
            color: isToday ? 'var(--accent)' : isFuture ? 'var(--text-mute)' : 'var(--streak)',
          }}>
            DAY {selected} · {isToday ? 'TODAY' : isFuture ? 'LOCKED' : 'DONE'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{bonus.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4, lineHeight: 1.4 }}>
            {isFuture ? 'Finish today first. No peeking ahead.' : bonus.cue}
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { CalendarScreen, MaxCardScreen, LeaderboardScreen, DraftScreen, NightScreen, KickoffScreen });
