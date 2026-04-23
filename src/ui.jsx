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

// Forward-looking 14-day cycle bar. Anchored on first app open
// (state.cycleStart). The bar walks forward 14 days at a time — once
// the user passes day 14, the next cycle starts automatically.
// Box states:
//   · gold filled    → logged + volume > 0
//   · dim filled     → past day in this cycle, missed
//   · oxblood ring   → today
//   · outlined       → future day in this cycle
function Cycle14Bar({ history, cycleStart }) {
  const todayISO = new Date().toISOString().split('T')[0];
  const anchor = cycleStart || todayISO;

  const toDate = (iso) => { const d = new Date(iso + 'T00:00:00'); d.setHours(0,0,0,0); return d; };
  const toISO = (d) => d.toISOString().split('T')[0];

  const today = toDate(todayISO);
  const a = toDate(anchor);
  const daysSince = Math.floor((today - a) / 86400000);
  const cycleNum = Math.max(0, Math.floor(daysSince / 14));
  const startIdx = cycleNum * 14;
  const cycleStartDate = new Date(a); cycleStartDate.setDate(a.getDate() + startIdx);

  const logged = new Set(
    (history || [])
      .filter(h => h && h.date && ((h.pushups||0)+(h.squats||0)+(h.hollow||0)+(h.pullups||0)) > 0)
      .map(h => h.date)
  );

  const boxes = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(cycleStartDate); d.setDate(cycleStartDate.getDate() + i);
    const iso = toISO(d);
    const isFuture = d > today;
    const isToday = iso === todayISO;
    const hit = logged.has(iso);
    boxes.push({ iso, isFuture, isToday, hit, dayNum: startIdx + i + 1 });
  }

  const dayOf = daysSince - startIdx + 1; // 1..14 within current cycle
  const loggedInCycle = boxes.filter(b => b.hit).length;

  const style = (b) => {
    if (b.hit) {
      return { background: 'var(--streak)', border: b.isToday ? '1px solid var(--accent)' : 'none' };
    }
    if (b.isToday) {
      return { background: 'var(--card-2)', border: '1.5px solid var(--accent)' };
    }
    if (b.isFuture) {
      return { background: 'transparent', border: '1px dashed var(--border-2)' };
    }
    return { background: 'var(--card-2)', border: '1px solid var(--border)' };
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 3 }}>
        {boxes.map((b, i) => (
          <div key={i} title={b.iso} style={{
            flex: 1, height: 20, borderRadius: 2,
            ...style(b),
          }} />
        ))}
      </div>
      <div className="mono" style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 6, fontSize: 9, letterSpacing: 1.5, color: 'var(--text-mute)',
      }}>
        <span>DAY {Math.min(14, Math.max(1, dayOf))} / 14 · CYCLE {cycleNum + 1}</span>
        <span style={{ color: loggedInCycle > 0 ? 'var(--streak)' : 'var(--text-mute)' }}>
          {loggedInCycle} LOGGED
        </span>
      </div>
    </div>
  );
}

