'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CrosshairShield from '@/components/three/CrosshairShield';
import RotatingPhrase from '@/components/ui/RotatingPhrase';

const WORDS = ['SIX', 'MINUTES', 'FOUR', 'STATIONS', 'EVERY', 'DAY'];

export default function ColdOpen() {
  const mouse = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section className="chapter" aria-label="Cold open">
      <div className="pin-stage flex flex-col items-center justify-center relative">
        {/* Radial vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(139,26,26,0.12) 0%, rgba(10,7,7,1) 65%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-10">
          <div className="w-[360px] h-[360px] sm:w-[460px] sm:h-[460px]">
            <Canvas
              camera={{ position: [0, 0, 3], fov: 45 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <CrosshairShield mouse={mouse} />
            </Canvas>
          </div>

          <h1 className="sr-only">THE DAILY MAX</h1>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {WORDS.map((w, i) => (
              <span
                key={w}
                className="display text-bone text-xl sm:text-2xl tracking-[0.18em]"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                  transition: `opacity 0.6s ${0.2 + i * 0.12}s cubic-bezier(.22,1,.36,1), transform 0.6s ${0.2 + i * 0.12}s cubic-bezier(.22,1,.36,1)`,
                }}
              >
                {w}
              </span>
            ))}
          </div>

          <div className="min-h-[22px] pt-2">
            <RotatingPhrase />
          </div>

          <div className="pt-16 flex flex-col items-center gap-2 mono-label">
            <span>SCROLL</span>
            <span
              className="block w-px h-10 bg-gold animate-pulse-gold"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
