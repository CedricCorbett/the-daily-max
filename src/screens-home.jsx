// HOME screen — consolidated layout + forge score + calendar entry + break-reason modal

function HomeScreen({ state, setState, go, openTweaks }) {
  const today = todayET();
  const doneToday = state.today && state.today.date === today;
  const line = useMemo(() => voiceLine('morning', state.streak, state.voice), [state.streak, state.voice, today]);
  const nightUnlocked = state.streak >= 7;
  const voiceCode = pickVoice(state.streak, state.voice);
  const su = useMemo(() => showedUpScore(state.history, state.bests), [state.history, state.bests]);

  // Break-reason modal: show once after a streak break (no entry yesterday, and onRally is true)
  const [showBreakModal, setShowBreakModal] = useState(() => {
    return !!state.onRally && !state.breakReasonLogged;
  });
  const [breakReason, setBreakReason] = useState('');

  const submitBreakReason = (reason) => {
    // Optimistic — close modal + mark local state immediately so the user never
    // sees a spinner on a confessional screen. Fire the server call in the
    // background; if it fails, we silently leave the local flag so the modal
    // doesn't re-open (rally_board already has the user listed via streak-sweep).
    setState(s => ({ ...s, breakReasonLogged: true, lastBreakReason: reason }));
    setShowBreakModal(false);
    const api = window.api;
    if (api && api.enabled) {
      api.postBreakReason({ reason }).catch(() => {});
    }
  };

  // Collapsible context row
  const [ctxOpen, setCtxOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const modeLabel = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }[state.mode];
  const ctxLabel = { none: 'STANDARD', hotel: 'HOTEL', kid: 'KID', back: 'BACK-OK' }[state.modifier];

  return (
    <Shell>
      <TopBar
        left={<IconBtn onClick={openTweaks}>≡</IconBtn>}
        title={`HELLO, ${(state.name || state.username || '').toUpperCase() || 'FRIEND'}`}
        sub={`${(state.city || '').toUpperCase()}${state.city ? ' · ' : ''}${state.ageBracket || ''}${state.ageBracket ? ' BRACKET' : ''}`.trim() || (state.clanName ? `CREW · ${state.clanName.toUpperCase()}` : '')}
        right={<IconBtn onClick={() => go('leaderboard')}>🏆</IconBtn>}
      />
      <HazardBar height={4} />

      <div style={{ padding: '20px 20px 40px', flex: 1 }}>

        {/* STREAK HERO */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          padding: '22px 20px', position: 'relative', overflow: 'hidden',
          marginBottom: 14, cursor: 'pointer',
        }} onClick={() => go('calendar')}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 6, background: state.streak > 0 ? 'var(--streak)' : 'var(--border-2)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--text-mute)' }}>CURRENT STREAK</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 6 }}>
                <BigNum n={state.streak} unit="DAYS" color="var(--streak)" size={64} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>SHOWED UP</div>
              <div className="display" style={{ fontSize: 28, color: su >= 5 ? 'var(--streak)' : 'var(--text)', lineHeight: 1, marginTop: 4 }}>
                {su}<span className="mono" style={{ fontSize: 15, color: 'var(--text-mute)' }}> / 7</span>
              </div>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 2 }}>LAST 7 DAYS</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Cycle14Bar
              history={state.history.concat(state.today && state.today.date === today ? [state.today] : [])}
              cycleStart={state.cycleStart}
            />
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)' }}>
              BEST {state.bestStreak}d · LIFETIME {state.totalReps.toLocaleString()}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              VIEW CALENDAR →
            </div>
          </div>
          {state.streakInsurance > 0 && (
            <div className="mono uppercase" style={{
              marginTop: 10, padding: '6px 8px',
              background: 'var(--streak-dim)', border: '1px solid var(--streak)',
              color: 'var(--streak)', fontSize: 10, letterSpacing: 1.5,
              display: 'inline-block',
            }}>
              ◇ STREAK INSURANCE · {state.streakInsurance} SKIP{state.streakInsurance > 1 ? 'S' : ''} SAVED
            </div>
          )}
          <div className="mono" style={{ marginTop: 10, fontSize: 10, color: 'var(--text-mute)', letterSpacing: 1.5, lineHeight: 1.5 }}>
            TODAY'S MAX IS WHATEVER WAS IN YOU TODAY. THAT'S ENOUGH.
          </div>
        </div>

        {/* VOICE LINE */}
        <div style={{
          background: 'var(--bg-2)', borderLeft: '3px solid var(--accent)',
          padding: '12px 14px', marginBottom: 14,
        }}>
          <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--accent)', marginBottom: 4 }}>
            VOICE · {voiceLabel(voiceCode)}
          </div>
          <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.35, fontWeight: 500 }}>{line}</div>
        </div>

        {/* COMPACT MODE + CONTEXT ROW */}
        <button onClick={() => setCtxOpen(o => !o)} style={{
          width: '100%', padding: '12px 14px', background: 'var(--card)',
          border: '1px solid var(--border)', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'var(--text)', marginBottom: ctxOpen ? 0 : 14, textAlign: 'left',
        }}>
          <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--text-mute)' }}>TODAY'S MODE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{modeLabel} · {ctxLabel}</span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--text-mute)' }}>{ctxOpen ? '▲' : '▼'}</span>
          </div>
        </button>
        {ctxOpen && (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderTop: 'none', padding: 12, marginBottom: 14 }}>
            <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 6 }}>ENERGY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 10 }}>
              {[{id:'easy',l:'EASY'},{id:'medium',l:'MEDIUM'},{id:'hard',l:'HARD'}].map(m => (
                <button key={m.id} onClick={() => setState(s => ({ ...s, mode: m.id }))} style={{
                  padding: '10px 4px',
                  background: state.mode === m.id ? 'var(--accent)' : 'var(--card)',
                  border: `1px solid ${state.mode === m.id ? 'var(--accent)' : 'var(--border-2)'}`,
                  color: state.mode === m.id ? '#0A0A0A' : 'var(--text)',
                  fontFamily: 'Archivo Black', fontSize: 14, letterSpacing: 1,
                  cursor: 'pointer',
                }}>{m.l}</button>
              ))}
            </div>
            <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)', marginBottom: 6 }}>CONTEXT</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[{id:'none',l:'STANDARD'},{id:'hotel',l:'HOTEL'},{id:'kid',l:'KID'},{id:'back',l:'BACK-OK'}].map(m => (
                <Chip key={m.id} active={state.modifier === m.id} onClick={() => setState(s => ({ ...s, modifier: m.id }))}>
                  {m.l}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Push soft-prompt — one-shot, self-dismisses if already resolved */}
        <PushSoftPrompt />

        {/* PRIMARY CTA — start / review */}
        <div style={{ marginBottom: 14 }}>
          {doneToday ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ background: 'var(--streak-dim)', border: '1px solid var(--streak)', padding: '12px 16px', textAlign: 'center' }}>
                <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--streak)' }}>TODAY: LOGGED ✓</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {state.today.pushups}/{state.today.squats}/{state.today.hollow}s/{state.today.pullups} · Come back tomorrow.
                </div>
              </div>
              <PrimaryBtn onClick={() => go('share')} color="var(--bone)">SHARE MAX CARD →</PrimaryBtn>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <PrimaryBtn onClick={() => go('timer')}>START THE 6 →</PrimaryBtn>
              <button onClick={() => go('log')} className="mono uppercase" style={{
                width: '100%', padding: '14px 0', background: 'transparent',
                border: '1px solid var(--border-2)', color: 'var(--text-dim)',
                fontSize: 12, letterSpacing: 2, cursor: 'pointer',
              }}>ALREADY DID IT? QUICK LOG</button>
            </div>
          )}
          {/* HOW-TO always accessible, whether logged today or not. */}
          <button onClick={() => setHowOpen(true)} className="mono uppercase" style={{
            width: '100%', padding: '10px 0', marginTop: 6, background: 'transparent',
            border: '1px dashed var(--border-2)', color: 'var(--text-mute)',
            fontSize: 11, letterSpacing: 2.5, cursor: 'pointer',
          }}>◇ HOW TO DO THE DAILY MAX</button>
        </div>

        {/* TODAY'S 4 STATIONS PREVIEW */}
        <StationsPreview state={state} />

        {/* LIFETIME STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 14, marginBottom: 14 }}>
          {CORE_EXERCISES.map(ex => (
            <div key={ex.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '10px 8px' }}>
              <div className="mono uppercase" style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--text-mute)' }}>{ex.short} LIFE</div>
              <div className="display" style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1, marginTop: 4 }}>
                {(state.lifetimeBreakdown[ex.id] || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* NIGHT UNLOCK */}
        <button onClick={() => nightUnlocked && go('night')} style={{
          width: '100%', background: 'var(--bg-2)',
          border: `1px solid ${nightUnlocked ? 'var(--streak)' : 'var(--border)'}`,
          padding: '14px 16px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 12, cursor: nightUnlocked ? 'pointer' : 'default',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 22 }}>{nightUnlocked ? '🌙' : '🔒'}</div>
          <div style={{ flex: 1 }}>
            <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: nightUnlocked ? 'var(--streak)' : 'var(--text-mute)' }}>
              LIGHTS OUT MOBILITY
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>
              {nightUnlocked ? 'UNLOCKED · Four minutes before bed' : `Unlocks at streak 7 · ${7 - state.streak} days to go`}
            </div>
          </div>
        </button>

        {/* COMMUNITY ROW */}
        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2.5, color: 'var(--text-dim)', marginTop: 14, marginBottom: 8 }}>
          COMMUNITY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
          <CommunityTile
            onClick={() => go(state.clanIsSystem || !state.clanId ? 'clan-entry' : 'clan')}
            icon="◆"
            label={state.clanIsSystem || !state.clanId ? 'FIND CREW' : 'MY CREW'}
            sub={state.clanIsSystem || !state.clanId
              ? 'Join or create'
              : (state.clanName ? state.clanName.toUpperCase() : 'Open ops')}
          />
          <CommunityTile onClick={() => go('battle')} icon="⚔" label="BATTLE" sub="1v1 or crew vs crew" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <CommunityTile onClick={() => go('kickoff')} icon={`${Math.min(state.kickoffDay, 30)}/30`} label="KICKOFF 30" sub="30-day ramp" />
          <CommunityTile
            onClick={() => go('rally')}
            icon="✊"
            label="RALLY"
            sub={`${(state.rallyBoard || []).filter(d => !d.sentByYou).length} in`}
            accent={state.rallyInbox && state.rallyInbox.length > 0}
          />
        </div>

        {/* ELITES + TITANS BOARDS — lifetime climb. Progress bars show
            how close the user is to each per-station cutoff. Cleared
            stations glow in-tier. Titan thresholds = 2× Elite. */}
        <RankBoard
          title="ELITES"
          sub="LIFETIME · EARN THE TIER"
          accent="var(--streak)"
          accentBg="var(--streak-dim)"
          thresholds={ELITE_THRESHOLDS}
          lifetime={state.lifetimeBreakdown}
        />
        <RankBoard
          title="TITANS"
          sub="DOUBLE ELITE · LIFETIME"
          accent="var(--accent-2)"
          accentBg="var(--accent-dim)"
          thresholds={TITAN_THRESHOLDS}
          lifetime={state.lifetimeBreakdown}
        />

      </div>

      {/* BREAK-REASON MODAL */}
      {showBreakModal && (
        <BreakReasonModal
          name={state.name}
          onClose={() => setShowBreakModal(false)}
          onSubmit={submitBreakReason}
          breakReason={breakReason}
          setBreakReason={setBreakReason}
        />
      )}

      {howOpen && <HowToModal onClose={() => setHowOpen(false)} />}
    </Shell>
  );
}

