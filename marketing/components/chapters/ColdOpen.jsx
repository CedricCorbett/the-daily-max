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

  // Video readiness. Use multiple events + an immediate check, since the
  // <video> can finish loading metadata before this effect runs and we'd
  // otherwise miss the event entirely.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const markReady = () => {
      if (v.duration && !isNaN(v.duration) && v.duration > 0) {
        durationRef.current = v.duration;
        setVideoReady(true);
        try {
          v.pause();
          v.currentTime = 0;
        } catch (_) {}
        return true;
      }
      return false;
    };

    // Already loaded?
    if (markReady()) return;

    const handler = () => markReady();
    const onError = () => setVideoError(true);

    v.addEventListener('loadedmetadata', handler);
    v.addEventListener('loadeddata', handler);
    v.addEventListener('canplay', handler);
    v.addEventListener('durationchange', handler);
    v.addEventListener('error', onError);

    if (v.readyState === 0) v.load();

    return () => {
      v.removeEventListener('loadedmetadata', handler);
      v.removeEventListener('loadeddata', handler);
      v.removeEventListener('canplay', handler);
      v.removeEventListener('durationchange', handler);
      v.removeEventListener('error', onError);
    };
  }, []);

  // Scroll hook + video scrubbing.
  // rAF loop smooths scrub: scroll handler only records the target progress,
  // and the rAF ticker lerps the video's currentTime toward it. This avoids
  // the "one seek per scroll event" jitter and hides small scroll twitches.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let rafId = 0;
    let target = 0; // target progress in [0,1]
    let shown = 0; // lerped progress actually applied

    const computeTarget = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      target = total > 0 ? scrolled / total : 0;
    };

    const tick = () => {
      // Lerp toward target. 0.22 feels responsive without jitter.
      shown += (target - shown) * 0.22;
      if (Math.abs(target - shown) < 0.0005) shown = target;

      const v = videoRef.current;
      const d = durationRef.current;
      if (v && videoReady && d > 0) {
        const t = shown * d;
        if (Math.abs(v.currentTime - t) > 0.016) {
          try {
            v.currentTime = t;
          } catch (_) {}
        }
      }

      // Update progress-bar state; React will batch within a frame.
      setP(shown);
      rafId = requestAnimationFrame(tick);
    };

    computeTarget();
    shown = target;
    rafId = requestAnimationFrame(tick);

    window.addEventListener('scroll', computeTarget, { passive: true });
    window.addEventListener('resize', computeTarget);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', computeTarget);
      window.removeEventListener('resize', computeTarget);
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
