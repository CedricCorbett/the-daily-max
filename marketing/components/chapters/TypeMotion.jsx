'use client';

import { useEffect, useRef, useState } from 'react';

// THREE ACTS of kinetic typography, driven by scroll progress p ∈ [0,1]:
//   ACT 1 (0.00–0.33)  VERTICAL    — phrases climb up past the viewer
//   ACT 2 (0.33–0.60)  HORIZONTAL  — marquee rows at three speeds/directions
//   ACT 3 (0.60–1.00)  DEPTH (Z)   — the mantra hits you from the vanishing point

// Verbatim brand lines.
const VERTICAL_PHRASES = [
  'FORM · OVER · EGO',
  'SHOW · UP · FOR · YOURSELF',
  'YOUR · PR · IS · THE · ONLY · BAR',
  "TIRED · COUNTS · ZERO · DOESN'T",
  'THE · ONLY · PERSON · YOU · OUTWORK · IS · YESTERDAY',
];

const HORIZONTAL_ROWS = [
  {
    text: 'PUSH   —   SQUAT   —   HOLLOW   —   PULL   —   ',
    color: 'text-bone',
    duration: 34,
    direction: 'normal',
  },
  {
    text: 'SIX · MINUTES · FOUR · STATIONS · EVERY · DAY · ',
    color: 'text-gold',
    duration: 22,
    direction: 'reverse',
  },
  {
    text: 'NO · ZEROS · NO · ZEROS · NO · ZEROS · NO · ZEROS · ',
    color: 'text-oxblood',
    duration: 14,
    direction: 'normal',
  },
];

// Depth words, each with a fixed start Z and 2D jitter. As camera advances
// every word's Z sweeps toward +.
const DEPTH_WORDS = [
  { w: 'TODAY',    z: -3600, x: -18, y: -10, color: '#F2ECE2' },
  { w: 'MAX',      z: -3100, x: 22,  y: 6,   color: '#C9A24A' },
  { w: 'IS',       z: -2700, x: -8,  y: 22,  color: '#F2ECE2' },
  { w: 'WHATEVER', z: -2200, x: 14,  y: -24, color: '#F2ECE2' },
  { w: 'WAS',      z: -1800, x: -26, y: 4,   color: '#8B1A1A' },
  { w: 'IN',       z: -1400, x: 6,   y: -14, color: '#F2ECE2' },
  { w: 'YOU',      z: -1000, x: -14, y: 18,  color: '#C9A24A' },
  { w: 'TODAY',    z: -600,  x: 18,  y: -6,  color: '#F2ECE2' },
  { w: 'THAT',     z: -200,  x: -10, y: 10,  color: '#F2ECE2' },
  { w: 'IS',       z: 200,   x: 8,   y: -4,  color: '#8B1A1A' },
  { w: 'ENOUGH',   z: 600,   x: 0,   y: 0,   color: '#C9A24A' },
];

// easing helpers
const clamp01 = (n) => Math.min(1, Math.max(0, n));

