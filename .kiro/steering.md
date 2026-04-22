# ShadeTree — Kiro steering

## Project overview

ShadeTree is a local-first, single-page skydiving logbook visualizer.
Jumps render as leaves on an SVG tree. No backend, no framework, no accounts.

Tech: Vite + strict TypeScript + vanilla DOM + hand-rolled SVG.

## Quick commands

```bash
npm run dev          # dev server at localhost:5173
npm run typecheck    # tsc --noEmit (run before committing)
npm run build        # typecheck + production bundle
npm run seed:check   # print demo scenario stats
```

## Architecture at a glance

- `src/main.ts` — app entry: tabs, forms, bulk-log modal, import/export/merge, tooltips
- `src/tree.ts` — SVG tree renderer + milestone detection (seeded PRNG for determinism)
- `src/panzoom.ts` — viewBox-based pan/zoom, auto-fits content via getBBox()
- `src/logbook.ts` — jump list rendering with filter + delete
- `src/store.ts` — localStorage persistence, scenario loading, ID backfill
- `src/seed.ts` — 3 demo scenarios (beginner ~80, intermediate ~400, pro-swooper 2000+)
- `src/types.ts` — Jump, Discipline, Season types
- `src/util.ts` — mulberry32 PRNG, FNV hash, season helpers, uid, date formatting
- `src/styles.css` — earthy palette, light/dark via prefers-color-scheme

## Constraints

- No `any` in TypeScript. Strict mode is non-negotiable.
- No new npm dependencies without explicit approval.
- No network calls or telemetry. All data stays in localStorage.
- Tree rendering must be deterministic: same data → same visual output.
- Jump IDs are internal (for DOM). Dedup uses `date|exitAltitude|deploymentAltitude`.
- Seed data does not include IDs — store.ts assigns them at load time.
- Student jump counts in seed scenarios must stay in the 27–45 range.

## Common tasks

### Add a discipline
Edit 5 files: `types.ts` (union), `tree.ts` (label + order), `logbook.ts`
(badge), `styles.css` (color var), `index.html` (option) + `main.ts`
(DISC_OPTIONS for bulk modal).

### Add a seed scenario
Add a function in `seed.ts` following the existing pattern (phases with
month count, jumps/month, discipline mix, travel bias). Add to `SCENARIOS`
array. Run `npm run seed:check` to verify distribution.

### Modify tree rendering
The tree uses seeded PRNG per discipline branch. Changes must preserve
determinism. Test with `npm run render:check` for timing. The sky background
rect (`#sky-bg`) is resized by panzoom.ts to cover the full viewBox.

### Modify milestones
Milestone detection is in `tree.ts` after the `jumpById` map. Currently
detects: round jump numbers, first-in-discipline, last student jump.
Milestone leaves get class `.milestone` with golden ring + glow animation.
