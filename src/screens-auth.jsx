// AUTH — sign in / sign up gate. Username or email + 6-digit PIN.
// Rotating mission phrases fade in/out on the header. First screen users see.
//
// Hooks into window.api.signUp / signIn (see api.jsx). If api.enabled is false
// (no Supabase env), clicking ENTER falls through into the app as a guest —
// useful in preview mode.

const AUTH_PHRASES = [
  "Form over ego.",
  "Show up for yourself.",
  "Commit to all you can today.",
  "Come back tomorrow.",
  "Your PR is the only bar.",
  "Cap yourself at you.",
  "Tired counts. Zero doesn't.",
  "Yesterday is paid.",
  "One set is still a day.",
  "The only person you outwork is yesterday-you.",
  "Show up for you.",
  "Partial reps are reps.",
  "Don't stack tomorrow.",
  "Small today is still today.",
];

// Trivial PINs rejected client-side. Server has no list; this is UX, not security.
const BANNED_PINS = (() => {
  const set = new Set([
    '000000','111111','222222','333333','444444','555555','666666','777777','888888','999999',
    '123456','234567','345678','456789','567890','012345',
    '654321','765432','876543','987654','098765','543210',
    '121212','123123','112233','123321','456654','789987',
    '101010','202020','303030','404040','505050','606060','707070','808080','909090',
  ]);
  for (let y = 1900; y <= 2030; y++) set.add('19' + String(y % 100).padStart(2, '0'));
  for (let y = 2000; y <= 2030; y++) set.add('20' + String(y % 100).padStart(2, '0'));
  return set;
})();

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','OTHER',
];

const AGE_BRACKETS = ['20s','30s','40s','50s','60+'];

function RotatingPhrase() {
  const [i, setI] = useState(() => Math.floor(Math.random() * AUTH_PHRASES.length));
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const fadeOut = setInterval(() => setVisible(false), 4500);
    return () => clearInterval(fadeOut);
  }, []);
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => {
      setI(prev => (prev + 1) % AUTH_PHRASES.length);
      setVisible(true);
    }, 500);
    return () => clearTimeout(t);
  }, [visible]);
  return (
    <div style={{
      minHeight: 22,
      fontSize: 12,
      letterSpacing: 2,
      textAlign: 'center',
      color: 'var(--gold, #C9A24A)',
      textTransform: 'uppercase',
      fontFamily: 'JetBrains Mono, monospace',
      opacity: visible ? 1 : 0,
      transition: 'opacity 500ms ease',
    }}>
      {AUTH_PHRASES[i]}
    </div>
  );
}

function PinInput({ value, onChange, autoFocus, ariaLabel }) {
  const inputRef = useRef(null);
  useEffect(() => { if (autoFocus && inputRef.current) inputRef.current.focus(); }, [autoFocus]);
  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        aria-label={ariaLabel || '6-digit PIN'}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        style={{
          width: '100%',
          padding: '18px 14px',
          background: '#150D0D',
          border: '1px solid var(--border, #2A1B1B)',
          color: 'var(--text, #F2ECE2)',
          fontSize: 28,
          letterSpacing: 18,
          textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          borderRadius: 0,
          outline: 'none',
        }}
      />
      <div style={{
        position: 'absolute', top: '50%', left: 14, right: 14,
        transform: 'translateY(-50%)',
        display: 'flex', justifyContent: 'space-around',
        pointerEvents: 'none',
        opacity: value.length === 0 ? 0.35 : 0,
        transition: 'opacity 200ms',
      }}>
        {[0,1,2,3,4,5].map(i => (
          <span key={i} style={{
            color: 'var(--text-mute, #8F857A)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 22,
          }}>•</span>
        ))}
      </div>
    </div>
  );
}

