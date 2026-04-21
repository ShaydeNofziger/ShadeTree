import type { Discipline, Jump } from "./types.ts";
import { mulberry32 } from "./util.ts";

// Dropzones weighted by career phase — home DZ dominates early, travel grows later.
const HOME_DZ = "Skydive Carolina";
const REGIONAL_DZ = [
  "Skydive Paraclete XP",
  "Raeford Drop Zone",
  "Skydive Orange",
];
const TRAVEL_DZ = [
  "Skydive Deland",
  "Skydive Perris",
  "Skydive Arizona",
  "Skydive Elsinore",
  "Skydive Chicago",
  "Skydive Sebastian",
  "Empuriabrava",
  "Dubai DZ",
  "Skydive Spaceland Houston",
];

interface Phase {
  name: string;
  months: number;
  baseJumpsPerMonth: number;
  // Discipline weights (probabilities sum implicitly; renormalized below).
  mix: Partial<Record<Discipline, number>>;
  // Chance (0..1) of a non-home DZ per jump.
  travelBias: number;
}

// 17-year career progression — lightly fictionalized, plausibly pro.
const PHASES: Phase[] = [
  {
    name: "student",
    months: 4,
    baseJumpsPerMonth: 12,
    mix: { student: 0.88, "hop-pop": 0.12 },
    travelBias: 0,
  },
  {
    name: "licensed-novice",
    months: 14,
    baseJumpsPerMonth: 20,
    mix: {
      belly: 0.52,
      freefly: 0.18,
      tracking: 0.1,
      "hop-pop": 0.12,
      student: 0.08,
    },
    travelBias: 0.05,
  },
  {
    name: "coach-track",
    months: 24,
    baseJumpsPerMonth: 26,
    mix: {
      belly: 0.3,
      coach: 0.24,
      freefly: 0.22,
      tracking: 0.12,
      "hop-pop": 0.08,
      student: 0.04,
    },
    travelBias: 0.1,
  },
  {
    name: "aff-tandem-rating",
    months: 36,
    baseJumpsPerMonth: 38,
    mix: {
      aff: 0.24,
      tandem: 0.22,
      coach: 0.12,
      belly: 0.14,
      freefly: 0.14,
      tracking: 0.08,
      "hop-pop": 0.06,
    },
    travelBias: 0.18,
  },
  {
    name: "peak-pro",
    months: 72,
    baseJumpsPerMonth: 46,
    mix: {
      tandem: 0.2,
      aff: 0.16,
      freefly: 0.16,
      coach: 0.1,
      swoop: 0.1,
      wingsuit: 0.08,
      tracking: 0.1,
      belly: 0.06,
      "hop-pop": 0.04,
    },
    travelBias: 0.35,
  },
  {
    name: "specialist-mentor",
    months: 54,
    baseJumpsPerMonth: 34,
    mix: {
      swoop: 0.18,
      wingsuit: 0.16,
      coach: 0.16,
      tandem: 0.14,
      aff: 0.1,
      freefly: 0.1,
      tracking: 0.08,
      belly: 0.05,
      "hop-pop": 0.03,
    },
    travelBias: 0.4,
  },
];

// Season modifier — US northern hemisphere, summer peaks, winter slows.
const SEASON_MULT = [0.5, 0.55, 0.75, 1.0, 1.15, 1.25, 1.3, 1.25, 1.1, 0.95, 0.7, 0.5];

// Discipline altitude profiles (exit, deployment) in feet.
const ALT: Record<Discipline, { exit: [number, number]; deploy: [number, number] }> = {
  student:   { exit: [13000, 13500], deploy: [5500, 5800] },
  belly:     { exit: [13500, 14000], deploy: [4500, 5000] },
  freefly:   { exit: [13500, 14500], deploy: [4500, 5000] },
  tracking:  { exit: [13500, 14500], deploy: [4500, 5000] },
  wingsuit:  { exit: [13500, 14500], deploy: [3800, 4500] },
  swoop:     { exit: [5000, 5500],   deploy: [4800, 5200] },
  "hop-pop": { exit: [4500, 5500],   deploy: [4400, 5400] },
  coach:     { exit: [13500, 14000], deploy: [4500, 5000] },
  aff:       { exit: [13500, 14000], deploy: [5000, 5500] },
  tandem:    { exit: [13000, 14000], deploy: [5200, 5800] },
};

