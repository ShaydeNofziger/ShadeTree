# ShadeTree

> Your jumps, growing.
>
> A cozy, local-first skydiver's companion that renders your logbook as a
> living tree and whispers you a fortune before every jump.

ShadeTree is a tiny single-page web app — no framework, no backend, no
telemetry — that turns a skydiving logbook into something you actually want to
look at:

- **Canopy** — your jumps rendered as an SVG tree. Trunk grows with the number
  of seasons you've been jumping. Branches fan out, one per discipline you've
  flown (up to ten — belly, freefly, tracking, swoop, wingsuit, hop & pop,
  plus instructor work: coach, AFF, tandem). Each leaf is a single jump, sized
  by freefall distance, colored by the season it happened in. The sample
  dataset is a ~7,000-jump, 18-year professional career so the tree is
  immediately dense and rich; real logbooks grow into it one leaf at a time.
- **Logbook** — a simple form and list for adding jumps. Everything persists
  to `localStorage` on your device.
- **Wind Oracle** — a deterministic-per-hour fortune generator. It reads the
  shape of your tree, rolls a compass heading, and writes you a small poem
  masquerading as a weather briefing. Stable within the same hour, different
  every hour, distinct for every logbook.

![discipline palette: belly, freefly, swoop, wingsuit, tracking, hop-pop, student](#)

## Why this exists (the reasoning)

I built this for someone whose GitHub reads like a dropzone manifest — FlySight
parsers, landing-pattern scripts, a WindsAloft PowerShell module, a
JumpMetrics AI tool. You already have hard, numerical tools for your jumps.
ShadeTree is the opposite of that: a place to feel the shape of a season
rather than measure it. A shady tree you sit under between loads.

Three threads braid through the design:

1. **Data you've already earned.** The most personal thing a skydiver owns is
   their logbook. Turning that into a tree means the app is meaningful on day
   one and more meaningful every Saturday.
2. **Ambient, personal AI-ish vibes — minus the AI.** The Wind Oracle is
   deliberately small and local: a seeded PRNG, mad-libs templates, and your
   own history nudging the output. It feels generative without ever phoning
   home. No tokens, no accounts, no leaking your logbook to a model.
3. **The cozy web, on purpose.** Serif type, warm palette, soft shadows, a
   gentle falling leaf. It's the opposite of a dashboard and that's the
   point.

The name is a small pun. A _shade tree_ is the one you park under; it's also
a twist on your own name. And in skydiving a _canopy_ is both a tree-top and
the thing keeping you alive at 1,500 feet.

## What's inside

```
src/
  main.ts       # wiring, tabs, form, tooltip, toast
  tree.ts       # SVG tree renderer (no deps)
  logbook.ts    # jump list + filter
  oracle.ts     # mantra generator (seeded PRNG)
  store.ts      # localStorage + seed bootstrap
  seed.ts       # sample jump history used on first run
  types.ts      # Jump / Discipline / Season
  util.ts       # mulberry32 PRNG, FNV hash, seasons, formatting
  styles.css    # cozy earthy palette, light + dark
index.html      # tabs + panels, loads /src/main.ts
public/favicon.svg
```

### Design choices worth calling out

- **No framework.** The whole thing is vanilla DOM + a hand-rolled SVG
  renderer. It's ~20 KB of JS gzipped.
- **Strict TypeScript.** `strict`, `noUnusedLocals`, and `noUnusedParameters`
  are on. There is no `any` in the source.
- **Deterministic visuals.** The tree layout uses a seeded `mulberry32` PRNG
  so the same logbook produces the same tree every reload. The Oracle's seed
  is `floor(now / 1h) + jumps.length + lastJumpId`, so the reading is steady
  inside an hour, shifts each hour, and reshapes itself as your logbook grows.
- **Local-first.** All jumps live in `localStorage` under
  `shadetree:v1:jumps`. Clearing your site data resets you to the seed tree.
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
   18-year pro career: student jumps taper into belly + freefly, coach and
   AFF/tandem branches appear as ratings stack up, and swoop + wingsuit
   bloom later. Hover any leaf to see its jump. Branch tips show jump counts
   per discipline so the tree doubles as a legend.
2. Switch to **Logbook** to add your own. The form defaults to a belly
   jump from 13,500 to 4,500. Hit **Plant leaf**, pop back to **Canopy**,
   and watch it appear.
3. Visit **Wind Oracle** and **Consult the winds**. The reading is seeded by
   the hour and your tree, so it'll hold steady if you take the walk to the
   aircraft and come back.
4. **Reset to sample tree** in the Logbook wipes your localStorage back to
   the seed if you want a clean canvas.

### Discipline palette

| Discipline | Color (approx) |
| --------- | -------------- |
| Belly     | deep green     |
| Freefly   | plum           |
| Swoop     | burnt amber    |
| Wingsuit  | dusk blue      |
| Tracking  | berry          |
| Hop & Pop | wheat          |
| Student   | soft gray      |

Each leaf's color is its _season_ (spring / summer / autumn / winter); the
badge color in the logbook is its _discipline_.

## Extending

See [`CLAUDE.md`](./CLAUDE.md) and [`AGENTS.md`](./AGENTS.md) for the
contributor / agent brief. Short version:

- **Add a discipline:** update `src/types.ts`, add labels to `src/tree.ts`
  and `src/logbook.ts`, add a `--disc-<name>` to `src/styles.css`, add an
  `<option>` to `index.html`.
- **Tune the Oracle:** add templates to `OPENERS` / `BODIES` / `CLOSERS` in
  `src/oracle.ts`. Keep the tone poetic and avoid giving a real forecast.
- **Swap the seed data:** edit `src/seed.ts`. The sample is a phased career
  generator — six life-phases (student → licensed novice → coach track →
  AFF/tandem rating → peak pro → specialist/mentor), each with its own
  discipline mix, monthly jump rate, and travel bias. The generator is
  seeded with `mulberry32` so the same `CLAUDE.md` commit always produces
  the same tree. `npm run seed:check` prints distribution stats; `npm run
  render:check` dry-runs the full SVG render under jsdom and times it.

## Non-goals

- Multi-device sync, accounts, or cloud storage. If that arrives, it'll be
  opt-in.
- Real weather data. The Oracle is a mood, not a briefing. Do not plan a
  jump off it.
- A full logbook replacement. This is a vibe-dashboard on top of jump data,
  not a substitute for Burble or your paper book.

## Credits & license

Built as a one-shot prototype for Shayde Nofziger, who writes a lot of
software about falling on purpose. The tree, the Oracle, and the seed data
are all original. Feel free to make it yours.

MIT — see [LICENSE](./LICENSE) if/when one is added.
