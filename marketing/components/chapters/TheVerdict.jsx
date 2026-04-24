'use client';

import { useEffect, useRef, useState } from 'react';
import { MANTRA } from '@/lib/phrases';

// CH6 — THE VERDICT
// Mantra reveals word by word via clip-path. Oxblood ENTER CTA at the bottom.
export default function TheVerdict() {
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

  const words = MANTRA.split(' ');
  const reveal = Math.min(1, p * 1.3);

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '200vh' }}
      aria-label="The verdict"
    >
      <div className="pin-stage flex flex-col items-center justify-center px-6">
        <div className="mono-label text-ash mb-8">CHAPTER · 06 — VERDICT</div>

        <h2 className="display text-bone text-3xl sm:text-5xl md:text-6xl leading-[1.1] text-center max-w-5xl tracking-tight">
          {words.map((w, i) => {
            const perWord = 1 / words.length;
            const start = i * perWord;
            const local = Math.min(
              1,
              Math.max(0, (reveal - start) / (perWord * 1.2))
            );
            return (
              <span
                key={i}
                className="inline-block mr-3 sm:mr-4"
                style={{
                  clipPath: `inset(0 ${(1 - local) * 100}% 0 0)`,
                  transition: 'clip-path 0.15s linear',
                  color: i === words.length - 1 ? 'var(--gold)' : undefined,
                }}
              >
                {w}
              </span>
            );
          })}
        </h2>

        <div
          className="mt-16 w-full max-w-md"
          style={{
            opacity: reveal > 0.9 ? 1 : 0,
            transform: reveal > 0.9 ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.6s cubic-bezier(.22,1,.36,1), transform 0.6s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <a
            href="/"
            className="group relative block w-full text-center py-5 bg-oxblood text-bone display text-lg tracking-[0.2em] overflow-hidden"
          >
            <span className="relative z-10">ENTER</span>
            <span
              aria-hidden="true"
              className="hazard-stripe-gold absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
          </a>
          <div className="mono-label text-ash text-center mt-4">
            NEW HERE → CREATE ACCOUNT INSIDE
          </div>
        </div>
      </div>
    </section>
  );
}
