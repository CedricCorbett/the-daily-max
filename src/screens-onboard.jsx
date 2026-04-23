// ONBOARDING — 6-step flow for first-run dads. Sets name, city, bracket, bar, modifier, spouse.

function OnboardScreen({ state, setState, go }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.name || '');
  const [city, setCity] = useState(state.city || '');
  const [bracket, setBracket] = useState(state.ageBracket || '40s');
  const [hasBar, setHasBar] = useState(state.hasBar);
  const [modifier, setModifier] = useState(state.modifier || 'none');
  const [spouse, setSpouse] = useState(state.spouse || '');

  const steps = [
    { id: 'name',    canNext: name.trim().length > 0 },
    { id: 'where',   canNext: city.trim().length > 0 && !!bracket },
    { id: 'bar',     canNext: hasBar !== null },
    { id: 'context', canNext: !!modifier },
    { id: 'spouse',  canNext: true }, // optional
    { id: 'oath',    canNext: true },
  ];
  const current = steps[step];

  const finish = () => {
    setState(s => ({
      ...s,
      firstRun: false,
      name: name.trim(),
      city: city.trim(),
      ageBracket: bracket,
      hasBar,
      modifier,
      spouse,
      streak: 0,
    }));
    go('home');
  };

  const next = () => {
    if (!current.canNext) return;
    if (step === steps.length - 1) finish();
    else setStep(s => s + 1);
  };
  const back = () => {
    if (step === 0) return;
    setStep(s => s - 1);
  };

  return (
    <Shell bg="var(--bg)">
      {/* Progress */}
      <div style={{ display: 'flex', gap: 3, padding: '14px 20px 0' }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3,
            background: i <= step ? 'var(--accent)' : 'var(--border)',
          }} />
        ))}
      </div>
      <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={back} disabled={step === 0} className="mono uppercase" style={{
          background: 'transparent', border: 'none',
          color: step === 0 ? 'transparent' : 'var(--text-mute)',
          fontSize: 11, letterSpacing: 2, cursor: step === 0 ? 'default' : 'pointer',
          padding: 4,
        }}>← BACK</button>
        <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 3, color: 'var(--text-mute)' }}>
          {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
        </div>
        <div style={{ width: 48 }} />
      </div>

      <div style={{ padding: '16px 24px 120px', flex: 1, overflowY: 'auto' }}>

        {current.id === 'name' && (
          <div style={{ animation: 'fade-up 0.35s ease-out' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STEP 1 · WHO</div>
            <div className="display" style={{ fontSize: 42, lineHeight: 1, marginTop: 10, letterSpacing: '-0.03em' }}>
              WHAT DO<br/>THEY CALL YOU?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.5 }}>
              First name, nickname, whatever shows up on the Dad Card.
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="Your name"
              style={{
                width: '100%', marginTop: 28, padding: '16px 14px',
                background: 'var(--card)', border: '1px solid var(--border-2)',
                color: 'var(--text)', fontSize: 18,
                fontFamily: 'Archivo Black, sans-serif', letterSpacing: 1,
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && name.trim() && next()}
            />
          </div>
        )}

        {current.id === 'where' && (
          <div style={{ animation: 'fade-up 0.35s ease-out' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STEP 2 · WHERE & WHEN</div>
            <div className="display" style={{ fontSize: 40, lineHeight: 1, marginTop: 10 }}>
              YOUR CITY.<br/>YOUR DECADE.
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.5 }}>
              Puts you in the right bracket and city chart. Leaderboard stuff.
            </div>

            <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-dim)', marginTop: 26, marginBottom: 8 }}>CITY</div>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="City or metro"
              style={{
                width: '100%', padding: '14px',
                background: 'var(--card)', border: '1px solid var(--border-2)',
                color: 'var(--text)', fontSize: 16, outline: 'none',
              }}
            />

            <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-dim)', marginTop: 22, marginBottom: 8 }}>DECADE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
              {['20s', '30s', '40s', '50s'].map(b => (
                <button key={b} onClick={() => setBracket(b)} style={{
                  padding: '14px 6px',
                  background: bracket === b ? 'var(--accent)' : 'var(--card)',
                  border: `1px solid ${bracket === b ? 'var(--accent)' : 'var(--border-2)'}`,
                  color: bracket === b ? '#0A0A0A' : 'var(--text)',
                  fontFamily: 'Archivo Black', fontSize: 16, letterSpacing: 1,
                  cursor: 'pointer',
                }}>{b}</button>
              ))}
            </div>
          </div>
        )}

        {current.id === 'bar' && (
          <div style={{ animation: 'fade-up 0.35s ease-out' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STEP 3 · THE PULL-UP QUESTION</div>
            <div className="display" style={{ fontSize: 40, lineHeight: 1, marginTop: 10 }}>
              DO YOU HAVE<br/>A PULL-UP BAR?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.5 }}>
              No judgment. If not, we swap station 4 for door-frame rows. Same muscles. No ceiling mount.
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 28 }}>
              {[
                { v: true,  t: 'YES, I HAVE ONE',          s: 'Doorway or home gym — we\'ll use it.' },
                { v: false, t: 'NO — SWAP TO DOOR ROWS',   s: 'Towel over a solid door. Works.' },
              ].map(opt => (
                <button key={String(opt.v)} onClick={() => setHasBar(opt.v)} style={{
                  padding: '18px 16px',
                  background: hasBar === opt.v ? 'var(--accent-dim)' : 'var(--card)',
                  border: `1px solid ${hasBar === opt.v ? 'var(--accent)' : 'var(--border-2)'}`,
                  textAlign: 'left', cursor: 'pointer', color: 'var(--text)',
                }}>
                  <div className="display" style={{ fontSize: 16, letterSpacing: 1, color: hasBar === opt.v ? 'var(--accent)' : 'var(--text)' }}>{opt.t}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 4 }}>{opt.s}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {current.id === 'context' && (
          <div style={{ animation: 'fade-up 0.35s ease-out' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STEP 4 · MEET YOU WHERE YOU ARE</div>
            <div className="display" style={{ fontSize: 38, lineHeight: 1, marginTop: 10 }}>
              PICK YOUR<br/>STARTING CONTEXT.
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.5 }}>
              Changes every station's variant. You can switch daily.
            </div>

            <div style={{ display: 'grid', gap: 6, marginTop: 24 }}>
              {[
                { id: 'none',  t: 'STANDARD',   s: 'Healthy, reasonable fitness. Default.' },
                { id: 'back',  t: 'BACK-OK',    s: 'Tweaky back? Wall push-ups, wall sits, dead bug.' },
                { id: 'hotel', t: 'HOTEL',      s: 'No floor space, no bar. Countertop + towel.' },
                { id: 'kid',   t: 'DAD + KID',  s: 'Toddler on the back. Laugh through it.' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setModifier(opt.id)} style={{
                  padding: '14px',
                  background: modifier === opt.id ? 'var(--accent-dim)' : 'var(--card)',
                  border: `1px solid ${modifier === opt.id ? 'var(--accent)' : 'var(--border-2)'}`,
                  textAlign: 'left', cursor: 'pointer', color: 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: modifier === opt.id ? 'var(--accent)' : 'transparent',
                    border: `2px solid ${modifier === opt.id ? 'var(--accent)' : 'var(--border-2)'}`,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div className="display" style={{ fontSize: 14, letterSpacing: 1 }}>{opt.t}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2 }}>{opt.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {current.id === 'spouse' && (
          <div style={{ animation: 'fade-up 0.35s ease-out' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STEP 5 · OPTIONAL BUT EFFECTIVE</div>
            <div className="display" style={{ fontSize: 40, lineHeight: 1, marginTop: 10 }}>
              ACCOUNTABILITY<br/>WITH TEETH.
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 10, lineHeight: 1.55 }}>
              If you break a streak, we text your partner a heads-up. It's just one line. You can turn it off anytime.
            </div>

            <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-dim)', marginTop: 26, marginBottom: 8 }}>
              PARTNER'S NAME OR NUMBER
            </div>
            <input
              value={spouse}
              onChange={e => setSpouse(e.target.value)}
              placeholder="Optional · e.g. Sarah or 555-0100"
              style={{
                width: '100%', padding: '14px',
                background: 'var(--card)', border: '1px solid var(--border-2)',
                color: 'var(--text)', fontSize: 16, outline: 'none',
              }}
            />
            <div style={{
              marginTop: 14, padding: '10px 12px',
              background: 'var(--bg-2)', border: '1px dashed var(--border-2)',
            }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Sample text: "Hey — {name || 'your dad'} just broke a streak on THE DAILY MAX. A little nudge goes a long way."
              </div>
            </div>
            <button onClick={() => { setSpouse(''); next(); }} className="mono uppercase" style={{
              marginTop: 14, background: 'transparent', border: 'none',
              color: 'var(--text-mute)', fontSize: 11, letterSpacing: 2, cursor: 'pointer',
              padding: '8px 0', textDecoration: 'underline',
            }}>SKIP FOR NOW</button>
          </div>
        )}

        {current.id === 'oath' && (
          <div style={{ animation: 'fade-up 0.35s ease-out' }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--accent)' }}>STEP 6 · THE ONLY RULE</div>
            <div className="display" style={{ fontSize: 44, lineHeight: 0.95, marginTop: 10 }}>
              SIX<br/>MINUTES.<br/>EVERY DAY.
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mute)', marginTop: 14, lineHeight: 1.6 }}>
              Four stations. Max reps in 75 seconds each. That's the whole app.
              Don't break the chain. {spouse ? `${spouse} knows.` : 'Your crew shows up when you do.'}
            </div>

            <div style={{ marginTop: 24, padding: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--streak)' }}>YOUR SETUP</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                <OathRow k="NAME"    v={name} />
                <OathRow k="CITY"    v={`${city} · ${bracket}`} />
                <OathRow k="BAR"     v={hasBar ? 'Yes — standard pull-ups' : 'No — door-frame rows'} />
                <OathRow k="CONTEXT" v={{none:'Standard',back:'Back-OK',hotel:'Hotel',kid:'Dad+Kid'}[modifier]} />
                <OathRow k="PARTNER" v={spouse || 'Not set'} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 20px 24px',
        background: 'linear-gradient(to top, #0A0A0A 70%, rgba(10,10,10,0))',
      }}>
        <PrimaryBtn onClick={next} disabled={!current.canNext}>
          {step === steps.length - 1 ? 'TAKE THE OATH →' : 'NEXT →'}
        </PrimaryBtn>
      </div>
    </Shell>
  );
}

function OathRow({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-mute)' }}>{k}</div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{v}</div>
    </div>
  );
}

Object.assign(window, { OnboardScreen });
