'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import { geoAlbersUsa, geoPath, geoCentroid } from 'd3-geo';
import statesTopo from 'us-atlas/states-10m.json';
import { CREWS, STATE_FIPS } from '@/lib/crews';

const WIDTH = 960;
const HEIGHT = 600;

export default function TheCrew() {
  const wrapRef = useRef(null);
  const [p, setP] = useState(0);

  // Convert TopoJSON → GeoJSON once
  const { paths, centroidsByFips } = useMemo(() => {
    const geo = feature(statesTopo, statesTopo.objects.states);
    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], geo);
    const pathGen = geoPath(projection);
    const paths = geo.features.map((f) => ({
      id: f.id,
      d: pathGen(f),
    }));
    const centroidsByFips = {};
    geo.features.forEach((f) => {
      centroidsByFips[f.id] = projection(geoCentroid(f));
    });
    return { paths, centroidsByFips };
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

  // How many crews are planted at current scroll
  const planted = Math.min(
    CREWS.length,
    Math.floor(p * CREWS.length * 1.1 + 0.001)
  );

  // Active crew = most recently planted (for the right-side card)
  const activeIdx = Math.max(0, planted - 1);
  const activeCrew = CREWS[activeIdx];

  // Connecting line path through planted pins
  const linePoints = CREWS.slice(0, planted)
    .map((c) => centroidsByFips[STATE_FIPS[c.state]])
    .filter(Boolean);

  const linePath =
    linePoints.length > 1
      ? 'M ' + linePoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')
      : '';

  return (
    <section
      ref={wrapRef}
      className="chapter"
      style={{ height: '320vh' }}
      aria-label="The Crew — states claimed"
    >
      <div className="pin-stage">
        {/* Top rail */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-6 sm:px-12 py-6 z-20">
          <div className="mono-label text-ash">CHAPTER · 04</div>
          <div className="mono-gold text-[11px]">
            {planted} · STATES · CLAIMED
          </div>
        </div>

        {/* Left copy */}
        <div className="absolute left-6 sm:left-12 top-[22%] max-w-sm z-20">
          <h2 className="display text-bone text-3xl sm:text-4xl leading-tight">
            NO ONE<br />TRAINS<br />ALONE.
          </h2>
          <p className="mt-5 text-bone/80 text-sm leading-relaxed">
            Crews claim states and dethrone each other over three days.
          </p>
          <p className="mt-3 text-ash text-sm leading-relaxed">
            In class, raw reps win. Out of class, the hungrier crew — measured
            by <span className="text-gold">mean percent of PR</span> — beats
            the quiet giant.
          </p>
        </div>

        {/* Map */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            height="100%"
            style={{ maxWidth: 1100, maxHeight: '78vh' }}
            aria-hidden="true"
          >
            <defs>
              <filter id="goldglow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* State outlines */}
            {paths.map(({ id, d }) => {
              const isClaimed = CREWS.slice(0, planted).some(
                (c) => STATE_FIPS[c.state] === id
              );
              return (
                <path
                  key={id}
                  d={d}
                  fill={isClaimed ? '#8B1A1A' : '#14090A'}
                  stroke="#2A1B1B"
                  strokeWidth={0.6}
                  style={{
                    transition: 'fill 0.4s cubic-bezier(.22,1,.36,1)',
                  }}
                />
              );
            })}

            {/* Connecting line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#C9A24A"
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.75}
                filter="url(#goldglow)"
              />
            )}

            {/* Pins */}
            {CREWS.slice(0, planted).map((crew, i) => {
              const c = centroidsByFips[STATE_FIPS[crew.state]];
              if (!c) return null;
              const [x, y] = c;
              const isActive = i === activeIdx;
              return (
                <g key={crew.state} transform={`translate(${x},${y})`}>
                  <circle
                    r={isActive ? 9 : 4}
                    fill="#C9A24A"
                    filter="url(#goldglow)"
                    style={{ transition: 'r 0.3s cubic-bezier(.22,1,.36,1)' }}
                  />
                  <circle
                    r={isActive ? 14 : 0}
                    fill="none"
                    stroke="#C9A24A"
                    strokeWidth={1}
                    opacity={0.55}
                    style={{ transition: 'r 0.3s cubic-bezier(.22,1,.36,1)' }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: active crew card */}
        <div className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 max-w-[260px] z-20">
          <div className="mono-label text-ash mb-2">ACTIVE · CREW</div>
          <div
            key={activeCrew?.state}
            className="border border-border bg-void/80 backdrop-blur p-4 animate-fade-up"
          >
            <div className="mono-gold text-[11px] mb-1">
              {activeCrew?.state}
            </div>
            <div className="display text-bone text-lg leading-tight">
              {activeCrew?.name}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div className="mono-label text-ash">MEAN · %PR</div>
              <div className="display text-gold text-3xl leading-none">
                {activeCrew?.pr}
              </div>
            </div>
            <div className="mt-3 w-full h-[2px] bg-border">
              <div
                className="h-full bg-gold"
                style={{ width: `${activeCrew?.pr ?? 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom: tape line */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="hazard-stripe h-[10px] opacity-80" />
          <div className="text-center py-3 mono-label">
            TRAIN · SOLO — CHALLENGE · TOGETHER
          </div>
        </div>
      </div>
    </section>
  );
}