function AuthField({ label, value, onChange, placeholder, type = 'text', autoComplete }) {
  return (
    <div>
      <div className="mono uppercase" style={{
        fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          padding: '14px 12px',
          background: '#150D0D',
          border: '1px solid var(--border, #2A1B1B)',
          color: 'var(--text, #F2ECE2)',
          fontSize: 15,
          letterSpacing: 1,
          fontFamily: 'JetBrains Mono, monospace',
          borderRadius: 0,
          outline: 'none',
        }}
      />
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [handle, setHandle] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [regionState, setRegionState] = useState('');
  const [ageBracket, setAgeBracket] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const api = typeof window !== 'undefined' ? window.api : null;
  const apiEnabled = api && api.enabled;

  const resetMessages = () => { setErr(''); setInfo(''); };

  const validateSignup = () => {
    if (!handle.trim()) return 'Pick a username.';
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle.trim())) return 'Username: 3–20 letters, numbers, underscores.';
    if (handle.includes('@')) return "Username can't contain '@'.";
    if (pin.length !== 6) return 'PIN must be 6 digits.';
    if (BANNED_PINS.has(pin)) return 'Pick a less obvious PIN.';
    if (pin !== pin2) return "PINs don't match.";
    if (!recoveryEmail.trim()) return 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(recoveryEmail.trim())) return "That email doesn't look right.";
    if (!regionState) return 'Pick a state (or OTHER).';
    if (!ageBracket) return 'Pick an age bracket.';
    return null;
  };

  const submitSignIn = async () => {
    resetMessages();
    if (!handle.trim()) return setErr('Enter a username or email.');
    if (pin.length !== 6) return setErr('PIN must be 6 digits.');

    setBusy(true);
    try {
      if (!apiEnabled) {
        // Preview / offline mode — skip Supabase, just let them in.
        setInfo('Preview mode: entering as guest.');
        setTimeout(() => onAuthed({ guest: true }), 400);
        return;
      }
      const res = await api.signIn({ handle: handle.trim(), pin });
      if (res && res.lockedFor) {
        const mins = Math.ceil(res.lockedFor / 60);
        setErr(`Too many tries. Locked for ${mins} min.`);
      } else if (res && res.error) {
        setErr(res.error.message || 'Wrong username or PIN.');
      } else if (res && res.data && res.data.user) {
        onAuthed({ user: res.data.user });
      } else {
        setErr('Wrong username or PIN.');
      }
    } catch (e) {
      setErr(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async () => {
    resetMessages();
    const v = validateSignup();
    if (v) return setErr(v);

    setBusy(true);
    try {
      if (!apiEnabled) {
        setInfo('Preview mode: account creation skipped.');
        setTimeout(() => onAuthed({ guest: true, name: displayName || handle }), 400);
        return;
      }
      const res = await api.signUp({
        username: handle.trim(),
        pin,
        displayName: displayName.trim() || handle.trim(),
        email: recoveryEmail.trim(),
        regionState,
        ageBracket,
      });
      if (res && res.error) {
        setErr(res.error.message || "Couldn't create that account.");
      } else if (res && res.data && res.data.user) {
        onAuthed({ user: res.data.user, fresh: true });
      } else {
        setErr("Couldn't create that account.");
      }
    } catch (e) {
      setErr(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const onEnter = () => (mode === 'signin' ? submitSignIn() : submitSignUp());

  return (
    <Shell bg="var(--bg, #0A0707)">
      <div style={{ padding: '40px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="display" style={{
            fontSize: 34, letterSpacing: '-0.02em', lineHeight: 1,
            color: 'var(--text, #F2ECE2)', marginBottom: 14,
          }}>
            THE DAILY MAX
          </div>
          <HazardBar height={6} />
          <div style={{ marginTop: 16 }}>
            <RotatingPhrase />
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 22 }}>
          {[
            { id: 'signin', label: 'SIGN IN' },
            { id: 'signup', label: 'NEW HERE' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); resetMessages(); }}
              className="mono uppercase"
              style={{
                flex: 1, padding: '12px 0',
                background: mode === m.id ? 'var(--accent, #8B1A1A)' : 'transparent',
                border: `1px solid ${mode === m.id ? 'var(--accent, #8B1A1A)' : 'var(--border, #2A1B1B)'}`,
                color: mode === m.id ? '#F2ECE2' : 'var(--text-mute, #8F857A)',
                fontSize: 11, letterSpacing: 3, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gap: 14 }}>

          <AuthField
            label={mode === 'signin' ? 'USERNAME OR EMAIL' : 'USERNAME'}
            value={handle}
            onChange={setHandle}
            placeholder={mode === 'signin' ? 'cedric or you@mail.com' : 'pick a handle'}
            autoComplete={mode === 'signin' ? 'username' : 'off'}
          />

          <div>
            <div className="mono uppercase" style={{
              fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
            }}>
              6-DIGIT PIN
            </div>
            <PinInput value={pin} onChange={setPin} />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <div className="mono uppercase" style={{
                  fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
                }}>
                  CONFIRM PIN
                </div>
                <PinInput value={pin2} onChange={setPin2} ariaLabel="confirm 6-digit PIN" />
              </div>

              <AuthField
                label="DISPLAY NAME"
                value={displayName}
                onChange={setDisplayName}
                placeholder="what the crew sees"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div className="mono uppercase" style={{
                    fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
                  }}>
                    STATE
                  </div>
                  <select
                    value={regionState}
                    onChange={(e) => setRegionState(e.target.value)}
                    style={{
                      width: '100%', padding: '14px 12px',
                      background: '#150D0D',
                      border: '1px solid var(--border, #2A1B1B)',
                      color: 'var(--text, #F2ECE2)',
                      fontSize: 15,
                      fontFamily: 'JetBrains Mono, monospace',
                      borderRadius: 0, outline: 'none',
                    }}
                  >
                    <option value="">—</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mono uppercase" style={{
                    fontSize: 9, letterSpacing: 3, color: 'var(--text-mute, #8F857A)', marginBottom: 6,
                  }}>
                    AGE BRACKET
                  </div>
                  <select
                    value={ageBracket}
                    onChange={(e) => setAgeBracket(e.target.value)}
                    style={{
                      width: '100%', padding: '14px 12px',
                      background: '#150D0D',
                      border: '1px solid var(--border, #2A1B1B)',
                      color: 'var(--text, #F2ECE2)',
                      fontSize: 15,
                      fontFamily: 'JetBrains Mono, monospace',
                      borderRadius: 0, outline: 'none',
                    }}
                  >
                    <option value="">—</option>
                    {AGE_BRACKETS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <AuthField
                label="EMAIL"
                value={recoveryEmail}
                onChange={setRecoveryEmail}
                placeholder="you@mail.com"
                type="email"
                autoComplete="email"
              />
              <div className="mono" style={{
                fontSize: 10, color: 'var(--text-mute, #8F857A)', letterSpacing: 1, marginTop: -6,
              }}>
                Used for sign-in and PIN recovery. Kept private.
              </div>
            </>
          )}

          {err && (
            <div className="mono" style={{
              fontSize: 11, color: '#FF6B6B', letterSpacing: 1,
              padding: '10px 12px', border: '1px solid #5A1F1F', background: '#1F0D0D',
            }}>
              {err}
            </div>
          )}
          {info && (
            <div className="mono" style={{
              fontSize: 11, color: 'var(--gold, #C9A24A)', letterSpacing: 1,
            }}>
              {info}
            </div>
          )}

          <div style={{ marginTop: 4 }}>
            <PrimaryBtn onClick={onEnter} disabled={busy}>
              {busy ? '...' : mode === 'signin' ? 'ENTER' : 'CREATE ACCOUNT'}
            </PrimaryBtn>
          </div>

          {mode === 'signin' && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button
                onClick={() => setInfo('Forgot-PIN recovery is coming. For now, DM the crew to reset manually.')}
                className="mono uppercase"
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-mute, #8F857A)',
                  fontSize: 10, letterSpacing: 2, cursor: 'pointer',
                  padding: 6,
                }}
              >
                Forgot PIN?
              </button>
            </div>
          )}
        </div>

        {!apiEnabled && (
          <div className="mono" style={{
            marginTop: 'auto', paddingTop: 20, textAlign: 'center',
            fontSize: 9, letterSpacing: 2, color: 'var(--text-mute, #8F857A)',
          }}>
            PREVIEW MODE · SUPABASE NOT CONFIGURED
          </div>
        )}
      </div>
    </Shell>
  );
}

window.AuthScreen = AuthScreen;
