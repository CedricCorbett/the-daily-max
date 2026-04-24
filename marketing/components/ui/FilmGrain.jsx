'use client';

import { useEffect, useRef } from 'react';

// Animated film-grain canvas. Used as a fallback background when no rally video
// is present, and as a subtle overlay when one is. Cheap, looks brand-correct.
export default function FilmGrain({ intensity = 0.22, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const img = ctx.createImageData(w, h);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v * 0.85;
        data[i + 2] = v * 0.7;
        data[i + 3] = Math.random() * 255 * intensity;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