// ELITE / TITAN board — one row per station, lifetime count vs cutoff.
// Cleared rows light the tier color with a ✓; in-progress rows show a
// neutral bar with percent climb. Lifetime values come from
// state.lifetimeBreakdown, which the log pipeline already maintains.
function RankBoard({ title, sub, accent, accentBg, thresholds, lifetime }) {
  const rows = CORE_EXERCISES.map(ex => {
    const count = (lifetime && lifetime[ex.id]) || 0;
    const goal  = thresholds[ex.id] || 0;
    const cleared = goal > 0 && count >= goal;
    const pct = goal > 0 ? Math.round(Math.min(1, count / goal) * 100) : 0;
    const unit = ex.unit === 'sec' ? 's' : '';
    return { ex, count, goal, cleared, pct, unit };
  });
  const clearedAll = rows.every(r => r.cleared);
  const clearedCount = rows.filter(r => r.cleared).length;

  return (
    <div style={{
      background: clearedAll ? accentBg : 'var(--card)',
      border: `1px solid ${clearedAll ? accent : 'var(--border)'}`,
      padding: 14, marginTop: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div className="display" style={{ fontSize: 18, letterSpacing: '0.02em', color: accent, lineHeight: 1 }}>
          {title}{clearedAll ? ' ★' : ''}
        </div>
        <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--text-mute)' }}>
          {clearedCount}/4 · {sub}
        </div>
      </div>
      {rows.map((r, i) => (
        <div key={r.ex.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 0',
          borderTop: i === 0 ? 'none' : '1px solid var(--border)',
        }}>
          <div className="mono uppercase" style={{ width: 58, fontSize: 12, letterSpacing: 1.5, color: 'var(--text-dim)', fontWeight: 700 }}>
            {r.ex.short}
          </div>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: `${r.pct}%`,
              background: r.cleared ? accent : 'var(--text-mute)',
              transition: 'width 220ms ease',
            }} />
          </div>
          <div className="mono" style={{
            width: 120, textAlign: 'right', fontSize: 12,
            color: r.cleared ? accent : 'var(--text)',
            fontWeight: r.cleared ? 700 : 400,
          }}>
            {r.count.toLocaleString()}{r.unit}
            <span style={{ color: 'var(--text-mute)' }}> / {r.goal.toLocaleString()}{r.unit}</span>
            {r.cleared && <span style={{ marginLeft: 4 }}>✓</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommunityTile({ onClick, icon, label, sub, accent }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--card)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      padding: '14px 8px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, minHeight: 86, color: 'var(--text)',
    }}>
      <div className="display" style={{ fontSize: 18, color: accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{icon}</div>
      <div className="mono" style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>{label}</div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', textAlign: 'center' }}>{sub}</div>
    </button>
  );
}

function StationsPreview({ state }) {
  const [info, setInfo] = useState(null);
  return (
    <>
      <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2.5, color: 'var(--text-dim)', marginBottom: 8 }}>
        TODAY · 4 STATIONS · 6-MIN GUIDE
      </div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {CORE_EXERCISES.map((ex, i) => {
          const exId = (ex.id === 'pullups' && state.hasBar === false) ? 'pullups' : ex.id;
          const isDoorRow = ex.id === 'pullups' && state.hasBar === false;
          const variant = isDoorRow
            ? VARIANTS.pullups.easy
            : VARIANTS[ex.id][state.modifier !== 'none' ? state.modifier : state.mode];
          return (
            <div key={ex.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div className="display" style={{
                width: 32, height: 32, background: 'var(--accent-dim)',
                color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{variant.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{variant.swap}</div>
              </div>
              <button onClick={() => setInfo(ex.id)} className="mono" style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg-2)', border: '1px solid var(--border-2)',
                color: 'var(--text-mute)', fontSize: 12, cursor: 'pointer',
                flexShrink: 0,
              }}>ⓘ</button>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)' }}>PB</div>
                <div className="display" style={{ fontSize: 18, color: 'var(--text)' }}>
                  {state.bests[ex.id] || 0}{ex.unit === 'sec' && <span className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginLeft: 2 }}>s</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {info && <ExerciseInfoModal exId={info} onClose={() => setInfo(null)} />}
    </>
  );
}

function ExerciseInfoModal({ exId, onClose }) {
  const ex = CORE_EXERCISES.find(e => e.id === exId);
  const cues = EXERCISE_CUES[exId];
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', zIndex: 40,
      animation: 'fade-up 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)',
        borderBottom: 'none', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)' }}>FORM CHECK</div>
            <div className="display" style={{ fontSize: 26, lineHeight: 1, marginTop: 4 }}>{ex.name}</div>
          </div>
          <button onClick={onClose} style={{
            width: 44, height: 44, background: 'var(--card)', border: '1px solid var(--border-2)',
            color: 'var(--text)', fontSize: 18, cursor: 'pointer',
          }}>×</button>
        </div>

        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)' }}>SETUP</div>
        <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 4, lineHeight: 1.45 }}>{cues.setup}</div>

        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)', marginTop: 14 }}>CUES</div>
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {cues.cues.map((c, i) => (
            <li key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginTop: 4 }}>{c}</li>
          ))}
        </ul>

        <div style={{
          marginTop: 14, padding: '10px 12px',
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
        }}>
          <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)' }}>DON'T</div>
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, lineHeight: 1.45 }}>{cues.mistake}</div>
        </div>
      </div>
    </div>
  );
}

