# AGENTS.md — guidance for coding agents

ShadeTree is a tiny, single-page Vite + TypeScript app. A skydiver's logbook,
rendered as a growing tree, plus a whimsical Wind Oracle. No backend.

See `CLAUDE.md` for the full project brief. Short version for agents:

## Golden rules

1. **No new dependencies without a reason.** Vanilla DOM + SVG is the whole
   stack. If you reach for React, ask first.
2. **Keep TypeScript strict.** `strict`, `noUnusedLocals`, `noUnusedParameters`
   stay on. Don't use `any`; prefer narrow types.
3. **Determinism matters.** The tree layout and Oracle output are seeded. If
   you touch those, keep identical inputs → identical outputs.
4. **Local-first.** Don't add telemetry or network calls. Data lives in
   `localStorage` under `shadetree:v1:jumps`.

## Where things live

| Concern              | File                  |
| -------------------- | --------------------- |
| Entrypoint / wiring  | `src/main.ts`         |
| Tree SVG renderer    | `src/tree.ts`         |
| Logbook UI           | `src/logbook.ts`      |
| Wind Oracle          | `src/oracle.ts`       |
| Storage + seed boot  | `src/store.ts`        |
| Sample jump history  | `src/seed.ts`         |
| Types                | `src/types.ts`        |
| PRNG / util          | `src/util.ts`         |
| Styling              | `src/styles.css`      |
| Page shell + tabs    | `index.html`          |

## Workflow

- `npm run dev` for the live loop at `http://localhost:5173`.
- `npm run typecheck` before committing.
- `npm run build` to verify the production bundle compiles.
- There is no test suite yet. If you add one, Vitest is the expected fit.

## Adding a discipline

A checklist appears in `CLAUDE.md`. Five files need small edits. The tree
will pick it up automatically once it's in the type + labels.

## Aesthetic notes

Earthy palette (`--bg`, `--ink`, `--accent`). Serif type. Soft shadows. No
neon. Dark mode follows `prefers-color-scheme`. Keep the Oracle copy poetic,
not clinical — it is deliberately not a weather briefing.
