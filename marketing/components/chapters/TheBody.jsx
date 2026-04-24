'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import StationFigure from '@/components/three/StationFigure';
import { STATIONS } from '@/lib/phrases';

export default function TheBody() {
  const wrapRef = useRef(null);
  const progressRef = useRef(0);
  const [stationIdx, setStationIdx] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      progressRef.current = p;

      const next = Math.min(
        STATIONS.length - 1,
        Math.floor(p * STATIONS.length * 0.999)
      );
      setStationIdx(next);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const station = STATIONS[stationIdx];

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '300vh' }}
      aria-label="The Body — four stations"
    >
      <div className="pin-stage">
        <div className="absolute inset-0">
          <Canvas
            camera={{ position: [0, 0.1, 3.6], fov: 42 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.2} />
            <directionalLight position={[3, 2, 2]} intensity={0.6} color="#F2ECE2" />
            <directionalLight position={[-3, -1, -2]} intensity={0.5} color="#8B1A1A" />
            <StationFigure progressRef={progressRef} />
          </Canvas>
        </div>

        {/* Floor hazard stripe */}
        <div
          aria-hidden="true"
          className="hazard-stripe absolute left-0 right-0 bottom-0 opacity-40"
          style={{ height: 14 }}
        />

        {/* Left: station indicator */}
        <div className="absolute top-1/2 left-6 sm:left-12 -translate-y-1/2 flex flex-col gap-2">
          {STATIONS.map((s, i) => (
            <div
              key={s.idx}
              className={`mono-label flex items-center gap-3 transition-colors duration-500`}
              style={{
                color: i === stationIdx ? 'var(--gold)' : 'var(--ash)',
                opacity: i === stationIdx ? 1 : 0.4,
              }}
            >
              <span
                className="inline-block w-6 h-px"
                style={{
                  background: i === stationIdx ? 'var(--gold)' : 'var(--ash)',
                }}
              />
              {s.idx} · {s.name}
            </div>
          ))}
        </div>

        {/* Right: current station card */}
        <div className="absolute top-1/2 right-6 sm:right-12 -translate-y-1/2 max-w-[320px] text-right">
          <div className="mono-label text-ash mb-3">STATION {station.idx}</div>
          <div
            key={station.idx}
            className="display text-bone text-4xl sm:text-5xl leading-none animate-fade-up"
          >
            {station.full}
          </div>
          <div className="mono-gold text-xs mt-4">90 SECONDS</div>
        </div>

        {/* Bottom: methodology line */}
        <div className="absolute bottom-10 left-0 right-0 text-center px-6">
          <p className="mono-label max-w-xl mx-auto leading-relaxed">
            ONE TRIP THROUGH ALL FOUR · NINETY SECONDS EACH · ZERO IS THE ONLY
            NUMBER THAT BREAKS THE STREAK
          </p>
        </div>
      </div>
    </section>
  );
}
