# ShadeTree — project context

> A cozy, personalized prototype: render a skydiver's jump history as a living
> tree. Zero backend, all-local.

## What this repo is

ShadeTree is a single-page web app built with **Vite + TypeScript + vanilla DOM**
(no framework). It has three surfaces:

1. **Canopy** — an SVG tree with pan/zoom (mouse wheel + pinch-to-zoom on
   mobile). Trunk grows with years active. Branches fan out, one per
   discipline flown (up to eleven). Each leaf is a jump, sized by freefall
   distance and colored by season. Milestone jumps (round numbers,
   first-in-discipline, last student jump) glow with a golden ring. Hover any
   leaf to see the jump details. A timeline scrubber rewinds through the
   career. The ⌂ button resets zoom; the ? button opens an About modal
   explaining how the tree is drawn.
2. **Highlights** — auto-generated career stats and milestones.
3. **Logbook** — add/delete/bulk-log jumps. Structured filters (date range,
   discipline, dropzone) plus freeform text search. Paginated at 100 jumps
   per page. Persists to `localStorage` under `shadetree:v2:jumps`. A ⚙
   tools dropdown provides import/export/merge (JSON) and clear-all. Three
   demo scenarios (beginner, intermediate, pro swooper) can be loaded from
   the scenario picker.

## Stack & layout

```
src/
  main.ts         # wiring, tabs, form, tooltip, toast, modals, filters, tools dropdown
  tree.ts         # SVG tree renderer + milestone detection (no deps)
  logbook.ts      # jump list, pagination, structured filters
  highlights.ts   # career highlights panel
  panzoom.ts      # viewBox pan/zoom + pinch-to-zoom (mouse & touch)
  store.ts        # localStorage + seed bootstrapping + ID backfill
  seed.ts         # 3 scenario generators (beginner / intermediate / pro swooper)
  types.ts        # Jump / Discipline / Season
  util.ts         # PRNG (mulberry32), FNV hash, seasons, formatting, uid
  styles.css      # cozy, earthy palette (light + dark)
index.html        # tabs + panels + modals, loads /src/main.ts
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
Scroll-wheel zooms toward cursor; click-drag pans. On mobile, pinch-to-zoom
is handled via multi-pointer tracking. The sky background rect (`#sky-bg`) is
resized on every viewBox change so there's no white gap when zooming out.
`resetView()` snaps back to the fitted state. `touch-action: none` is set on
the SVG to prevent browser gesture interference.

### Timeline scrubber (main.ts)
A range slider on the Canopy panel lets users rewind through their career.
`state.asOf` holds the cutoff ISO date (`null` = show all). The scrubber
auto-scales to the career span and shows year tick marks. A "today" button
snaps back to the latest jump.

### Milestones (tree.ts)
Detected automatically from sorted jump data:
- Jump number milestones: #100, #200, #500, #1000, #1500, #2000, #2500, #3000, #4000, #5000
- First jump in each non-student discipline
- Last student jump

Milestone leaves render 1.8× larger with a golden stroke ring. The tooltip
shows a `★ reason` badge.

### Highlights (highlights.ts)
Auto-generated career stats panel. Rendered when the Highlights tab is
activated.

### Structured filters (logbook.ts)
The logbook supports five filter dimensions (AND logic):
- Date range (from / to)
- Discipline (select)
- Dropzone (select, dynamically populated from jump data)
- Freeform text search

All filters reset pagination to page 1. Pagination is 100 jumps per page
with Prev/Next navigation.

### Tools dropdown (main.ts)
A ⚙ gear button in the logbook header opens a dropdown with:
- Export (JSON download)
- Import (replace logbook from JSON)
- Merge (append new jumps, deduplicating by `date|exitAltitude|deploymentAltitude`)
- Format help (shows expected JSON structure)
- Clear all (destructive, with `confirm()` dialog)

### About modal (main.ts + index.html)
A ? button on the Canopy panel opens a modal explaining:
- Leaf placement (chronological order + deterministic scatter)
- Leaf size (freefall distance)
- Leaf color (season)
- Milestone glow (gold ring)
- Trunk height (number of seasons)

### Seed scenarios (seed.ts)
Three demo datasets, each with realistic progression:
- **Fresh A-License** (~80 jumps, 1–2 seasons): tandem student → AFF student → belly → first freefly
- **Freefly Focus** (~400 jumps, 3 years): tandem student → student → belly base → freefly ramp → coaching
- **Pro Swooper** (2000+ jumps, 8 years): student → canopy courses → competition swoop + tandem-instructor work

Student jumps always land in the 27–45 range. Discipline mixes are realistic.
Seed data does not include jump IDs — `store.ts` backfills them at load time
via `uid()`.

### Bulk log modal (main.ts)
Keyboard-driven spreadsheet grid for rapid multi-jump entry. Tab between
fields, Enter on Notes spawns a new row carrying forward all values except
Notes. Modal focuses the first input on open so users can start tabbing
immediately.

### Import / Export / Merge (main.ts)
- **Export**: downloads logbook as `shadetree-logbook-YYYY-MM-DD.json`
- **Import**: replaces the entire logbook from a JSON file
- **Merge**: appends only new jumps, deduplicating by `date|exitAltitude|deploymentAltitude`

## Domain notes

- **Discipline** enum (11 values): `belly`, `freefly`, `swoop`, `wingsuit`,
  `tracking`, `hop-pop`, `student`, `coach`, `aff`, `tandem-instructor`,
  `tandem-student`. Adding one requires edits to:
  - `src/types.ts` — `Discipline` union
  - `src/tree.ts` — `DISCIPLINE_LABEL` + `DISCIPLINE_ORDER`
  - `src/logbook.ts` — `DISC_BADGE`
  - `src/highlights.ts` — `DISC_LABEL`
  - `src/styles.css` — `--disc-<name>` variable + `.disc-<name>` class
  - `index.html` — `<option>` in form select + filter select
  - `src/main.ts` — `DISC_OPTIONS` in bulk modal
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
- A full logbook replacement. This is a vibe-dashboard on top of jump data.
- External data source imports (FlySight, Paralog, etc.) — JSON only for now.
