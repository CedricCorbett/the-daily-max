'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import { geoAlbersUsa, geoPath, geoCentroid } from 'd3-geo';
import statesTopo from 'us-atlas/states-10m.json';
import { CREWS, STATE_FIPS } from '@/lib/crews';

const WIDTH = 960;
const HEIGHT = 600;

// Claimed state claim-order map: FIPS → plant index
const CLAIM_INDEX = Object.fromEntries(
  CREWS.map((c, i) => [STATE_FIPS[c.state], i])
);

// Small states where a centered icon would overflow the state shape.
// For these we skip the "contested" swords to avoid visual chatter.
const TINY_FIPS = new Set(['09', '10', '11', '24', '25', '33', '34', '44', '50']);

export default function TheCrew() {
  const wrapRef = useRef(null);
  const [p, setP] = useState(0);

  const { paths, centroidsByFips } = useMemo(() => {
    const geo = feature(statesTopo, statesTopo.objects.states);
    const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], geo);
    const pathGen = geoPath(projection);
    const paths = geo.features.map((f) => ({ id: f.id, d: pathGen(f) }));
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

  const planted = Math.min(
    CREWS.length,
    Math.floor(p * CREWS.length * 1.1 + 0.001)
  );
  const activeIdx = Math.max(0, planted - 1);
  const activeCrew = CREWS[activeIdx];

  // Dashed gold line through planted flags, in plant order
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
        {/* Rail */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-6 sm:px-12 py-6 z-20">
          <div className="mono-label text-ash">CHAPTER · 04</div>
          <div className="mono-gold text-[11px]">
            {planted} · OF · {CREWS.length} · STATES · CLAIMED
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
            Claimed territory flies the flag. Everything else is{' '}
            <span className="text-bone">under contention</span> — measured by{' '}
            <span className="text-gold">mean percent of PR</span>.
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

              {/* ===== Battle flag (gold, for claimed states) ===== */}
              <symbol id="flag" viewBox="-14 -18 28 28" overflow="visible">
                {/* pole */}
                <line
                  x1="-6" y1="-14" x2="-6" y2="10"
                  stroke="#C9A24A" strokeWidth="1.3" strokeLinecap="round"
                />
                {/* finial */}
                <circle cx="-6" cy="-15" r="1.4" fill="#C9A24A" />
                {/* pennant */}
                <polygon
                  points="-6,-14 10,-11 -6,-6"
                  fill="#C9A24A"
                />
                {/* base notch */}
                <line
                  x1="-9" y1="10" x2="-3" y2="10"
                  stroke="#C9A24A" strokeWidth="1.2" strokeLinecap="round"
                />
              </symbol>

              {/* ===== Active battle flag (larger + oxblood banner field) ===== */}
              <symbol id="flag-active" viewBox="-18 -22 36 34" overflow="visible">
                <line
                  x1="-7" y1="-18" x2="-7" y2="12"
                  stroke="#C9A24A" strokeWidth="1.6" strokeLinecap="round"
                />
                <circle cx="-7" cy="-19" r="1.8" fill="#C9A24A" />
                <polygon
                  points="-7,-18 14,-13 -7,-7"
                  fill="#C9A24A"
                  stroke="#C9A24A" strokeWidth="0.8"
                />
                {/* oxblood chevron inset on the banner */}
                <polygon
                  points="-7,-15.5 4,-13 -7,-10"
                  fill="#8B1A1A"
                />
                <line
                  x1="-11" y1="12" x2="-3" y2="12"
                  stroke="#C9A24A" strokeWidth="1.4" strokeLinecap="round"
                />
              </symbol>

              {/* ===== Crossed swords (oxblood, for contested states) ===== */}
              <symbol id="swords" viewBox="-10 -10 20 20" overflow="visible">
                {/* Sword 1: top-left → bottom-right */}
                <line
                  x1="-7.5" y1="-7.5" x2="7.5" y2="7.5"
                  stroke="#8B1A1A" strokeWidth="1.3" strokeLinecap="round"
                />
                {/* Sword 2: top-right → bottom-left */}
                <line
                  x1="7.5" y1="-7.5" x2="-7.5" y2="7.5"
                  stroke="#8B1A1A" strokeWidth="1.3" strokeLinecap="round"
                />
                {/* Crossguards */}
                <line
                  x1="-4.8" y1="-6.6" x2="-6.6" y2="-4.8"
                  stroke="#8B1A1A" strokeWidth="1" strokeLinecap="round"
                />
                <line
                  x1="6.6" y1="-4.8" x2="4.8" y2="-6.6"
                  stroke="#8B1A1A" strokeWidth="1" strokeLinecap="round"
                />
                {/* Pommels */}
                <circle cx="-7.8" cy="-7.8" r="0.9" fill="#8B1A1A" />
                <circle cx="7.8" cy="-7.8" r="0.9" fill="#8B1A1A" />
              </symbol>
            </defs>

            {/* State shapes */}
            {paths.map(({ id, d }) => {
              const claimIdx = CLAIM_INDEX[id];
              const isClaimed = claimIdx !== undefined && claimIdx < planted;
              const isActive = isClaimed && claimIdx === activeIdx;
              return (
                <path
                  key={id}
                  d={d}
                  fill={isClaimed ? '#8B1A1A' : '#7A7068'}
                  stroke={isActive ? '#C9A24A' : '#8B1A1A'}
                  strokeWidth={isActive ? 1.3 : 0.7}
                  style={{
                    transition: 'fill 0.4s cubic-bezier(.22,1,.36,1), stroke 0.3s',
                  }}
                />
              );
            })}

            {/* Connecting dashed gold line (plant order) */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#C9A24A"
                strokeWidth={1.1}
                strokeDasharray="3 4"
                opacity={0.8}
                filter="url(#goldglow)"
              />
            )}

            {/* Icons — one pass per state */}
            {paths.map(({ id }) => {
              const c = centroidsByFips[id];
              if (!c) return null;
              const [x, y] = c;
              const claimIdx = CLAIM_INDEX[id];
              const isClaimed = claimIdx !== undefined && claimIdx < planted;
              const isActive = isClaimed && claimIdx === activeIdx;

              if (isClaimed) {
                // Battle flag (active = bigger + glow)
                return (
                  <use
                    key={id}
                    href={isActive ? '#flag-active' : '#flag'}
                    x={x}
                    y={y}
                    width={isActive ? 36 : 28}
                    height={isActive ? 34 : 28}
                    style={{
                      transform: `translate(${isActive ? -18 : -14}px, ${isActive ? -22 : -18}px)`,
                      filter: isActive ? 'url(#goldglow)' : 'none',
                      transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                    }}
                  />
                );
              }

              // Crossed swords on contested (skip tiny states to avoid chatter)
              if (TINY_FIPS.has(id)) return null;
              return (
                <use
                  key={id}
                  href="#swords"
                  x={x}
                  y={y}
                  width={14}
                  height={14}
                  style={{
                    transform: 'translate(-7px, -7px)',
                    opacity: 0.8,
                  }}
                />
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
          {/* Legend */}
          <div className="mt-5 border border-border bg-void/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="-14 -18 28 28">
                <use href="#flag" />
              </svg>
              <span className="mono-label">CLAIMED</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="-10 -10 20 20">
                <use href="#swords" />
              </svg>
              <span className="mono-label">UNDER · CONTENTION</span>
            </div>
          </div>
        </div>

        {/* Bottom tape */}
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
