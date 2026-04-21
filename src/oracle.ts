import type { Jump } from "./types.ts";
import { hashString, mulberry32, seasonOf } from "./util.ts";

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
type Direction = (typeof DIRECTIONS)[number];

const OPENERS = [
  "The winds from {dir} arrive {adj}, carrying {noun}.",
  "A {adj} current stirs out of the {dir}, hinting at {noun}.",
  "{dir} holds its breath; somewhere in it waits {noun}.",
  "Between cloudbase and treeline, a {adj} thread of {noun} from {dir}.",
];

const BODIES = [
  "Trust the {trust}; the {surface} will receive you.",
  "Your canopy will hear {song} before your feet do.",
  "Exit {exit}. The first second is the one to {verb}.",
  "The {discipline} line is open today — {instruct}.",
  "A {adj} flare awaits whoever {condition}.",
];

const CLOSERS = [
  "Sky-clear, eyes-soft.",
  "Altitude is generous today.",
  "The gates will forgive a slow heart.",
  "Land where the grass remembers you.",
  "Breathe at the pilot chute.",
];

const NOUNS = [
  "warm updraft",
  "sheet lightning from three states away",
  "a season's first thermals",
  "honeysuckle off the taxiway",
  "distant cumulus building like bread",
  "the whisper of a good wind sock",
  "salt air from a coast you haven't flown",
];

const ADJECTIVES = [
  "patient",
  "restless",
  "even-handed",
  "lazy",
  "blue-hour",
  "ceremonial",
  "glassy",
  "braided",
];

const TRUSTS = ["arch", "line", "heading", "count", "instincts", "eyes up"];
const SURFACES = ["grass", "gates", "dirt", "pea gravel", "concrete line", "turf"];
const SONGS = [
  "an old bell",
  "a kettle coming up to temp",
  "a slow harmonica",
  "Saturday crickets",
  "two kids laughing at the manifest",
];
const EXITS = ["stable", "diving", "floater", "clean", "poised"];
const VERBS = ["spend well", "protect", "listen through", "simply breathe in"];
const INSTRUCTS = [
  "keep the bearing",
  "carry the grip",
  "float the step",
  "stay long on the heading",
  "let the burble go",
];
const CONDITIONS = [
  "flies the pattern first",
  "lands downwind on purpose",
  "counts to four after the pilot chute",
  "watches the sock, not the clock",
];

const DISCIPLINE_LIKELIHOOD: Record<string, string[]> = {
  spring: ["belly", "freefly", "hop-pop"],
  summer: ["swoop", "freefly", "tracking"],
  autumn: ["wingsuit", "tracking", "belly"],
  winter: ["hop-pop", "belly", "student"],
};

export interface Fortune {
  direction: Direction;
  headingDeg: number; // 0..360
  windKnots: number;
  ceilingFt: number;
  mantra: string;
  forecast: {
    discipline: string;
    gates: string;
    visibility: string;
  };
  season: ReturnType<typeof seasonOf>;
}

export function rollFortune(jumps: Jump[], now = new Date()): Fortune {
  // Seed stays stable within the same calendar hour but varies otherwise,
  // plus a nudge from the tree's size so personal history matters.
  const hourBucket = Math.floor(now.getTime() / (1000 * 60 * 60));
  const seed =
    hashString(
      String(hourBucket) + "|" + jumps.length + "|" + (jumps.at(-1)?.id ?? ""),
    ) >>> 0;
  const rand = mulberry32(seed);

  const direction = DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)]!;
  const headingDeg = DIRECTIONS.indexOf(direction) * 45;
  const windKnots = Math.round(4 + rand() * 16);
  const ceilingFt = 6000 + Math.floor(rand() * 8000);
  const season = seasonOf(now.toISOString().slice(0, 10));

  const pool = DISCIPLINE_LIKELIHOOD[season]!;
  const flavored = jumps.length
    ? Array.from(new Set([...pool, jumps[jumps.length - 1]!.discipline]))
    : pool;
  const discipline = flavored[Math.floor(rand() * flavored.length)]!;

  const mantra =
    fill(pick(OPENERS, rand), {
      dir: direction,
      adj: pick(ADJECTIVES, rand),
      noun: pick(NOUNS, rand),
    }) +
    " " +
    fill(pick(BODIES, rand), {
      trust: pick(TRUSTS, rand),
      surface: pick(SURFACES, rand),
      song: pick(SONGS, rand),
      exit: pick(EXITS, rand),
      verb: pick(VERBS, rand),
      discipline,
      instruct: pick(INSTRUCTS, rand),
      condition: pick(CONDITIONS, rand),
      adj: pick(ADJECTIVES, rand),
    }) +
    " " +
    pick(CLOSERS, rand);

  const gatesOpen = rand() > 0.35;

  return {
    direction,
    headingDeg,
    windKnots,
    ceilingFt,
    mantra,
    forecast: {
      discipline: titleCase(discipline),
      gates: gatesOpen ? "open" : "teasing",
      visibility:
        rand() > 0.5 ? "gin-clear" : rand() > 0.5 ? "soft" : "hazy-gold",
    },
    season,
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function titleCase(s: string): string {
  return s.replace(/(^|-)(\w)/g, (_, sep, c: string) =>
    (sep ? " " : "") + c.toUpperCase(),
  );
}
