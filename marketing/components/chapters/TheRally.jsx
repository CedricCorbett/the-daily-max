'use client';

import { useEffect, useRef, useState } from 'react';
import FilmGrain from '@/components/ui/FilmGrain';

const RALLY_MESSAGES = [
  { from: 'IRON · BOROUGH', body: 'saw you missed. back tomorrow. we ride.' },
  { from: 'THIN · AIR', body: 'streak resets, not character. show up.' },
  { from: 'LONE · STAR · LIFT', body: 'one set is still a day. get it.' },
  { from: 'PACIFIC · STANDARD', body: 'no zeros. even ten counts.' },
  { from: 'LAKE · EFFECT', body: 'tired counts. we see you.' },
  { from: 'SALT · LINE · CREW', body: 'we got you. come back.' },
  { from: 'EVERGREEN · SIX', body: 'partial reps are reps. go.' },
  { from: 'NOR · EASTERS', body: 'yesterday is paid. today is open.' },
];

export default function TheRally() {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [p, setP] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);

  // Try loading /rally.mp4; if it 404s we stay in grain-only mode.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => setHasVideo(true);
    const onError = () => setHasVideo(false);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
    };
  }, []);

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

  // Reveal messages progressively with scroll
  const revealCount = Math.min(
    RALLY_MESSAGES.length,
    Math.floor(p * RALLY_MESSAGES.length * 1.1 + 0.5)
  );

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '260vh' }}
      aria-label="The Rally — no one left behind"
    >
      <div className="pin-stage">
        {/* Video OR grain-only background */}
        <div className="absolute inset-0 bg-void">
          <video
            ref={videoRef}
            src="/rally.mp4"
            muted
            loop
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: hasVideo ? 0.55 : 0,
              filter: 'grayscale(1) contrast(1.15) brightness(0.85) sepia(.25) hue-rotate(-40deg)',
              transition: 'opacity 0.6s ease',
            }}
          />
          <FilmGrain intensity={hasVideo ? 0.12 : 0.28} />
          {/* vignette */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(10,7,7,0) 40%, rgba(10,7,7,0.85) 100%)',
            }}
          />
        </div>

        {/* Top hazard bar */}
        <div className="absolute top-0 left-0 right-0 hazard-stripe h-[10px] opacity-90" />
        {/* Bottom hazard bar */}
        <div className="absolute bottom-0 left-0 right-0 hazard-stripe h-[10px] opacity-90" />

        {/* Left: cinemascope headline */}
        <div className="absolute left-6 sm:left-12 bottom-[16%] max-w-xl z-10">
          <div className="mono-label text-gold mb-3">CHAPTER · 05</div>
          <h2 className="display text-bone text-4xl sm:text-6xl leading-[0.95] tracking-tight">
            NO ONE<br />
            <span className="text-gold">LEFT</span> BEHIND.
          </h2>
          <p className="mt-5 text-bone/80 text-sm sm:text-base max-w-md leading-relaxed">
            When you break, the crew doesn't shame you — they rally.
          </p>
          <p className="mt-2 text-ash text-sm max-w-md leading-relaxed">
            That's the contract. Show up for yourself. Show up for the crew.
          </p>
        </div>

        {/* Right: terminal rally feed */}
        <div className="absolute right-6 sm:right-12 top-[16%] w-[320px] max-w-[calc(100vw-3rem)] z-10">
          <div className="border border-oxblood bg-void/85 backdrop-blur">
            <div className="flex items-center justify-between px-3 py-2 border-b border-oxblood">
              <div className="mono-label text-gold">RALLY · BOARD</div>
              <div className="flex items-center gap-1">
                <span className="block w-2 h-2 bg-gold animate-pulse-gold" />
                <span className="mono-label text-ash">LIVE</span>
              </div>
            </div>
            <div className="max-h-[360px] overflow-hidden p-1">
              {RALLY_MESSAGES.slice(0, revealCount).map((m, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 border-b border-border last:border-b-0 animate-fade-up"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="mono-gold text-[9px] tracking-[0.18em]">
                      {m.from}
                    </div>
                    <div className="mono-label text-ash text-[9px]">
                      +{(i + 1) * 14}s
                    </div>
                  </div>
                  <div className="text-bone/90 text-[13px] font-mono leading-snug">
                    &gt; {m.body}
                  </div>
                </div>
              ))}
              {revealCount === 0 && (
                <div className="px-3 py-5 mono-label text-ash text-center">
                  AWAITING · SIGNAL
                </div>
              )}
            </div>
            <div className="border-t border-oxblood px-3 py-2 flex items-center justify-between">
              <div className="mono-label text-ash">
                {revealCount} · INBOUND
              </div>
              <div className="mono-gold text-[11px]">NO · ZEROS</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