// Streak row (heat dots). Reads left-to-right, first box = today.
// Going right = earlier days. Mirrors the user's mental model:
// "my first box on the left is today, older history trails right."
function StreakDots({ history, days = 14 }) {
  const dots = [];
  for (let i = 0; i < days; i++) {
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

// ───────── HOW TO DO THE DAILY MAX ─────────
// One-set, all-out, no mystery. Shown on demand from the home screen and
// the pre-timer ready screen. Brutalist card, crew-voice copy.

function HowToModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 30,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fade-up 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '92%', overflowY: 'auto',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          animation: 'slide-up 0.28s ease-out',
        }}
      >
        <div className="hazard-stripe" style={{ height: 4, width: '100%' }} />
        <div style={{ padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--streak)' }}>
            HOW TO DO THE DAILY MAX
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-mute)', fontSize: 22, cursor: 'pointer', padding: 0,
          }}>×</button>
        </div>

        <div style={{ padding: '4px 22px 26px' }}>
          <div className="display" style={{ fontSize: 28, lineHeight: 1.02, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            ONE SET.<br/>ALL YOU'VE GOT.<br/>THAT'S IT.
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.55 }}>
            Four stations. One honest set at each. Max reps until the rep before you'd break form — that's your number. Log it. Done for the day.
          </div>

          <div style={{
            marginTop: 18, padding: 14,
            background: 'var(--card)', border: '1px solid var(--border)',
          }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 }}>
              THE RULES
            </div>
            <HowRule n="1" title="ONE SET PER STATION.">
              Not three. Not five. One. You pick a number of sets and you lied to yourself — that's why most apps fail dads.
            </HowRule>
            <HowRule n="2" title="MAX EFFORT, CLEAN FORM.">
              Go until the next rep would break your form. That rep doesn't count — the one before it is your max.
            </HowRule>
            <HowRule n="3" title="ANY ORDER YOU WANT.">
              Timer cues all four. If you only have a bar later, do push / squat / hold now and punch in pull-ups after lunch. Log at the end.
            </HowRule>
            <HowRule n="4" title="BACK-TO-BACK.">
              Rest between stations is short on purpose — the guide gives you 15 seconds. If you need more, take it. Just don't turn it into two sessions.
            </HowRule>
            <HowRule n="5" title="LOG ONCE.">
              Enter the real number. PR or 3 reps total, it still counts. Streak is built on showing up, not on hitting a target.
            </HowRule>
          </div>

          <div style={{
            marginTop: 14, padding: 14,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
          }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--streak)', marginBottom: 8 }}>
              THE FOUR STATIONS
            </div>
            <HowStation n="1" name="PUSH-UPS"     detail="Chest down to fist, full lockout. Scale to knees or incline — just commit to one version." />
            <HowStation n="2" name="AIR SQUATS"   detail="Hips below knees. Chest tall. Heels down. Swap for split squats if the bar's not there." />
            <HowStation n="3" name="HOLLOW HOLD"  detail="Lower back pressed flat, arms and legs up. Logged in SECONDS, not reps. Drop early if form breaks." />
            <HowStation n="4" name="PULL-UPS"     detail="Chin over bar, full hang. No bar? Swap for dead-bug, inverted row, or just log 0 and keep the streak." />
          </div>

          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'var(--streak-dim)', border: '1px solid var(--streak)',
          }}>
            <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--streak)' }}>
              THE POINT
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.5 }}>
              Six minutes. No programming to follow. No plate math. Your PR is the only bar — and it caps at 100% of itself. A titan can't carry a sleeping crew. Showing up, every day, is the whole game.
            </div>
          </div>

          <button
            onClick={onClose}
            className="mono uppercase"
            style={{
              marginTop: 18, width: '100%', padding: '16px 0',
              background: 'var(--accent)', color: '#0A0A0A', border: 'none',
              fontFamily: 'Archivo Black', fontSize: 13, letterSpacing: 4, cursor: 'pointer',
            }}
          >
            GOT IT · LET'S WORK
          </button>
        </div>
        <div className="gold-stripe" style={{ height: 3, width: '100%' }} />
      </div>
    </div>
  );
}

function HowRule({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
      <div className="display" style={{
        width: 24, height: 24, background: 'var(--accent)', color: '#0A0A0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, flexShrink: 0,
      }}>{n}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text)', fontWeight: 700 }}>
          {title}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 3, lineHeight: 1.5 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function HowStation({ n, name, detail }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
      <div className="mono" style={{
        width: 22, fontSize: 10, color: 'var(--streak)', fontWeight: 700,
        letterSpacing: 1, flexShrink: 0, paddingTop: 1,
      }}>
        0{n}
      </div>
      <div style={{ flex: 1 }}>
        <div className="mono uppercase" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--text)', fontWeight: 700 }}>
          {name}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-mute)', marginTop: 2, lineHeight: 1.5 }}>
          {detail}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Shell, TopBar, IconBtn, HazardBar, Chip, Stat, PrimaryBtn, GhostBtn, BigNum, StreakDots, Cycle14Bar, HistoryBars,
  HowToModal,
});
