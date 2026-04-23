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
              <div className="display" style={{ fontSize: 20, color: '#0A0A0A', marginTop: 2 }}>
                {(state.name || state.username || 'FRIEND').toUpperCase()}
              </div>
              <div className="mono" style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                {(state.city || '').toUpperCase()}{state.city && state.ageBracket ? ' · ' : ''}{state.ageBracket || ''}
              </div>
              {/* Crew line. Always shows something so no one feels solo —
                  falls back to the default DM Crew when the user hasn't
                  joined a custom crew yet. */}
              <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)', marginTop: 6, fontWeight: 700 }}>
                ◆ CREW · {(state.clanName || 'DM CREW').toUpperCase()}{state.clanTag ? ` · ${state.clanTag}` : ''}
              </div>
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

// ═══════════════════════════════════════════════════════════════════════
// US STATE TILE MAP — 50 states + DC on a 12×8 brutalist grid.
// Coordinates are [row, col]. Layout is ~geographically suggestive, not
// exact. AK + HI tucked along the left column, ME top-right, FL bottom-
// right. Passes the vibe check; not a cartography exam.
// ═══════════════════════════════════════════════════════════════════════
const STATE_TILES = {
  ME: [0, 11],
  AK: [1, 0],  VT: [1, 9],  NH: [1, 10],
  WA: [2, 1],  ID: [2, 2],  MT: [2, 3],  ND: [2, 4],  MN: [2, 5],
  WI: [2, 8],  MI: [2, 9],  NY: [2, 10], MA: [2, 11],
  OR: [3, 1],  NV: [3, 2],  WY: [3, 3],  SD: [3, 4],  IA: [3, 5],
  IL: [3, 6],  IN: [3, 7],  OH: [3, 8],  PA: [3, 9],  NJ: [3, 10], CT: [3, 11],
  CA: [4, 1],  UT: [4, 2],  CO: [4, 3],  NE: [4, 4],  MO: [4, 5],
  KY: [4, 6],  WV: [4, 7],  VA: [4, 8],  MD: [4, 9],  DE: [4, 10], RI: [4, 11],
  AZ: [5, 2],  NM: [5, 3],  KS: [5, 4],  AR: [5, 5],  TN: [5, 6],
  NC: [5, 7],  SC: [5, 8],  DC: [5, 9],
  HI: [6, 0],  OK: [6, 4],  LA: [6, 5],  MS: [6, 6],  AL: [6, 7],  GA: [6, 8],
  TX: [7, 4],  FL: [7, 9],
};
const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',DC:'D.C.',FL:'Florida',GA:'Georgia',HI:'Hawaii',
  ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',
  LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',
  MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',
  NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
  NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
  PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