export default function TypeMotion() {
  const wrapRef = useRef(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setP(total > 0 ? scrolled / total : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Phase partitioning
  const actVert  = clamp01(p / 0.33);
  const actHoriz = clamp01((p - 0.33) / 0.27);
  const actDepth = clamp01((p - 0.60) / 0.40);

  // ACT label for the top-left rail
  const currentAct =
    p < 0.33 ? '01 · Y-AXIS' : p < 0.60 ? '02 · X-AXIS' : '03 · Z-AXIS';

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '520vh' }}
      aria-label="Kinetic typography — three axes of motion"
    >
      <div className="pin-stage overflow-hidden">
        {/* Rail */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-6 sm:px-12 py-6 z-30">
          <div className="mono-label text-ash">CHAPTER · 05.5 — MANIFESTO</div>
          <div className="mono-gold text-[11px]">{currentAct}</div>
        </div>

        {/* ============= ACT 1 — VERTICAL ============= */}
        <div
          className="absolute inset-0"
          style={{
            opacity: p < 0.38 ? 1 : 0,
            transition: 'opacity 0.5s cubic-bezier(.22,1,.36,1)',
          }}
          aria-hidden={p >= 0.38}
        >
          {VERTICAL_PHRASES.map((phrase, i) => {
            // Each phrase owns a slice of actVert, overlapping by ~30%
            const slice = 1 / (VERTICAL_PHRASES.length + 0.4);
            const start = i * slice * 0.85;
            const local = clamp01((actVert - start) / (slice * 1.25));
            // 1.0 enters from below → 0.5 centered → 0.0 exits top
            const yPct = 60 - local * 120;
            const op =
              local < 0.05
                ? local / 0.05
                : local > 0.95
                ? (1 - local) / 0.05
                : 1;
            return (
              <div
                key={i}
                className="absolute inset-x-0 text-center"
                style={{
                  top: '50%',
                  transform: `translateY(${yPct}vh)`,
                  willChange: 'transform, opacity',
                  opacity: op,
                }}
              >
                <div className="display text-bone text-3xl sm:text-5xl md:text-6xl tracking-[-0.01em] leading-none">
                  {phrase}
                </div>
              </div>
            );
          })}
        </div>

        {/* ============= ACT 2 — HORIZONTAL ============= */}
        <div
          className="absolute inset-0 flex flex-col items-stretch justify-center gap-10 sm:gap-14"
          style={{
            opacity: p >= 0.30 && p < 0.65 ? 1 : 0,
            transition: 'opacity 0.5s cubic-bezier(.22,1,.36,1)',
          }}
          aria-hidden={p < 0.30 || p >= 0.65}
        >
          {HORIZONTAL_ROWS.map((row, i) => (
            <MarqueeRow key={i} {...row} />
          ))}
        </div>

        {/* ============= ACT 3 — DEPTH (Z-AXIS) ============= */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            perspective: '900px',
            perspectiveOrigin: '50% 50%',
            opacity: p >= 0.55 ? 1 : 0,
            transition: 'opacity 0.5s cubic-bezier(.22,1,.36,1)',
          }}
          aria-hidden={p < 0.55}
        >
          <div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              width: 0,
              height: 0,
            }}
          >
            {DEPTH_WORDS.map((d, i) => {
              // Camera advances through the tunnel. Word's effective Z =
              // baseZ + p * travel. travel chosen so last word arrives exactly
              // at p = 1.0.
              const travel = 4200;
              const zEff = d.z + actDepth * travel;
              // Fade in when approaching, fade out when passing the camera
              const op =
                zEff < -3000
                  ? 0
                  : zEff < -2000
                  ? (zEff + 3000) / 1000
                  : zEff > 400
                  ? Math.max(0, 1 - (zEff - 400) / 300)
                  : 1;
              return (
                <div
                  key={i}
                  className="absolute display"
                  style={{
                    transform: `translate3d(${d.x}vw, ${d.y}vh, ${zEff}px)`,
                    color: d.color,
                    fontSize: 'clamp(64px, 12vw, 220px)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    opacity: op,
                    textShadow:
                      d.color === '#C9A24A'
                        ? '0 0 40px rgba(201,162,74,0.35)'
                        : d.color === '#8B1A1A'
                        ? '0 0 40px rgba(139,26,26,0.45)'
                        : 'none',
                    whiteSpace: 'nowrap',
                    willChange: 'transform, opacity',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {d.w}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom tape */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="hazard-stripe h-[8px] opacity-70" />
        </div>
      </div>
    </section>
  );
}

function MarqueeRow({ text, color, duration, direction }) {
  // Repeat the string enough times to guarantee overflow regardless of viewport
  const repeated = text.repeat(8);
  return (
    <div
      className={`whitespace-nowrap display ${color} text-[12vw] sm:text-[11vw] leading-none tracking-[-0.02em]`}
      style={{
        willChange: 'transform',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          animation: `marquee ${duration}s linear infinite`,
          animationDirection: direction,
        }}
      >
        {repeated}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
