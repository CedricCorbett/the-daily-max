'use client';

import { useEffect, useRef, useState } from 'react';

// CH3 — the silence between sections. A diagonal hazard curtain slides across
// as the user passes through. No words. One beat.
export default function HazardWipe() {
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

  // Curtain travels from -100% → 100% across the viewport
  const x = -100 + p * 200;

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '120vh' }}
      aria-hidden="true"
    >
      <div className="pin-stage">
        <div
          className="hazard-stripe absolute top-0 bottom-0 w-[140%]"
          style={{
            transform: `translateX(${x}%) skewX(-18deg)`,
            willChange: 'transform',
          }}
        />
      </div>
    </section>
  );
}