function BreakReasonModal({ name, onClose, onSubmit, breakReason, setBreakReason }) {
  const chips = [
    { id: 'work',    t: 'WORK / TRAVEL' },
    { id: 'sick',    t: 'SICK' },
    { id: 'injured', t: 'INJURED' },
    { id: 'tired',   t: 'JUST OFF' },
    { id: 'family',  t: 'KIDS / FAMILY' },
    { id: 'other',   t: 'OTHER' },
  ];
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 40, padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 360, background: 'var(--bg)',
        border: '1px solid var(--accent)', padding: 20,
      }}>
        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STREAK PAUSED</div>
        <div className="display" style={{ fontSize: 26, lineHeight: 1, marginTop: 8 }}>WHAT HAPPENED?</div>
        <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 8, lineHeight: 1.5 }}>
          Honest. Short. We post it to the Rally Board so the crew knows how to nudge you back.
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
          {chips.map(c => (
            <button key={c.id} onClick={() => setBreakReason(c.id)} className="mono uppercase" style={{
              padding: '10px 12px',
              background: breakReason === c.id ? 'var(--accent)' : 'transparent',
              border: `1px solid ${breakReason === c.id ? 'var(--accent)' : 'var(--border-2)'}`,
              color: breakReason === c.id ? '#0A0A0A' : 'var(--text-dim)',
              fontSize: 11, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
            }}>{c.t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
          <button onClick={onClose} className="mono uppercase" style={{
            flex: 1, padding: 12, background: 'transparent',
            border: '1px solid var(--border-2)', color: 'var(--text-mute)',
            fontSize: 12, letterSpacing: 2, cursor: 'pointer',
          }}>SKIP</button>
          <button
            disabled={!breakReason}
            onClick={() => onSubmit(breakReason)}
            className="mono uppercase"
            style={{
              flex: 2, padding: 12,
              background: breakReason ? 'var(--accent)' : 'var(--card)',
              border: 'none',
              color: breakReason ? '#0A0A0A' : 'var(--text-mute)',
              fontSize: 12, letterSpacing: 2, fontWeight: 700,
              cursor: breakReason ? 'pointer' : 'default',
            }}>POST TO RALLY →</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, RankBoard });
