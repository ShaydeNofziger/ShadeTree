# ShadeTree

> Your jumps, growing.
>
> A cozy, local-first skydiver's companion that renders your logbook as a
> living tree.

ShadeTree is a tiny single-page web app — no framework, no backend, no
telemetry — that turns a skydiving logbook into something you actually want to
look at:

- **Canopy** — your jumps rendered as an SVG tree with pan, zoom, and
  pinch-to-zoom on mobile. Trunk grows with the number of seasons you've been
  jumping. Branches fan out, one per discipline you've flown (up to eleven —
  belly, freefly, tracking, swoop, wingsuit, hop & pop, student, coach, AFF,
  tandem instructor, tandem student). Each leaf is a single jump, sized by
  freefall distance, colored by the season it happened in. Milestone jumps
  glow gold. A timeline scrubber lets you rewind through your career. An
  About modal (?) explains how the tree is drawn.
- **Highlights** — auto-generated career highlights and stats.
- **Logbook** — add, delete, bulk-log, import, export, and merge jumps.
  Filter by date range, discipline, or dropzone. Paginated at 100 jumps per
  page. Everything persists to `localStorage` on your device.

## Why this exists

I built this for someone whose GitHub reads like a dropzone manifest — FlySight
parsers, landing-pattern scripts, a WindsAloft PowerShell module, a
JumpMetrics AI tool. You already have hard, numerical tools for your jumps.
ShadeTree is the opposite of that: a place to feel the shape of a season
rather than measure it. A shady tree you sit under between loads.

Two threads braid through the design:

1. **Data you've already earned.** The most personal thing a skydiver owns is
   their logbook. Turning that into a tree means the app is meaningful on day
   one and more meaningful every Saturday.
2. **The cozy web, on purpose.** Serif type, warm palette, soft shadows, a
   gentle falling leaf. It's the opposite of a dashboard and that's the
   point.

The name is a small pun. A _shade tree_ is the one you park under; it's also
a twist on your own name. And in skydiving a _canopy_ is both a tree-top and
the thing keeping you alive at 1,500 feet.

## What's inside

```
src/
  main.ts         # wiring, tabs, form, tooltip, toast, modals, filters
  tree.ts         # SVG tree renderer + milestone detection (no deps)
  logbook.ts      # jump list, pagination, structured filters
  highlights.ts   # career highlights panel
  panzoom.ts      # viewBox pan/zoom + pinch-to-zoom (mouse & touch)
  store.ts        # localStorage + seed bootstrapping + ID backfill
  seed.ts         # 3 scenario generators (beginner / intermediate / pro)
  types.ts        # Jump / Discipline / Season
  util.ts         # mulberry32 PRNG, FNV hash, seasons, formatting, uid
  styles.css      # cozy earthy palette, light + dark
index.html        # tabs + panels + modals, loads /src/main.ts
public/favicon.svg
```

### Design choices worth calling out

- **No framework.** The whole thing is vanilla DOM + a hand-rolled SVG
  renderer. It's ~20 KB of JS gzipped.
- **Strict TypeScript.** `strict`, `noUnusedLocals`, and `noUnusedParameters`
  are on. There is no `any` in the source.
- **Deterministic visuals.** The tree layout uses a seeded `mulberry32` PRNG
  so the same logbook produces the same tree every reload.
- **Local-first.** All jumps live in `localStorage` under
  `shadetree:v2:jumps`. Clearing your site data resets you to the seed tree.
- **Accessible-ish.** Leaves are focusable; tabs are real buttons; the color
  palette holds up in dark mode via `prefers-color-scheme`.

## Getting it running

Requires Node 18+ (Node 20 recommended).

```bash
git clone https://github.com/ShaydeNofziger/ShadeTree.git
cd ShadeTree
npm install
npm run dev
```

Then open <http://localhost:5173>.

Other scripts:

```bash
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + production bundle -> dist/
npm run preview      # serve the production bundle locally
npm run seed:check   # print the sample career's distribution stats
npm run render:check # headless-render the full seed under jsdom, time it
```

## How to use it

1. Start on **Canopy** — you'll see a seeded tree representing a fictional
   pro career. Hover any leaf to see its jump. Branch tips show jump counts
   per discipline. Use the timeline scrubber to rewind through the career.
   Pan by dragging, zoom with scroll wheel or pinch on mobile. The ⌂ button
   resets the view; the ? button explains how the tree is drawn.
2. Check **Highlights** for auto-generated career stats and milestones.
3. Switch to **Logbook** to add your own jumps. The form defaults to a belly
   jump from 13,500 to 4,500. Hit **Plant leaf**, pop back to **Canopy**,
   and watch it appear. Use the filters (date range, discipline, dropzone)
   to find specific jumps. The ⚙ menu has import, export, merge, and
   clear-all tools.
4. Load a different **scenario** from the scenario picker to see how
   beginner, intermediate, or pro-swooper trees look.

### Discipline palette

| Discipline        | Color (approx) |
| ----------------- | -------------- |
| Belly             | deep green     |
| Freefly           | plum           |
| Swoop             | burnt amber    |
| Wingsuit          | dusk blue      |
| Tracking          | berry          |
| Hop & Pop         | wheat          |
| Student           | soft gray      |
| Coach             | teal           |
| AFF Instr.        | slate          |
| Tandem Instr.     | steel blue     |
| Tandem Student    | light blue     |

Each leaf's color is its _season_ (spring / summer / autumn / winter); the
badge color in the logbook is its _discipline_.

## Extending

See [`CLAUDE.md`](./CLAUDE.md) and [`AGENTS.md`](./AGENTS.md) for the
contributor / agent brief. Short version:

- **Add a discipline:** update `src/types.ts`, add labels to `src/tree.ts`
  and `src/logbook.ts`, add a `--disc-<name>` to `src/styles.css`, add an
  `<option>` to `index.html`, and update `DISC_OPTIONS` in `src/main.ts`.
- **Swap the seed data:** edit `src/seed.ts`. Three scenario generators
  (beginner, intermediate, pro-swooper) with phased career progression.
  `npm run seed:check` prints distribution stats; `npm run render:check`
  dry-runs the full SVG render under jsdom and times it.

## Non-goals

- Multi-device sync, accounts, or cloud storage. If that arrives, it'll be
  opt-in.
- A full logbook replacement. This is a vibe-dashboard on top of jump data,
  not a substitute for Burble or your paper book.

## Credits & license

Built as a one-shot prototype for Shayde Nofziger, who writes a lot of
software about falling on purpose. The tree and the seed data are all
original. Feel free to make it yours.

MIT — see [LICENSE](./LICENSE) if/when one is added.
