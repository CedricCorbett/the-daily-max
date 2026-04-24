'use client';

import { useEffect, useRef, useState } from 'react';

const HERO_TITLE_WORDS = ['THE', 'DAILY', 'MAX'];
const HERO_SUBS = ['SIX · MINUTES', 'FOUR · STATIONS', 'EVERY · DAY'];

// Scroll-scrub video chapter. Drop any .mp4 into marketing/public/hero.mp4
// and the section will play through it as the user scrolls. On load the
// hero words populate, then fade as scroll begins so the video speaks.
export default function ColdOpen() {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const durationRef = useRef(0);
  const [p, setP] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // On-load hero reveal
  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Video readiness
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      durationRef.current = v.duration || 0;
      setVideoReady(true);
      v.pause();
      v.currentTime = 0;
    };
    const onError = () => setVideoError(true);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('error', onError);
    };
  }, []);

  // Scroll hook + video scrubbing
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      setP(progress);

      const v = videoRef.current;
      const d = durationRef.current;
      if (v && videoReady && d > 0) {
        const target = progress * d;
        if (Math.abs(v.currentTime - target) > 0.008) {
          try {
            v.currentTime = target;
          } catch (_) {}
        }
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [videoReady]);

  // Hero holds → fades quickly once the user begins scrolling
  const HERO_FADE_START = 0.015;
  const HERO_FADE_END = 0.09;
  const heroOpacity =
    p < HERO_FADE_START
      ? 1
      : p < HERO_FADE_END
      ? 1 - (p - HERO_FADE_START) / (HERO_FADE_END - HERO_FADE_START)
      : 0;

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '540vh' }}
      aria-label="Opening — the daily max"
    >
      <div className="pin-stage overflow-hidden">
        {/* Scroll-scrubbed video */}
        <video
          ref={videoRef}
          src="/hero.mp4"
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: videoReady ? 1 : 0,
            transition: 'opacity 0.6s cubic-bezier(.22,1,.36,1)',
          }}
          aria-hidden="true"
        />

        {/* Subtle vignette for text legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(10,7,7,0) 55%, rgba(10,7,7,0.6) 100%)',
          }}
        />

        {/* Top rail */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-6 sm:px-12 py-6 z-30">
          <div className="mono-label text-ash">CHAPTER · 01</div>
          {!videoReady && !videoError && (
            <div className="mono-label text-ash">LOADING · FILM</div>
          )}
          {videoError && (
            <div className="mono-label text-oxblood">
              PLACE · hero.mp4 · IN · marketing/public
            </div>
          )}
        </div>

        {/* ============ HERO (on load) ============ */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-10 sm:gap-14 px-6 z-10"
          style={{
            opacity: heroOpacity,
            transition: 'opacity 0.15s linear',
            pointerEvents: p > 0.05 ? 'none' : 'auto',
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
                  textShadow: '0 2px 24px rgba(0,0,0,0.75)',
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
                  textShadow: '0 2px 14px rgba(0,0,0,0.7)',
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
            <span>SCROLL · TO · PLAY</span>
            <span
              className="block w-px h-10 bg-gold animate-pulse-gold"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Progress tick at bottom (after hero) */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gold"
          style={{
            width: `${p * 100}%`,
            opacity: p > 0.05 ? 0.85 : 0,
            transition: 'opacity 0.4s ease',
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