// Milestone notes by jump number — these get attached if the jump aligns.
const MILESTONES: Array<{ at: number; note: string; disc?: Discipline }> = [
  { at: 1, note: "Tandem one. The first door opens; nothing since has looked the same.", disc: "tandem" },
  { at: 6, note: "AFF Cat A solo exit. Heart in my throat, arch in my spine.", disc: "student" },
  { at: 25, note: "A-license check dive. Licensed to be dumb on purpose.", disc: "belly" },
  { at: 100, note: "Hundredth jump. Beer line at the packing mat. Paid gladly." },
  { at: 200, note: "Coach rating checkout. First time I heard myself debrief calmly.", disc: "coach" },
  { at: 500, note: "Five hundred. Wings felt re-sewn on.", disc: "freefly" },
  { at: 750, note: "AFF Instructor exam passed. Now I owe a lot of students a lot of careful seconds.", disc: "aff" },
  { at: 1000, note: "One thousand. Watched the sun come up over the hangar before the first lift." },
  { at: 1250, note: "Tandem Instructor rating. The back harness is its own conversation.", disc: "tandem" },
  { at: 1500, note: "First wingsuit flight with a coach. The legs. The LEGS.", disc: "wingsuit" },
  { at: 2000, note: "Swoop course graduation — 270° through the gates, clean.", disc: "swoop" },
  { at: 2500, note: "First paid demo weekend. Smoke, crowd, holding the bearing." },
  { at: 3000, note: "Three thousand. The numbers stopped feeling like numbers." },
  { at: 3500, note: "Wingsuit flock over Elsinore. Eighteen of us; no one lost the formation.", disc: "wingsuit" },
  { at: 4000, note: "Competed at the Carolina Classic — PPC speed round. The line forgave me twice.", disc: "swoop" },
  { at: 5000, note: "Five thousand. Bought the gear I wanted at twenty. Humility intact." },
  { at: 6000, note: "Took a first-time tandem who refused to stop grinning. Remembered why I started.", disc: "tandem" },
  { at: 7000, note: "Seven thousand. Coached a student who was better in week two than I was in year two.", disc: "coach" },
];

const FLAVOR_NOTES = [
  "sunset load, honeysuckle on the taxiway",
  "glass-off air, nobody wanted to go home",
  "frost on the turbine at first lift",
  "low ceiling, hop-and-pop sortie",
  "beachfront winds — grateful for a long pattern",
  "desert thermals lifting the whole pattern",
  "ride up, nobody spoke, everyone smiled",
  "first load of the season, trunk of the car still had last October's leaves",
  "new canopy, old jumper — cautious first flight",
  "recovery arc felt right, landing line didn't lie",
  "mentoring a rookie all day, drank the chai the manifest girl made",
  "thunderstorm on the west edge, we called it after eight",
  "holiday demo, flag jump into a little-league field",
  "funnel on the hill; no contact, everyone laughed",
];