// Tile grid. `myState` gets the gold ring + oxblood glow. Any state in
// `champsByState` gets a gold corner dot. Tap to open the ladder modal.
function StateMap({ myState, champsByState, onPick }) {
  const ROWS = 8;
  const COLS = 12;
  const tiles = Object.entries(STATE_TILES);
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border-2)',
      padding: 10, marginBottom: 12, position: 'relative', overflow: 'hidden',
    }}>
      {/* faint radial scanner glow behind your state — makes it feel alive */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 30%, rgba(139,26,26,0.08) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div className="mono uppercase" style={{
        fontSize: 9, letterSpacing: 2.5, color: 'var(--text-mute)',
        marginBottom: 8, display: 'flex', justifyContent: 'space-between',
      }}>
        <span>REGIONAL BATTLE MAP</span>
        <span style={{ color: 'var(--streak)' }}>● CHAMP  <span style={{ color: 'var(--accent)' }}>◆ YOU</span></span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        gap: 3,
        aspectRatio: `${COLS} / ${ROWS}`,
        position: 'relative', zIndex: 1,
      }}>
        {tiles.map(([abbr, [r, c]]) => {
          const isMine = abbr === myState;
          const champ = champsByState && champsByState[abbr];
          const hasChamp = !!champ;
          return (
            <button
              key={abbr}
              onClick={() => onPick && onPick(abbr)}
              title={hasChamp ? `${STATE_NAMES[abbr]} · ${champ.name}` : STATE_NAMES[abbr]}
              className="mono"
              style={{
                gridColumn: c + 1,
                gridRow: r + 1,
                aspectRatio: '1 / 1',
                padding: 0,
                background: isMine ? 'var(--accent-dim)'
                          : hasChamp ? '#1A1313'
                          : 'var(--card)',
                border: isMine ? '1px solid var(--streak)'
                      : hasChamp ? '1px solid var(--border-2)'
                      : '1px solid var(--border)',
                color: isMine ? 'var(--streak)'
                     : hasChamp ? 'var(--text-dim)'
                     : 'var(--text-mute)',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 0.5,
                cursor: 'pointer',
                position: 'relative',
                boxShadow: isMine ? '0 0 16px rgba(139,26,26,0.45), inset 0 0 0 1px rgba(201,162,74,0.3)' : 'none',
                transition: 'transform 120ms ease, box-shadow 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.zIndex = '2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '1'; }}
            >
              {abbr}
              {hasChamp && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--streak)',
                  boxShadow: '0 0 4px var(--streak)',
                }} />
              )}
              {isMine && (
                <span style={{
                  position: 'absolute', bottom: 1, left: 1,
                  fontSize: 6, color: 'var(--accent)', fontWeight: 900,
                }}>◆</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mono" style={{
        fontSize: 9, color: 'var(--text-mute)', letterSpacing: 1.5,
        marginTop: 8, textAlign: 'center',
      }}>
        TAP ANY STATE TO SEE THE REIGNING CHAMP & TOP 10 CONTENDERS
      </div>
    </div>
  );
}

