# AGENTS.md — guidance for coding agents

ShadeTree is a tiny, single-page Vite + TypeScript app. A skydiver's logbook
rendered as a growing tree. No backend, no framework.

See `CLAUDE.md` for the full project brief. Short version for agents:

## Golden rules

1. **No new dependencies without a reason.** Vanilla DOM + SVG is the whole
   stack. If you reach for React, ask first.
2. **Keep TypeScript strict.** `strict`, `noUnusedLocals`, `noUnusedParameters`
   stay on. Don't use `any`; prefer narrow types.
3. **Determinism matters.** The tree layout is seeded via `mulberry32`. If you
   touch rendering, keep identical inputs → identical outputs.
4. **Local-first.** Don't add telemetry or network calls. Data lives in
   `localStorage` under `shadetree:v2:jumps`.
5. **Jump IDs are internal.** Seed data has no IDs. `store.ts` backfills them
   at load time. Deduplication uses `date|exitAltitude|deploymentAltitude`,
   not ID.

## Where things live

| Concern                | File                  |
| ---------------------- | --------------------- |
| Entrypoint / wiring    | `src/main.ts`         |
| Tree SVG renderer      | `src/tree.ts`         |
| Logbook UI             | `src/logbook.ts`      |
| Pan / zoom             | `src/panzoom.ts`      |
| Storage + ID backfill  | `src/store.ts`        |
| Demo scenario data     | `src/seed.ts`         |
| Types                  | `src/types.ts`        |
| PRNG / util            | `src/util.ts`         |
| Styling                | `src/styles.css`      |
| Page shell + tabs      | `index.html`          |

## Workflow

- `npm run dev` for the live loop at `http://localhost:5173`.
- `npm run typecheck` before committing.
- `npm run build` to verify the production bundle compiles.
- `npm run seed:check` to print scenario distribution stats.
- There is no test suite yet. If you add one, Vitest is the expected fit.

## Adding a discipline

Five files need edits:
1. `src/types.ts` — add to `Discipline` union
2. `src/tree.ts` — add to `DISCIPLINE_LABEL` and `DISCIPLINE_ORDER`
3. `src/logbook.ts` — add to `DISC_BADGE`
4. `src/styles.css` — add `--disc-<name>` color
5. `index.html` — add `<option>` to the form select AND update `DISC_OPTIONS`
   in `src/main.ts` (used by the bulk log modal)

## Seed scenarios

Three generators in `src/seed.ts`:
- **beginner** (~80 jumps): student → belly → first freefly
- **intermediate** (~400 jumps): freefly focus with belly base
- **pro-swooper** (2000+ jumps): competition canopy pilot

Student jumps always 27–45. Discipline mixes are career-realistic. The
`sampleJumps()` default is pro-swooper (used by scripts and initial load).

## Aesthetic notes

Earthy palette (`--bg`, `--ink`, `--accent`). Serif type. Soft shadows. No
neon. Dark mode follows `prefers-color-scheme`. Milestone leaves glow gold.
Keep the UI warm and cozy — it's a shade tree, not a dashboard.
