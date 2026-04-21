# ShadeTree — project context

> A cozy, personalized prototype: render a skydiver's jump history as a living
> tree and pair it with a poetic "Wind Oracle." Zero backend, all-local.

## What this repo is

ShadeTree is a single-page web app built with **Vite + TypeScript + vanilla DOM**
(no framework). It has three surfaces:

1. **Canopy** — an SVG tree. Trunk grows with years active. Branches fan out,
   one per discipline flown. Each leaf is a jump, sized by freefall distance
   and colored by season. Hover a leaf to see the jump.
2. **Logbook** — add/delete jumps. Persists to `localStorage` under
   `shadetree:v1:jumps`. A "Reset to sample tree" button restores seeded data.
3. **Wind Oracle** — a deterministic-per-hour fortune generator. Pulls from
   mad-libs style templates plus the logbook to produce a mantra, a compass
   heading, and a light "forecast" card.

## Stack & layout

```
src/
  main.ts       # wiring, tabs, form, tooltip, toast
  tree.ts       # SVG tree renderer (no deps)
  logbook.ts    # jump list + filter
  oracle.ts     # mantra generator (seeded PRNG)
  store.ts      # localStorage + seed bootstrapping
  seed.ts       # sample jump history used on first run
  types.ts      # Jump / Discipline / Season
  util.ts       # PRNG (mulberry32), FNV hash, seasons, formatting
  styles.css    # cozy, earthy palette (light + dark)
index.html      # tabs + panels, loads /src/main.ts
public/favicon.svg
vite.config.ts  # port 5173
tsconfig.json   # strict, bundler resolution
```

## Design principles (for future changes)

- **Keep it lean.** No framework. Prefer small helpers over dependencies.
- **Strict TS.** `strict` + `noUnused*` are on; keep them on.
- **Deterministic visuals.** The tree uses a seeded PRNG (`mulberry32`) so
  layout is stable for the same data. Oracle output is seeded per hour +
  logbook, so "Consult the winds" gives the same reading inside an hour.
- **Local-first.** No telemetry, no network calls. Everything lives in
  `localStorage`. If adding sync, make it opt-in.
- **Cozy aesthetic.** Serif type, earthy palette, soft shadows. Avoid neon,
  avoid hard blacks. Respect `prefers-color-scheme`.

## Domain notes

- **Discipline** enum: `belly`, `freefly`, `swoop`, `wingsuit`, `tracking`,
  `hop-pop`, `student`. Adding one requires:
  - updating `Discipline` in `src/types.ts`
  - adding a `DISCIPLINE_LABEL` + `DISCIPLINE_ORDER` entry in `src/tree.ts`
  - adding a `DISC_BADGE` entry in `src/logbook.ts`
  - adding a `--disc-<name>` color in `src/styles.css`
  - adding an `<option>` to `index.html`
- **Altitudes** are stored in feet (US skydiving convention). Freefall is
  computed as `exitAltitude − deploymentAltitude`.
- **Seasons** use meteorological northern-hemisphere ranges (`util.ts#seasonOf`).

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + vite build -> dist/
npm run typecheck  # tsc --noEmit
```

Vite serves `/src/main.ts` as an ES module. There's no test suite yet — the
tight feedback loop is "save → reload".

## Non-goals (for now)

- Multi-device sync or accounts.
- Real weather data (the Oracle is deliberately whimsical, not a briefing).
- A full logbook replacement. This is a vibe-dashboard on top of jump data.
