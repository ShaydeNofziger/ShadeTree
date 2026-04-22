# ShadeTree — project context

> A cozy, personalized prototype: render a skydiver's jump history as a living
> tree. Zero backend, all-local.

## What this repo is

ShadeTree is a single-page web app built with **Vite + TypeScript + vanilla DOM**
(no framework). It has two surfaces:

1. **Canopy** — an SVG tree with pan/zoom. Trunk grows with years active.
   Branches fan out, one per discipline flown. Each leaf is a jump, sized by
   freefall distance and colored by season. Milestone jumps (round numbers,
   first-in-discipline, last student jump) glow with a golden ring. Hover any
   leaf to see the jump details.
2. **Logbook** — add/delete/bulk-log jumps. Persists to `localStorage` under
   `shadetree:v2:jumps`. Supports import/export/merge via JSON files. Three
   demo scenarios (beginner, intermediate, pro swooper) can be loaded from the
   scenario picker.

## Stack & layout

```
src/
  main.ts       # wiring, tabs, form, tooltip, toast, bulk modal, import/export
  tree.ts       # SVG tree renderer + milestone detection (no deps)
  logbook.ts    # jump list + filter
  panzoom.ts    # viewBox-based pan/zoom for the canopy SVG
  store.ts      # localStorage + seed bootstrapping + ID backfill
  seed.ts       # 3 scenario generators (beginner / intermediate / pro swooper)
  types.ts      # Jump / Discipline / Season
  util.ts       # PRNG (mulberry32), FNV hash, seasons, formatting, uid
  styles.css    # cozy, earthy palette (light + dark)
index.html      # tabs + panels + bulk-log modal, loads /src/main.ts
public/favicon.svg
scripts/
  seed-check.ts    # print sample career distribution stats
  render-check.ts  # headless SVG render timing under jsdom
```

## Design principles (for future changes)

- **Keep it lean.** No framework. Prefer small helpers over dependencies.
- **Strict TS.** `strict` + `noUnused*` are on; keep them on. No `any`.
- **Deterministic visuals.** The tree uses a seeded PRNG (`mulberry32`) so
  layout is stable for the same data. Same logbook → same tree every reload.
- **Local-first.** No telemetry, no network calls. Everything lives in
  `localStorage`. If adding sync, make it opt-in.
- **Cozy aesthetic.** Serif type, earthy palette, soft shadows. Avoid neon,
  avoid hard blacks. Respect `prefers-color-scheme`.

## Key features

### Pan & zoom (panzoom.ts)
The canopy SVG auto-fits its viewBox to the rendered content via `getBBox()`.
Scroll-wheel zooms toward cursor; click-drag pans. The sky background rect
(`#sky-bg`) is resized to match the viewBox so there's no white gap.

### Milestones (tree.ts)
Detected automatically from sorted jump data:
- Jump number milestones: #100, #200, #500, #1000, #1500, #2000, #2500, #3000, #4000, #5000
- First jump in each non-student discipline
- Last student jump

Milestone leaves render 1.8× larger with a golden stroke ring and a pulsing
glow animation. The tooltip shows a `★ reason` badge.

### Seed scenarios (seed.ts)
Three demo datasets, each with realistic progression:
- **Fresh A-License** (~80 jumps, 1–2 seasons): student → belly → first freefly
- **Freefly Focus** (~400 jumps, 3 years): belly base → freefly ramp → coaching
- **Pro Swooper** (2000+ jumps, 8 years): student → canopy courses → competition swoop

Student jumps always land in the 27–45 range. Discipline mixes are realistic
(e.g., the pro swooper has zero wingsuit jumps). Seed data does not include
jump IDs — `store.ts` backfills them at load time via `uid()`.

### Bulk log modal (main.ts)
Keyboard-driven spreadsheet grid for rapid multi-jump entry. Tab between
fields, Enter on Notes spawns a new row carrying forward all values except
Notes. A "+" button provides mouse/tab access to the same action. Date
defaults to today; DZ and altitudes carry forward.

### Import / Export / Merge (main.ts)
- **Export**: downloads logbook as `shadetree-logbook-YYYY-MM-DD.json`
- **Import**: replaces the entire logbook from a JSON file
- **Merge**: appends only new jumps, deduplicating by `date|exitAltitude|deploymentAltitude`

## Domain notes

- **Discipline** enum: `belly`, `freefly`, `swoop`, `wingsuit`, `tracking`,
  `hop-pop`, `student`, `coach`, `aff`, `tandem`. The last three represent
  instructor / rated-work jumps. Adding one requires:
  - updating `Discipline` in `src/types.ts`
  - adding a `DISCIPLINE_LABEL` + `DISCIPLINE_ORDER` entry in `src/tree.ts`
  - adding a `DISC_BADGE` entry in `src/logbook.ts`
  - adding a `--disc-<name>` color in `src/styles.css`
  - adding an `<option>` to `index.html` (both the form and the bulk modal's `DISC_OPTIONS`)
- **Altitudes** are stored in feet (US skydiving convention). Freefall is
  computed as `exitAltitude − deploymentAltitude`.
- **Seasons** use meteorological northern-hemisphere ranges (`util.ts#seasonOf`).
- **Jump IDs** are internal-only (for DOM operations). They are not part of
  the data identity. Deduplication uses date + altitude. Seed data omits IDs;
  `store.ts` backfills them on load.

## Running

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + vite build -> dist/
npm run typecheck    # tsc --noEmit
npm run seed:check   # print scenario distribution stats
npm run render:check # headless SVG render timing
```

## Non-goals (for now)

- Multi-device sync or accounts.
- Real weather data.
- A full logbook replacement. This is a vibe-dashboard on top of jump data.
- External data source imports (FlySight, Paralog, etc.) — JSON only for now.