// 3D popup for a single state's ladder. Scales in from nowhere with
// perspective + rotateX depth so it feels like the state lifted off the
// grid. Champ is rank 1 (big card); contenders 2–10 list beneath.
function StateChampModal({ abbr, rows, loading, yourClanId, onClose, onChallenge, sentMap, busyId }) {
  const title = STATE_NAMES[abbr] || abbr;
  const champ = (rows || []).find(r => r.rank === 1);
  const contenders = (rows || []).filter(r => r.rank > 1);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, perspective: '1000px',
        animation: 'fade-up 180ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '92%', overflowY: 'auto',
          background: 'var(--card)',
          border: '1px solid var(--streak)',
          boxShadow: '0 40px 80px rgba(201,162,74,0.25), 0 0 0 1px rgba(201,162,74,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
          transform: 'rotateX(6deg) translateZ(40px)',
          transformStyle: 'preserve-3d',
          animation: 'slide-up 260ms cubic-bezier(0.2, 0.9, 0.25, 1.1)',
        }}
      >
        {/* gold stripe header w/ state name */}
        <div className="gold-stripe" style={{ height: 5 }} />
        <div style={{
          padding: '14px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(201,162,74,0.08) 0%, transparent 100%)',
        }}>
          <div>
            <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--streak)' }}>
              STATE · {abbr}
            </div>
            <div className="display" style={{ fontSize: 24, lineHeight: 1, marginTop: 2, color: 'var(--text)' }}>
              {title.toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-mute)',
            fontSize: 24, cursor: 'pointer', padding: 4,
          }}>×</button>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {loading && (
            <div className="mono" style={{
              padding: 20, textAlign: 'center', fontSize: 11, letterSpacing: 1.5,
              color: 'var(--text-mute)',
            }}>LOADING LADDER…</div>
          )}

          {!loading && (!rows || rows.length === 0) && (
            <div style={{
              background: 'var(--bg-2)', border: '1px dashed var(--border-2)',
              padding: 20, textAlign: 'center',
            }}>
              <div className="display" style={{ fontSize: 16, color: 'var(--text)' }}>NO CREWS YET.</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', letterSpacing: 1.5, marginTop: 6 }}>
                THE THRONE IS UNCLAIMED. FOUND A CREW HERE FIRST.
              </div>
            </div>
          )}

          {/* CHAMP CARD — big, gold-edged, crown icon */}
          {champ && (
            <div style={{
              background: 'linear-gradient(180deg, rgba(201,162,74,0.12) 0%, var(--card-2) 100%)',
              border: '1px solid var(--streak)',
              padding: 14,
              marginBottom: 12,
              position: 'relative',
              boxShadow: '0 8px 20px rgba(201,162,74,0.15)',
            }}>
              <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 3, color: 'var(--streak)' }}>
                ♛ REIGNING CHAMP
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <div className="display" style={{
                  width: 54, height: 54,
                  background: 'var(--streak-dim)', color: 'var(--streak)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, border: '1px solid var(--streak)',
                }}>◆</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.1 }}>
                    {champ.name}
                    {champ.tag && <span className="mono" style={{ fontSize: 11, color: 'var(--streak)', marginLeft: 6 }}>[{champ.tag}]</span>}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 3 }}>
                    {champ.member_count} · TOTAL PR {champ.total_pr} · AVG {champ.avg_pr} · {champ.active_today} TODAY
                  </div>
                </div>
              </div>
              {champ.description && (
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.4 }}>
                  {champ.description}
                </div>
              )}
              {!champ.is_yours && yourClanId && (
                <button
                  onClick={() => onChallenge && onChallenge(champ)}
                  disabled={sentMap[champ.clan_id] || busyId === champ.clan_id}
                  className="mono uppercase"
                  style={{
                    width: '100%', marginTop: 12, padding: '12px 0',
                    background: sentMap[champ.clan_id] ? 'var(--streak)' : 'var(--accent)',
                    border: 'none', color: sentMap[champ.clan_id] ? '#0A0A0A' : '#F2ECE2',
                    fontSize: 11, letterSpacing: 2.5, fontWeight: 700,
                    cursor: (sentMap[champ.clan_id] || busyId === champ.clan_id) ? 'default' : 'pointer',
                    opacity: busyId === champ.clan_id ? 0.6 : 1,
                  }}
                >
                  {sentMap[champ.clan_id] ? '✓ CHALLENGE SENT' : busyId === champ.clan_id ? 'SENDING…' : '⚔ CHALLENGE THE THRONE'}
                </button>
              )}
              {champ.is_yours && (
                <div className="mono uppercase" style={{
                  marginTop: 10, padding: '8px 10px', textAlign: 'center',
                  background: 'var(--streak-dim)', border: '1px solid var(--streak)',
                  fontSize: 10, letterSpacing: 2, color: 'var(--streak)',
                }}>
                  ♛ YOUR CREW HOLDS THE CROWN
                </div>
              )}
            </div>
          )}

          {/* CONTENDER LIST */}
          {contenders.length > 0 && (
            <>
              <div className="mono uppercase" style={{
                fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 6,
              }}>
                CONTENDERS · TOP {contenders.length}
              </div>
              {contenders.map(r => {
                const isSent = !!sentMap[r.clan_id];
                const busy = busyId === r.clan_id;
                const mine = r.is_yours;
                return (
                  <div key={r.clan_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: mine ? 'var(--accent-dim)' : 'var(--bg-2)',
                    border: `1px solid ${mine ? 'var(--accent)' : 'var(--border)'}`,
                    marginBottom: 4,
                  }}>
                    <div className="display" style={{
                      width: 26, fontSize: 14,
                      color: 'var(--text-mute)', textAlign: 'center',
                    }}>{r.rank}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name}{r.tag && <span className="mono" style={{ fontSize: 9, color: 'var(--streak)', marginLeft: 4 }}>[{r.tag}]</span>}
                        {mine && <span className="mono" style={{ fontSize: 9, color: 'var(--accent)', marginLeft: 6 }}>· YOU</span>}
                      </div>
                      <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 1 }}>
                        {r.member_count} · PR {r.total_pr} · AVG {r.avg_pr}
                      </div>
                    </div>
                    {!mine && yourClanId && (
                      <button
                        onClick={() => onChallenge && onChallenge(r)}
                        disabled={isSent || busy}
                        className="mono uppercase"
                        style={{
                          padding: '6px 10px',
                          background: isSent ? 'var(--streak)' : 'transparent',
                          border: `1px solid ${isSent ? 'var(--streak)' : 'var(--accent)'}`,
                          color: isSent ? '#0A0A0A' : 'var(--accent)',
                          fontSize: 9, letterSpacing: 1.5, fontWeight: 700,
                          cursor: (isSent || busy) ? 'default' : 'pointer',
                          opacity: busy ? 0.6 : 1,
                        }}
                      >{isSent ? 'SENT' : busy ? '...' : 'CHALLENGE'}</button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <div className="mono" style={{
            marginTop: 14, padding: 10,
            background: 'var(--bg-2)', border: '1px dashed var(--border-2)',
            fontSize: 10, color: 'var(--text-mute)', letterSpacing: 1.2, lineHeight: 1.5,
          }}>
            CHALLENGES ARE OPEN ANYTIME. ROSTER LOCKS ON ACCEPT · 7 DAYS.
            <br/>IN CLASS: RAW REPS WIN. CROSS CLASS: % OF PR (CAP 100%).
          </div>
        </div>
      </div>
    </div>
  );
}

// DRAFT — tier-matched 1v1.
// In-class: opponent within ±10% of your PR total → raw reps wins.
// Cross-class: auto-switches to % of PR scoring (effort scored, cap 1.0).
// THE BATTLE — 1v1 duels + crew-vs-crew challenges.
// Replaces the old Draft screen which pulled from an empty client-side seed
// (that's why real people like Dano never appeared). We now hit two live
// RPCs: list_battle_opponents() for individuals and list_battle_crews()
// for crew matchmaking. Everyone with a PR is always available — battles
// are asynchronous 7-day windows, no one needs to be "online."
function BattleScreen({ state, go }) {
  const yourPR = prSum(state.bests);
  const api = window.api;
  const apiOk = !!(api && api.enabled);

  const [tab, setTab] = useState('solo');              // 'solo' | 'crew' | 'regional'
  const [mode, setMode] = useState('all');             // all | inclass | effort (solo only)
  const [bracketOnly, setBracketOnly] = useState(false); // solo bracket filter
  const [opponents, setOpponents] = useState(null);    // null = loading, [] = empty
  const [crews, setCrews] = useState(null);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState({});                // { [userId|clanId]: true }
  const [sending, setSending] = useState(null);

  // REGIONAL MAP state — one champ-per-state payload + the currently-open
  // state's full ladder modal.
  const [champsByState, setChampsByState] = useState({});
  const [pickedState, setPickedState] = useState(null);
  const [ladderRows, setLadderRows] = useState(null);
  const [ladderLoading, setLadderLoading] = useState(false);

  const loadSolo = async () => {
    setErr('');
    if (!apiOk) { setOpponents([]); return; }
    const { data, error } = await api.listBattleOpponents({
      bracket: bracketOnly ? (state.ageBracket || null) : null,
      limit: 50,
    });
    if (error) { setErr(error.message || 'Could not load opponents.'); setOpponents([]); return; }
    setOpponents(Array.isArray(data) ? data : []);
  };

  const loadCrews = async () => {
    setErr('');
    if (!apiOk) { setCrews([]); return; }
    const { data, error } = await api.listBattleCrews({ limit: 20 });
    if (error) { setErr(error.message || 'Could not load crews.'); setCrews([]); return; }
    setCrews(Array.isArray(data) ? data : []);
  };

  const loadChamps = async () => {
    setErr('');
    if (!apiOk) { setChampsByState({}); return; }
    const { data, error } = await api.mapStateChamps();
    if (error) { setErr(error.message || 'Could not load champs.'); return; }
    const map = {};
    (Array.isArray(data) ? data : []).forEach(r => { if (r.state_code) map[r.state_code] = r; });
    setChampsByState(map);
  };

  const loadLadder = async (abbr) => {
    setLadderRows(null);
    setLadderLoading(true);
    if (!apiOk) { setLadderLoading(false); setLadderRows([]); return; }
    const { data, error } = await api.listStateCrewLadder({ state: abbr, limit: 10 });
    setLadderLoading(false);
    if (error) { setErr(error.message || 'Could not load ladder.'); setLadderRows([]); return; }
    setLadderRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (tab === 'solo')         loadSolo();
    else if (tab === 'crew')    loadCrews();
    else if (tab === 'regional') loadChamps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bracketOnly]);

  // When the user taps a state, fetch its ladder.
  useEffect(() => {
    if (pickedState) loadLadder(pickedState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedState]);

  // Shape the solo pool with in-class / cross-class flags against your PR.
  const soloPool = (opponents || []).map(p => {
    const theirPR = p.pr_total || 0;
    const inClass = draftInClass(yourPR, theirPR, 0.10);
    return { ...p, theirPR, inClass };
  });
  const soloFiltered = mode === 'inclass' ? soloPool.filter(p => p.inClass)
                     : mode === 'effort'  ? soloPool.filter(p => !p.inClass)
                     : soloPool;

  // Challenge action: piggy-back on send_rally with a distinct ⚔ prefix.
  // Their inbox gets it instantly; rally-fanout will push within 24h.
  const challenge = async (p) => {
    if (!apiOk || sent[p.user_id] || sending) return;
    setSending(p.user_id);
    try {
      const msg = `⚔ Challenged to 7 days. Movement over ego.`;
      const { error } = await api.sendRally(p.user_id, msg, 7);
      if (error) { setErr(error.message || 'Could not send.'); return; }
      setSent(s => ({ ...s, [p.user_id]: true }));
    } finally {
      setSending(null);
    }
  };

  const challengeCrew = async (c) => {
    if (!apiOk || sent[c.clan_id] || sending) return;
    // Real crew-vs-crew booking needs leader ack from both sides; for now
    // we ping whoever's the other crew's leader with a challenge rally.
    setSending(c.clan_id);
    try {
      // We don't have a "leader of X clan" RPC, but the crew_members table
      // is readable; pull the leader client-side.
      const { data, error } = await api.client
        .from('clan_members')
        .select('user_id, role')
        .eq('clan_id', c.clan_id)
        .eq('role', 'leader')
        .limit(1)
        .maybeSingle();
      if (error || !data) { setErr('Could not reach that crew\'s leader.'); return; }
      const msg = `⚔ ${(state.clanName || 'A crew').toUpperCase()} wants a 7-day crew battle.`;
      const res = await api.sendRally(data.user_id, msg, 7);
      if (res?.error) { setErr(res.error.message || 'Could not send.'); return; }
      setSent(s => ({ ...s, [c.clan_id]: true }));
    } finally {
      setSending(null);
    }
  };

  return (
    <Shell>
      <TopBar left={<IconBtn onClick={() => go('home')}>←</IconBtn>} title="THE BATTLE" sub="7-DAY DUEL · SOLO OR CREW" />
      <HazardBar height={4} />
      <div style={{ padding: 20, flex: 1 }}>
        <div className="display" style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>PICK YOUR<br/>FIGHT.</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.4 }}>
          Everyone with a PR is always available. Battles are 7-day async windows —
          no one has to be online. In class (±10% PR): raw reps wins.
          Cross class: highest <span style={{ color: 'var(--accent)' }}>% of your own PR</span> wins.
        </div>

        {/* TAB SWITCH */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {[
            { id: 'solo',     l: '1v1' },
            { id: 'crew',     l: 'CREW' },
            { id: 'regional', l: 'MAP' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="mono uppercase" style={{
              flex: 1, padding: '10px 0',
              background: tab === t.id ? 'var(--accent)' : 'var(--card)',
              border: `1px solid ${tab === t.id ? 'var(--accent)' : 'var(--border)'}`,
              color: tab === t.id ? '#0A0A0A' : 'var(--text-dim)',
              fontSize: 11, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
            }}>{t.l}</button>
          ))}
        </div>

        {err && (
          <div className="mono" style={{
            padding: '8px 10px', marginBottom: 10,
            background: '#1F0D0D', border: '1px solid #5A1F1F', color: '#FF9B8A',
            fontSize: 10, letterSpacing: 1,
          }}>{err}</div>
        )}

        {!apiOk && (
          <div className="mono" style={{
            padding: '12px', marginBottom: 10,
            background: 'var(--bg-2)', border: '1px dashed var(--border-2)', color: 'var(--text-mute)',
            fontSize: 11, letterSpacing: 1, lineHeight: 1.5, textAlign: 'center',
          }}>
            SIGN IN TO SEE REAL OPPONENTS.
          </div>
        )}

        {/* ============= SOLO TAB ============= */}
        {tab === 'solo' && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {[
                { id: 'all',     l: 'ALL' },
                { id: 'inclass', l: 'IN CLASS' },
                { id: 'effort',  l: 'CROSS CLASS' },
              ].map(t => (
                <button key={t.id} onClick={() => setMode(t.id)} className="mono uppercase" style={{
                  flex: 1, padding: '8px 0',
                  background: mode === t.id ? 'var(--streak-dim)' : 'var(--card)',
                  border: `1px solid ${mode === t.id ? 'var(--streak)' : 'var(--border)'}`,
                  color: mode === t.id ? 'var(--streak)' : 'var(--text-dim)',
                  fontSize: 10, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
                }}>{t.l}</button>
              ))}
            </div>

            <label className="mono uppercase" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 10, letterSpacing: 1.5, color: 'var(--text-mute)',
              marginBottom: 10, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={bracketOnly}
                onChange={(e) => setBracketOnly(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
                disabled={!state.ageBracket}
              />
              MY BRACKET ONLY {state.ageBracket ? `(${state.ageBracket})` : '(SET BRACKET FIRST)'}
            </label>

            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 10 }}>
              YOUR PR TOTAL · {yourPR || '—'}
            </div>

            {opponents === null && (
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: '20px 14px', textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>LOADING OPPONENTS…</div>
              </div>
            )}

            {opponents && soloFiltered.length === 0 && (
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: '20px 14px', textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {opponents.length === 0
                    ? 'NO OPPONENTS YET.\nINVITE SOMEONE AND PICK A FIGHT.'
                    : 'NO OPPONENTS IN THIS BAND.\nTRY ANOTHER FILTER.'}
                </div>
              </div>
            )}

            {soloFiltered.map(p => {
              const isSent = !!sent[p.user_id];
              const busy = sending === p.user_id;
              const scoreMode = p.inClass ? 'RAW REPS' : '% OF PR';
              return (
                <div key={p.user_id} style={{ background: 'var(--card)', border: `1px solid ${isSent ? 'var(--streak)' : 'var(--border)'}`, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="display" style={{
                      width: 44, height: 44, background: 'var(--accent-dim)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>{(p.display_name || p.username || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{p.display_name || p.username}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>
                        {(p.city || p.region_state || '—')} · PR {p.theirPR} · {p.current_streak || 0}d
                      </div>
                    </div>
                    <button
                      onClick={() => challenge(p)}
                      disabled={isSent || busy}
                      className="mono uppercase"
                      style={{
                        padding: '8px 12px',
                        background: isSent ? 'var(--streak)' : 'transparent',
                        border: `1px solid ${isSent ? 'var(--streak)' : 'var(--accent)'}`,
                        color: isSent ? '#0A0A0A' : 'var(--accent)',
                        fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
                        cursor: (isSent || busy) ? 'default' : 'pointer',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >{isSent ? 'CHALLENGED' : busy ? '...' : 'CHALLENGE'}</button>
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
          </>
        )}

        {/* ============= CREW TAB ============= */}
        {tab === 'crew' && (
          <>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 10, lineHeight: 1.5 }}>
              CREW vs CREW · 7 DAYS · SUMMED EFFORT. Your crew: <span style={{ color: state.clanName ? 'var(--accent)' : 'var(--text-mute)' }}>{(state.clanName || 'NONE').toUpperCase()}</span>
            </div>

            {!state.clanId && (
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: '14px', marginBottom: 10, textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                  JOIN A CREW FIRST.
                </div>
                <button onClick={() => go('clan-entry')} className="mono uppercase" style={{
                  marginTop: 8, padding: '8px 14px',
                  background: 'var(--accent)', border: 'none', color: '#F2ECE2',
                  fontSize: 10, letterSpacing: 2, fontWeight: 700, cursor: 'pointer',
                }}>FIND CREW</button>
              </div>
            )}

            {crews === null && (
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: '20px 14px', textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>LOADING CREWS…</div>
              </div>
            )}

            {crews && crews.length === 0 && (
              <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border-2)', padding: '20px 14px', textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', whiteSpace: 'pre-line' }}>
                  NO OTHER PUBLIC CREWS YET.
                </div>
              </div>
            )}

            {(crews || []).map(c => {
              const isSent = !!sent[c.clan_id];
              const busy = sending === c.clan_id;
              return (
                <div key={c.clan_id} style={{ background: 'var(--card)', border: `1px solid ${isSent ? 'var(--streak)' : 'var(--border)'}`, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="display" style={{
                      width: 44, height: 44, background: 'var(--accent-dim)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>◆</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {c.name} {c.tag && <span className="mono" style={{ color: 'var(--streak)', fontSize: 10, marginLeft: 4 }}>[{c.tag}]</span>}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>
                        {c.member_count} · TOTAL PR {c.total_pr} · AVG {c.avg_pr} · {c.active_today} TODAY
                      </div>
                    </div>
                    <button
                      onClick={() => challengeCrew(c)}
                      disabled={isSent || busy || !state.clanId}
                      className="mono uppercase"
                      style={{
                        padding: '8px 12px',
                        background: isSent ? 'var(--streak)' : 'transparent',
                        border: `1px solid ${isSent ? 'var(--streak)' : state.clanId ? 'var(--accent)' : 'var(--border-2)'}`,
                        color: isSent ? '#0A0A0A' : state.clanId ? 'var(--accent)' : 'var(--text-mute)',
                        fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
                        cursor: (isSent || busy || !state.clanId) ? 'default' : 'pointer',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >{isSent ? 'SENT' : busy ? '...' : 'CHALLENGE'}</button>
                  </div>
                  {c.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.4 }}>
                      {c.description}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ============= REGIONAL MAP TAB ============= */}
        {tab === 'regional' && (
          <>
            <StateMap
              myState={state.regionState || null}
              champsByState={champsByState}
              onPick={(abbr) => setPickedState(abbr)}
            />
            {Object.keys(champsByState).length === 0 && apiOk && (
              <div className="mono" style={{
                padding: 10, fontSize: 10, color: 'var(--text-mute)',
                letterSpacing: 1.5, textAlign: 'center',
              }}>
                NO STATES CLAIMED YET · BE THE FIRST CREW IN YOUR STATE TO HOIST THE GOLD DOT
              </div>
            )}
          </>
        )}

        {/* 3D modal overlay — lives above all tabs */}
        {pickedState && (
          <StateChampModal
            abbr={pickedState}
            rows={ladderRows}
            loading={ladderLoading}
            yourClanId={state.clanId}
            onClose={() => { setPickedState(null); setLadderRows(null); }}
            onChallenge={(crewLike) => {
              // Reuse challengeCrew — it expects { clan_id } shape which ladder rows have.
              challengeCrew(crewLike);
            }}
            sentMap={sent}
            busyId={sending}
          />
        )}

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

// Back-compat alias so existing routes/calls keep working.
const DraftScreen = BattleScreen;

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

Object.assign(window, { CalendarScreen, MaxCardScreen, LeaderboardScreen, BattleScreen, DraftScreen, NightScreen, KickoffScreen, StateMap, StateChampModal });
