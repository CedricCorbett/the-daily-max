// Shared UI primitives

const { useState, useEffect, useRef, useCallback, useMemo } = React;

function Shell({ children, bg }) {
  return (
    <div className="screen" style={{ background: bg || 'var(--bg)' }}>
      {children}
    </div>
  );
}

function TopBar({ left, right, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 10px', flexShrink: 0 }}>
      <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>{left}</div>
      <div style={{ textAlign: 'center', flex: 1 }}>
        {title && <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 3, color: 'var(--text-dim)' }}>{title}</div>}
        {sub && <div className="mono" style={{ fontSize: 9, color: 'var(--text-mute)', marginTop: 2, letterSpacing: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

function IconBtn({ children, onClick, size = 36 }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 10,
      background: 'var(--card)', border: '1px solid var(--border)',
      color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, padding: 0,
    }}>{children}</button>
  );
}

function HazardBar({ height = 8 }) {
  return <div className="hazard-stripe" style={{ height, width: '100%' }} />;
}

function Chip({ children, active, onClick, color = 'var(--accent)' }) {
  return (
    <button onClick={onClick} className="mono uppercase" style={{
      padding: '6px 10px', borderRadius: 6,
      fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
      background: active ? color : 'transparent',
      border: `1px solid ${active ? color : 'var(--border-2)'}`,
      color: active ? '#0A0A0A' : 'var(--text-dim)',
    }}>{children}</button>
  );
}

function Stat({ label, value, unit, color = 'var(--text)' }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div className="mono uppercase" style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-mute)' }}>{label}</div>
      <div className="display" style={{ fontSize: 28, color, lineHeight: 1, marginTop: 4 }}>
        {value}<span className="mono" style={{ fontSize: 11, color: 'var(--text-mute)', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, color = 'var(--accent)', disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '18px 0',
      background: disabled ? '#222' : color, color: '#0A0A0A',
      border: 'none', borderRadius: 0,
      fontSize: 16, fontWeight: 800, letterSpacing: 3,
      textTransform: 'uppercase', fontFamily: 'Archivo Black, sans-serif',
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative', overflow: 'hidden',
    }}>{children}</button>
  );
}

function GhostBtn({ children, onClick, color = 'var(--text-dim)' }) {
  return (
    <button onClick={onClick} className="mono uppercase" style={{
      padding: '14px 16px', background: 'transparent',
      border: '1px solid var(--border-2)', borderRadius: 4,
      color, fontSize: 11, letterSpacing: 2, fontWeight: 600,
    }}>{children}</button>
  );
}

// Brutalist display numeral
function BigNum({ n, unit, color = 'var(--text)', size = 72 }) {
  return (
    <div className="display" style={{ fontSize: size, color, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
      {n}{unit && <span className="mono" style={{ fontSize: size * 0.22, color: 'var(--text-mute)', marginLeft: 6, letterSpacing: 0 }}>{unit}</span>}
    </div>
  );
}

// Streak row (heat dots)
function StreakDots({ history, days = 14 }) {
  const dots = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dateOffset(-i);
    const hit = history.find(h => h.date === d);
    dots.push({ date: d, hit });
  }
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {dots.map((x, i) => (
        <div key={i} style={{
          flex: 1, height: 20, borderRadius: 2,
          background: x.hit ? 'var(--streak)' : 'var(--card-2)',
          border: x.hit ? 'none' : '1px solid var(--border)',
        }} />
      ))}
    </div>
  );
}

// Tiny bar chart for history
function HistoryBars({ history, dataKey, best, color = 'var(--accent)' }) {
  const max = Math.max(best || 0, ...history.map(h => h[dataKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 38 }}>
      {history.slice(-10).map((h, i) => {
        const v = h[dataKey] || 0;
        const pct = (v / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: '100%', height: `${pct}%`,
              background: color, opacity: 0.2 + (i / 20),
            }} />
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  Shell, TopBar, IconBtn, HazardBar, Chip, Stat, PrimaryBtn, GhostBtn, BigNum, StreakDots, HistoryBars
});
