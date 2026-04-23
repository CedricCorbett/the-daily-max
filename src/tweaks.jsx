// Tweaks panel — aesthetic/voice/mods, plus spouse-notify config

function TweaksPanel({ state, setState, onClose }) {
  const voices = [
    { id: 'auto',  label: 'AUTO (streak rotates)' },
    { id: 'dad',   label: 'DRY' },
    { id: 'bro',   label: 'HYPE COACH' },
    { id: 'drill', label: 'DRILL SERGEANT' },
    { id: 'zen',   label: 'ZEN' },
  ];
  const aesthetics = [
    { id: 'oxblood',  label: 'OXBLOOD',       accent: '#8B1A1A' },
    { id: 'gold',     label: 'BRASS GOLD',    accent: '#C9A24A' },
    { id: 'crimson',  label: 'CRIMSON',       accent: '#B32121' },
    { id: 'graphite', label: 'GRAPHITE',      accent: '#6B6159' },
  ];
  const setAesthetic = (a) => {
    document.documentElement.style.setProperty('--accent', a.accent);
    document.documentElement.style.setProperty('--accent-dim', a.accent + '22');
    setState(s => ({ ...s, aesthetic: a.id }));
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 20,
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: 'var(--bg)', borderTop: '1px solid var(--border)',
        maxHeight: '85%', overflowY: 'auto', animation: 'slide-up 0.25s ease-out',
      }}>
        <div style={{ padding: '16px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--accent)' }}>TWEAKS</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 18 }}>×</button>
        </div>
        <HazardBar height={3} />
        <div style={{ padding: 20 }}>

          <Section title="VOICE">
            {voices.map(v => (
              <OptionRow key={v.id} active={state.voice === v.id} onClick={() => setState(s => ({ ...s, voice: v.id }))}>
                {v.label}
              </OptionRow>
            ))}
          </Section>

          <Section title="AESTHETIC">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {aesthetics.map(a => (
                <button key={a.id} onClick={() => setAesthetic(a)} style={{
                  padding: 12, background: state.aesthetic === a.id ? 'var(--card-2)' : 'var(--card)',
                  border: `1px solid ${state.aesthetic === a.id ? a.accent : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                }}>
                  <div style={{ width: 18, height: 18, background: a.accent, flexShrink: 0 }} />
                  <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--text)', textAlign: 'left' }}>{a.label}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="TIME SLOT">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <OptionRow active={state.slot === 'am'} onClick={() => setState(s => ({ ...s, slot: 'am' }))}>☕ BEFORE KIDS WAKE</OptionRow>
              <OptionRow active={state.slot === 'pm'} onClick={() => setState(s => ({ ...s, slot: 'pm' }))}>🌙 AFTER BEDTIME</OptionRow>
            </div>
          </Section>

          {ACCOUNTABILITY_ENABLED && (
            <Section title="ACCOUNTABILITY PARTNER · STREAK BREAK">
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 8, lineHeight: 1.4 }}>
                If you break the streak, we text this person. Extra accountability or pure chaos — your call.
              </div>
              <input
                value={state.partner}
                onChange={e => setState(s => ({ ...s, partner: e.target.value }))}
                placeholder="Name or phone"
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--card)',
                  border: '1px solid var(--border-2)', color: 'var(--text)',
                  fontFamily: 'JetBrains Mono', fontSize: 12,
                }}
              />
            </Section>
          )}

          <Section title="REFERRAL CODE">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="mono" style={{
                flex: 1, padding: '10px 12px', background: 'var(--card)', border: '1px solid var(--border)',
                fontSize: 13, letterSpacing: 2, color: 'var(--accent)',
              }}>{state.referralCode}</div>
              <GhostBtn onClick={() => { navigator.clipboard && navigator.clipboard.writeText(`dailymax.app/${state.referralCode}`); }}>COPY LINK</GhostBtn>
            </div>
          </Section>

          <Section title="RESET">
            <GhostBtn onClick={() => {
              if (confirm('Wipe all progress?')) {
                localStorage.removeItem('dailymax:v1');
                localStorage.removeItem('dailymax:v2');
                localStorage.removeItem('dailymax:entrance');
                location.reload();
              }
            }}>WIPE DATA</GhostBtn>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2.5, color: 'var(--text-dim)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function OptionRow({ active, children, onClick }) {
  return (
    <button onClick={onClick} className="mono uppercase" style={{
      width: '100%', padding: '10px 12px', marginBottom: 4,
      background: active ? 'var(--accent-dim)' : 'var(--card)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      color: active ? 'var(--accent)' : 'var(--text)',
      fontSize: 11, letterSpacing: 1.5, textAlign: 'left', cursor: 'pointer',
    }}>{children}</button>
  );
}

Object.assign(window, { TweaksPanel });
