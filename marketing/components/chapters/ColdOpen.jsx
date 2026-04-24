'use client';

import { useEffect, useRef, useState } from 'react';

// CH0 — pure scroll-scrubbed film.
// The video at /hero.mp4 plays in lock-step with scroll position. No title
// overlay, no chrome. The footage IS the opening.
export default function ColdOpen() {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const durationRef = useRef(0);
  const [p, setP] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

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

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '540vh' }}
      aria-label="Opening — scroll-scrubbed film"
    >
      <div className="pin-stage overflow-hidden bg-void">
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

        {/* Status rail (loading / error only; no decorative chrome) */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-6 sm:px-12 py-6 z-30 pointer-events-none">
          <div className="mono-label text-ash">CHAPTER · 01</div>
          {!videoReady && !videoError && (
            <div className="mono-label text-ash">LOADING · FILM</div>
          )}
          {videoError && (
            <div className="mono-label text-oxbloodbright">
              PLACE · hero.mp4 · IN · marketing/public
            </div>
          )}
        </div>

        {/* Scroll hint — only visible when not yet scrolling */}
        <div
          className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2 mono-label z-20 pointer-events-none"
          style={{
            opacity: p < 0.015 && videoReady ? 0.9 : 0,
            transition: 'opacity 0.4s ease',
          }}
          aria-hidden="true"
        >
          <span>SCROLL</span>
          <span className="block w-px h-10 bg-gold animate-pulse-gold" />
        </div>

        {/* Progress ribbon */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-gold"
          style={{
            width: `${p * 100}%`,
            opacity: videoReady ? 0.85 : 0,
            transition: 'opacity 0.4s ease',
          }}
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
