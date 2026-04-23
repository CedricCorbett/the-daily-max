// ENTRANCE screen — splash with logo + mantra tap-through before app

function EntranceScreen({ state, setState, go }) {
  const [phase, setPhase] = useState('logo'); // 'logo' → 'mantra' → auto-advances
  const mantra = useMemo(() => pickMantra(state.streak), [state.streak]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('mantra'), 1400);
    return () => clearTimeout(t1);
  }, []);

  const dismiss = () => {
    setState(s => ({ ...s, firstRun: false }));
    go('home');
  };

  return (
    <div className="screen" style={{
      background: 'radial-gradient(ellipse at 50% 20%, #1A0A0A 0%, #0A0707 60%, #050303 100%)',
      cursor: phase === 'mantra' ? 'pointer' : 'default',
      overflow: 'hidden',
    }} onClick={phase === 'mantra' ? dismiss : undefined}>

      {/* Top hazard stripe */}
      <div className="hazard-stripe" style={{ height: 5, width: '100%' }} />

      {/* film grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, mixBlendMode: 'screen',
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/><feColorMatrix values=\'0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\'/></svg>")',
      }} />

      {/* Emblem block — scales down in mantra phase */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: phase === 'logo' ? '42%' : '12%',
        transform: 'translateY(-50%)',
        transition: 'top 0.7s cubic-bezier(.22,1,.36,1)',
        textAlign: 'center',
      }}>
        <Emblem scale={phase === 'logo' ? 1 : 0.55} />
      </div>

      {/* Mantra */}
      {phase === 'mantra' && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '42%',
          padding: '0 32px', textAlign: 'center',
          animation: 'fade-up 0.6s cubic-bezier(.22,1,.36,1)',
        }}>
          <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 4, color: 'var(--streak)', marginBottom: 18 }}>
            ◇ MINDSET TAP ◇
          </div>
          <div className="display" style={{
            fontSize: 26, lineHeight: 1.15, color: 'var(--bone)', whiteSpace: 'pre-line', letterSpacing: '-0.01em',
          }}>
            {mantra.line}
          </div>
          {mantra.src && (
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--ash)', marginTop: 16 }}>
              — {mantra.src}
            </div>
          )}
        </div>
      )}

      {/* Bottom: streak/stats + tap hint */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 24px 28px',
      }}>
        {phase === 'mantra' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18, animation: 'fade-up 0.7s 0.15s both' }}>
              <MiniStat label="STREAK" value={state.streak} unit="D" color="var(--streak)" />
              <MiniStat label="TODAY" value="6" unit="MIN" color="var(--accent-2)" />
              <MiniStat label="LIFETIME" value={state.totalReps.toLocaleString()} unit="" color="var(--bone)" />
            </div>
            <button onClick={dismiss} style={{
              width: '100%', padding: '18px 0',
              background: 'transparent',
              border: '1px solid var(--streak)',
              color: 'var(--streak)',
              fontFamily: 'Archivo Black, sans-serif',
              fontSize: 14, letterSpacing: 4,
              cursor: 'pointer',
              animation: 'fade-up 0.7s 0.3s both, crosshair 2.4s 1.2s infinite',
            }}>TAP TO ENTER ◇</button>
            <div className="mono uppercase" style={{
              fontSize: 9, letterSpacing: 3, color: 'var(--text-mute)',
              textAlign: 'center', marginTop: 12,
              animation: 'fade-up 0.7s 0.45s both',
            }}>
              BREATHE IN · BREATHE OUT · BEGIN
            </div>
          </>
        )}
        {phase === 'logo' && (
          <div className="mono uppercase" style={{
            fontSize: 10, letterSpacing: 4, color: 'var(--text-mute)',
            textAlign: 'center', animation: 'fade-up 0.8s 0.6s both',
          }}>
            DAILY · DISCIPLINED · CREW
          </div>
        )}
      </div>

      {/* Bottom hazard stripe */}
      <div className="gold-stripe" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }} />
    </div>
  );
}

function MiniStat({ label, value, unit, color }) {
  return (
    <div style={{
      background: 'rgba(20,10,10,0.6)',
      border: '1px solid var(--border)',
      padding: '10px 8px',
      textAlign: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div className="mono uppercase" style={{ fontSize: 8, letterSpacing: 2, color: 'var(--text-mute)' }}>{label}</div>
      <div className="display" style={{ fontSize: 20, color, lineHeight: 1, marginTop: 4 }}>
        {value}{unit && <span className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginLeft: 2, letterSpacing: 1 }}>{unit}</span>}
      </div>
    </div>
  );
}

// The Emblem — crosshair shield with "THE DAILY MAX" lockup.
// All geometric shapes. No illustrative drawing.
function Emblem({ scale = 1 }) {
  const w = 240 * scale;
  return (
    <div style={{ display: 'inline-block', transition: 'transform 0.7s cubic-bezier(.22,1,.36,1)' }}>
      <svg width={w} height={w * 1.25} viewBox="0 0 240 300" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="oxblood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#B32121" />
            <stop offset="100%" stopColor="#6B1414" />
          </linearGradient>
          <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#E6C068" />
            <stop offset="100%" stopColor="#9F7A2E" />
          </linearGradient>
        </defs>

        {/* outer shield */}
        <path d="M120 8 L220 44 L220 150 Q220 220 120 260 Q20 220 20 150 L20 44 Z"
          fill="#0F0808" stroke="url(#oxblood)" strokeWidth="3" />

        {/* inner shield */}
        <path d="M120 22 L206 54 L206 148 Q206 208 120 242 Q34 208 34 148 L34 54 Z"
          fill="none" stroke="url(#gold)" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* crosshair ring */}
        <circle cx="120" cy="128" r="48" fill="none" stroke="url(#gold)" strokeWidth="2" />
        <circle cx="120" cy="128" r="38" fill="none" stroke="#8B1A1A" strokeWidth="1.2" />

        {/* crosshair tick marks */}
        <line x1="120" y1="70"  x2="120" y2="86"  stroke="#E6C068" strokeWidth="2" />
        <line x1="120" y1="170" x2="120" y2="186" stroke="#E6C068" strokeWidth="2" />
        <line x1="62"  y1="128" x2="78"  y2="128" stroke="#E6C068" strokeWidth="2" />
        <line x1="162" y1="128" x2="178" y2="128" stroke="#E6C068" strokeWidth="2" />

        {/* center — the 6 */}
        <text x="120" y="146" textAnchor="middle" fontFamily="Archivo Black" fontSize="56" fill="#E6C068" letterSpacing="-2">6</text>

        {/* four pips (the 4 exercises) */}
        <g fill="#B32121">
          <circle cx="120" cy="52"  r="3.5" />
          <circle cx="120" cy="204" r="3.5" />
          <circle cx="44"  cy="128" r="3.5" />
          <circle cx="196" cy="128" r="3.5" />
        </g>

        {/* lockup — THE / DAILY MAX */}
        <g>
          <rect x="82" y="268" width="76" height="1" fill="#C9A24A" />
          <text x="120" y="282" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700" fontSize="10" letterSpacing="5" fill="#8F857A">THE</text>
        </g>
        <text x="120" y="297" textAnchor="middle" fontFamily="Archivo Black" fontSize="22" letterSpacing="1" fill="#F2ECE2">DAILY MAX</text>
      </svg>
    </div>
  );
}

Object.assign(window, { EntranceScreen, Emblem });
