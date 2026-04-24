# THE DAILY MAX — Marketing Site

Isolated motion-graphics marketing site. **Fully separate from the production
app** in the repo root:

- Production app: static HTML + CDN React (`/index.html`, `/src/*.jsx`) — untouched.
- This site: Next.js 14, static export, deploys as its own Cloudflare Pages /
  Vercel project. No shared dependencies.

## Local dev

```bash
cd marketing
npm install
npm run dev
# → http://localhost:4000
```

## Static export (for deploy)

```bash
npm run build
# output: ./out (static html/js, deploy to any static host)
```

## Stack

- Next.js 14 app router (static export)
- React Three Fiber + drei (WebGL scenes)
- Lenis smooth scroll
- Tailwind 3 with brand tokens locked to the app's colors

## Chapters implemented

- **CH0 — Cold Open**: crosshair shield in R3F, staggered `SIX MINUTES FOUR
  STATIONS EVERY DAY` reveal, rotating auth phrases.
- **CH1 — The Body**: scroll-scrubbed point-cloud figure morphing through the
  four stations (push / squat / hollow / pull).
- **CH2 — The Bar**: gold PR ceiling + oxblood effort bar capped at 100%.
- **CH3 — Hazard Wipe**: diagonal curtain transition, one beat of silence.
- **CH6 — The Verdict**: word-by-word clip-path reveal of the mantra, `ENTER`
  CTA.

Chapters 4 (The Crew — US map) and 5 (The Rally — video) are scaffolded as the
next sprint.

## Brand tokens

Locked in `tailwind.config.js` and `app/globals.css`:

| Token    | Value     | Use                               |
| -------- | --------- | --------------------------------- |
| `void`   | `#0A0707` | 90% of frame                      |
| `oxblood`| `#8B1A1A` | tension, brand, CTA               |
| `gold`   | `#C9A24A` | PR / streak / reward              |
| `bone`   | `#F2ECE2` | typography                        |
| `ash`    | `#8F857A` | muted labels                      |

Fonts: **Archivo Black** (display), **Space Grotesk** (body), **JetBrains
Mono** (chrome). Border radii: **0**. Every transition: `0.65s
cubic-bezier(.22,1,.36,1)`.

## Deploy isolation

Deploy as a separate Cloudflare Pages project:

- Build command: `cd marketing && npm install && npm run build`
- Output directory: `marketing/out`
- Point it at a subdomain like `max.yourdomain.com` or a preview URL. It does
  not touch the production app deployment.

Or Vercel:

- Root directory: `marketing`
- Framework preset: Next.js
- Build + output are auto-detected.

## Next steps

1. Wire CH4 — extruded US map with R3F (`topojson-client` + `us-atlas`), gold
   pins planting by scroll.
2. Wire CH5 — 4K rally video (Pexels CC0) with hazard-striped borders and
   terminal rally feed.
3. Source ambient drone (Freesound CC0 or Suno) and wire into `MuteToggle`.
4. Add a real OG image at `/public/og.jpg` generated via Midjourney/Flux.