export function sampleJumps(): Jump[] {
  const rand = mulberry32(0xc0_0b_5e_ed); // "cool seed"
  const jumps: Jump[] = [];

  const today = new Date();
  // Start the career 17 years and a little ago, in May (good month to start).
  const careerStart = new Date(today.getFullYear() - 17, 3, 14); // Apr 14

  let cursor = new Date(careerStart);
  const cutoff = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // stop a week ago
  let idCounter = 0;

  for (let p = 0; p < PHASES.length; p++) {
    const phase = PHASES[p]!;
    const disciplines = normalizeMix(phase.mix);

    for (let m = 0; m < phase.months; m++) {
      if (cursor > cutoff) break;

      const monthIdx = cursor.getMonth();
      const yearN = cursor.getFullYear();
      const seasonMult = SEASON_MULT[monthIdx]!;
      const jitter = 0.8 + rand() * 0.4;
      const targetCount = Math.round(
        phase.baseJumpsPerMonth * seasonMult * jitter,
      );

      const daysInMonth = new Date(yearN, monthIdx + 1, 0).getDate();

      for (let k = 0; k < targetCount; k++) {
        const day = 1 + Math.floor(rand() * daysInMonth);
        const date = new Date(yearN, monthIdx, day);
        if (date > cutoff) break;

        const discipline = pickWeighted(disciplines, rand);
        const profile = ALT[discipline];
        const exit = randInt(profile.exit[0], profile.exit[1], rand);
        // Deployment capped below exit with a floor.
        const deploy = Math.min(
          exit - 400,
          randInt(profile.deploy[0], profile.deploy[1], rand),
        );

        const dz = pickDropzone(phase.travelBias, rand);

        const jumpNumber = jumps.length + 1;
        const milestone = MILESTONES.find(
          (ms) => ms.at === jumpNumber && (!ms.disc || ms.disc === discipline),
        );
        const notes = milestone
          ? milestone.note
          : rand() < 0.04
            ? FLAVOR_NOTES[Math.floor(rand() * FLAVOR_NOTES.length)]!
            : undefined;

        jumps.push({
          id: `j${String(idCounter++).padStart(6, "0")}`,
          date: toIso(date),
          discipline,
          exitAltitude: exit,
          deploymentAltitude: deploy,
          dropzone: dz,
          notes,
        });
      }

      cursor = new Date(yearN, monthIdx + 1, 1);
    }
  }

  // Any milestones that didn't land on the exact jump number get stapled onto
  // the nearest un-noted jump so the important stories still show up.
  for (const ms of MILESTONES) {
    const j = jumps[ms.at - 1];
    if (!j || j.notes) continue;
    if (ms.disc && j.discipline !== ms.disc) {
      // Look within ±10 jumps for a matching-discipline landing spot.
      for (let d = 1; d <= 10; d++) {
        const a = jumps[ms.at - 1 + d];
        const b = jumps[ms.at - 1 - d];
        if (a && !a.notes && (!ms.disc || a.discipline === ms.disc)) {
          a.notes = ms.note;
          break;
        }
        if (b && !b.notes && (!ms.disc || b.discipline === ms.disc)) {
          b.notes = ms.note;
          break;
        }
      }
    } else {
      j.notes = ms.note;
    }
  }

  return jumps.sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeMix(
  mix: Partial<Record<Discipline, number>>,
): Array<{ d: Discipline; w: number }> {
  const entries = Object.entries(mix) as Array<[Discipline, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  return entries.map(([d, w]) => ({ d, w: w / total }));
}

function pickWeighted(
  options: Array<{ d: Discipline; w: number }>,
  rand: () => number,
): Discipline {
  const r = rand();
  let acc = 0;
  for (const o of options) {
    acc += o.w;
    if (r <= acc) return o.d;
  }
  return options[options.length - 1]!.d;
}

function pickDropzone(travelBias: number, rand: () => number): string {
  const roll = rand();
  if (roll < 1 - travelBias) return HOME_DZ;
  if (roll < 1 - travelBias / 3) {
    return REGIONAL_DZ[Math.floor(rand() * REGIONAL_DZ.length)]!;
  }
  return TRAVEL_DZ[Math.floor(rand() * TRAVEL_DZ.length)]!;
}

function randInt(lo: number, hi: number, rand: () => number): number {
  return Math.round(lo + rand() * (hi - lo));
}

function toIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
