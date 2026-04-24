'use client';

import { useEffect, useRef, useState } from 'react';

const HERO_TITLE_WORDS = ['THE', 'DAILY', 'MAX'];
const HERO_SUBS = ['SIX · MINUTES', 'FOUR · STATIONS', 'EVERY · DAY'];

// The brand's rules. One reveals at a time as the user scrolls.
// Pulled from the AUTH_PHRASES canon — each phrase is a verbatim rule.
const RULES = [
  'FORM OVER EGO.',
  'SHOW UP FOR YOURSELF.',
  'YOUR PR IS THE ONLY BAR.',
  "TIRED COUNTS. ZERO DOESN'T.",
  'PARTIAL REPS ARE REPS.',
  'YESTERDAY IS PAID.',
  "DON'T STACK TOMORROW.",
  'THE ONLY PERSON YOU OUTWORK IS YESTERDAY-YOU.',
  'MOVEMENT OVER EGO.',
];

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const smoothstep = (t) => t * t * (3 - 2 * t);

export default function ColdOpen() {
  const wrapRef = useRef(null);
  const [p, setP] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Trigger the on-load hero reveal on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Scroll progress for the pinned stage
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

  // Phase split
  //   p  0.00 – 0.12   HERO holds, then fades out
  //   p  0.12 – 1.00   RULES cycle, one at a time
  const HERO_FADE_START = 0.05;
  const HERO_FADE_END = 0.12;
  const RULES_PHASE_START = 0.12;

  const heroOpacity =
    p < HERO_FADE_START
      ? 1
      : p < HERO_FADE_END
      ? 1 - (p - HERO_FADE_START) / (HERO_FADE_END - HERO_FADE_START)
      : 0;
  const heroShift = p < HERO_FADE_END ? p * 80 : HERO_FADE_END * 80;

  // Rule phase: rules own 88% of the section
  const rulesPhase = clamp01((p - RULES_PHASE_START) / (1 - RULES_PHASE_START));
  const perRule = 1 / RULES.length;
  const activeRuleIdx = Math.min(
    RULES.length - 1,
    Math.floor(rulesPhase / perRule + 0.001)
  );

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '560vh' }}
      aria-label="Opening — the daily max manifesto"
    >
      <div className="pin-stage overflow-hidden">
        {/* Vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(139,26,26,0.10) 0%, rgba(10,7,7,1) 70%)',
          }}
        />

        {/* Top rail */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-6 sm:px-12 py-6 z-30">
          <div className="mono-label text-ash">CHAPTER · 01</div>
          <div
            className="mono-gold text-[11px]"
            style={{
              opacity: p >= RULES_PHASE_START ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            RULE · {String(activeRuleIdx + 1).padStart(2, '0')} · OF ·{' '}
            {String(RULES.length).padStart(2, '0')}
          </div>
        </div>

        {/* ============ HERO (on load) ============ */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-10 sm:gap-14 px-6"
          style={{
            opacity: heroOpacity,
            transform: `translateY(${-heroShift}px)`,
            willChange: 'opacity, transform',
            pointerEvents: p > 0.1 ? 'none' : 'auto',
          }}
        >
          <h1 className="sr-only">THE DAILY MAX</h1>

          {/* Title — staggered word reveal */}
          <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6">
            {HERO_TITLE_WORDS.map((w, i) => (
              <span
                key={w}
                aria-hidden="true"
                className="display text-bone text-5xl sm:text-7xl md:text-8xl tracking-[-0.02em] leading-none"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.8s ${0.15 + i * 0.18}s cubic-bezier(.22,1,.36,1), transform 0.8s ${0.15 + i * 0.18}s cubic-bezier(.22,1,.36,1)`,
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Divider tick */}
          <div
            aria-hidden="true"
            className="w-12 h-px bg-gold"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: 'center',
              transition:
                'opacity 0.6s 0.75s cubic-bezier(.22,1,.36,1), transform 0.6s 0.75s cubic-bezier(.22,1,.36,1)',
            }}
          />

          {/* Sub-lines — line-by-line reveal */}
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            {HERO_SUBS.map((line, i) => (
              <div
                key={line}
                className="mono-gold text-xs sm:text-sm tracking-[0.3em]"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'translateY(0)' : 'translateY(10px)',
                  transition: `opacity 0.6s ${0.9 + i * 0.15}s cubic-bezier(.22,1,.36,1), transform 0.6s ${0.9 + i * 0.15}s cubic-bezier(.22,1,.36,1)`,
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Scroll hint */}
          <div
            className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 mono-label"
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.6s 1.4s cubic-bezier(.22,1,.36,1)',
            }}
          >
            <span>SCROLL · FOR · THE · RULES</span>
            <span
              className="block w-px h-10 bg-gold animate-pulse-gold"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ============ RULES (on scroll) ============ */}
        <div
          className="absolute inset-0 flex items-center justify-center px-6"
          style={{
            opacity: p >= HERO_FADE_START ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          aria-hidden={p < HERO_FADE_START}
        >
          {RULES.map((rule, i) => {
            const start = i * perRule;
            // Each rule slice: enter (0-25%), hold (25-75%), exit (75-100%)
            const localRaw = (rulesPhase - start) / perRule;
            const local = clamp01(localRaw);

            // For the last rule, let it hold fully — no exit animation
            const isLast = i === RULES.length - 1;
            const exitBlocked = isLast && rulesPhase >= 1 - perRule * 0.25;

            const yVh =
              local < 0.25
                ? 30 - smoothstep(local / 0.25) * 30 // enter: +30vh → 0
                : local > 0.75 && !exitBlocked
                ? -smoothstep((local - 0.75) / 0.25) * 30 // exit: 0 → -30vh
                : 0;

            const opacity =
              localRaw < 0 || localRaw > 1
                ? 0
                : local < 0.15
                ? local / 0.15
                : local > 0.85 && !exitBlocked
                ? Math.max(0, (1 - local) / 0.15)
                : 1;

            // Only render rules near active window for perf
            if (opacity <= 0.001 && Math.abs(i - activeRuleIdx) > 1) return null;

            return (
              <div
                key={i}
                className="absolute inset-x-0 text-center"
                style={{
                  transform: `translateY(${yVh}vh)`,
                  opacity,
                  willChange: 'transform, opacity',
                }}
              >
                <div
                  className="mono-gold text-[11px] mb-4 sm:mb-6"
                  aria-hidden="true"
                >
                  RULE · {String(i + 1).padStart(2, '0')}
                </div>
                <div className="display text-bone text-4xl sm:text-6xl md:text-7xl leading-[1.05] tracking-[-0.02em] max-w-5xl mx-auto px-6">
                  {rule}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rule progress tick-marks at bottom */}
        <div
          className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2"
          style={{
            opacity: p >= RULES_PHASE_START ? 0.9 : 0,
            transition: 'opacity 0.4s ease',
          }}
          aria-hidden="true"
        >
          {RULES.map((_, i) => (
            <span
              key={i}
              className="block h-px"
              style={{
                width: i === activeRuleIdx ? 26 : 14,
                background:
                  i < activeRuleIdx
                    ? 'var(--gold)'
                    : i === activeRuleIdx
                    ? 'var(--gold)'
                    : 'var(--border)',
                transition: 'width 0.3s cubic-bezier(.22,1,.36,1), background 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
