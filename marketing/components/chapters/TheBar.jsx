'use client';

import { useEffect, useRef, useState } from 'react';

// CH2 — THE BAR
// Gold PR ceiling rises first, then today's effort races it and caps at 100%.
// Pure DOM + CSS transforms; no WebGL needed — this section is about clarity.
export default function TheBar() {
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

  // Two phases:
  //   0 → 0.45  : gold PR bar rises from 0 to 100%
  //   0.45 → 1  : effort bar rises, overshoots, clamps at 100% of PR
  const prHeight = Math.min(1, p / 0.45) * 100;
  const raw = Math.max(0, (p - 0.45) / 0.55) * 130; // would reach 130%
  const effortHeight = Math.min(raw, 100); // capped

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '220vh' }}
      aria-label="The Bar — PR ceiling"
    >
      <div className="pin-stage flex items-center justify-center">
        {/* Left copy */}
        <div className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 max-w-md">
          <div className="mono-label text-ash mb-4">CHAPTER · 02</div>
          <h2 className="display text-bone text-4xl sm:text-5xl leading-tight">
            YOU <span className="text-gold">CAP</span><br />
            AT YOU.
          </h2>
          <p className="mt-6 text-bone/80 leading-relaxed text-sm sm:text-base max-w-sm">
            You compete against yesterday-you. Effort caps at{' '}
            <span className="text-gold">100% of your own PR</span> — so no one
            can out-work you by being bigger.
          </p>
          <p className="mt-3 text-ash text-sm">
            Your ceiling rises every time you beat it. It never steps back down.
          </p>
        </div>

        {/* Center gauge */}
        <div className="relative w-[180px] sm:w-[240px] h-[420px] sm:h-[520px] mx-auto">
          {/* Frame */}
          <div className="absolute inset-0 border border-border" />
          {/* Scanlines */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(242,236,226,0.04) 0 2px, transparent 2px 4px)',
            }}
          />

          {/* PR bar (gold) */}
          <div
            className="absolute left-0 bottom-0 w-1/2 bg-gold"
            style={{
              height: `${prHeight}%`,
              transition: 'height 40ms linear',
              boxShadow: '0 0 40px rgba(201,162,74,0.35)',
            }}
          />
          <div className="absolute left-0 bottom-0 w-1/2 mono-label text-void px-2 py-1 bg-gold">
            PR
          </div>

          {/* Effort bar (oxblood) */}
          <div
            className="absolute right-0 bottom-0 w-1/2 bg-oxblood"
            style={{
              height: `${effortHeight}%`,
              transition: 'height 40ms linear',
              boxShadow: '0 0 40px rgba(139,26,26,0.5)',
            }}
          />
          <div className="absolute right-0 bottom-0 w-1/2 mono-label text-bone px-2 py-1 bg-oxblood">
            TODAY
          </div>

          {/* 100% line */}
          <div className="absolute left-0 right-0 top-0 border-t border-dashed border-gold/60" />
          <div className="absolute -right-16 top-0 mono-gold text-[10px] -translate-y-1/2">
            100% · CAP
          </div>

          {/* Cap flash — when effort hits ceiling */}
          <div
            className="absolute left-0 right-0 top-0 h-1 bg-gold"
            style={{
              opacity: effortHeight >= 100 ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              boxShadow: '0 0 30px rgba(201,162,74,0.9)',
            }}
          />
        </div>

        {/* Right metrics */}
        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 text-right">
          <div className="mono-label text-ash mb-2">YOUR PR</div>
          <div className="display text-gold text-3xl sm:text-4xl">
            {Math.round(prHeight)}
          </div>
          <div className="mono-label text-ash mt-8 mb-2">TODAY · %PR</div>
          <div
            className="display text-4xl sm:text-5xl"
            style={{
              color: effortHeight >= 100 ? 'var(--gold)' : 'var(--oxblood-bright, #B32121)',
              transition: 'color 0.3s',
            }}
          >
            {Math.round(effortHeight)}
          </div>
          <div className="mono-label text-ash mt-1">
            {effortHeight >= 100 ? 'NEW · CEILING' : 'IN · PROGRESS'}
          </div>
        </div>
      </div>
    </section>
  );
}
