import type { Discipline, Jump } from "./types.ts";
import { mulberry32 } from "./util.ts";

/* ── Scenario registry ─────────────────────────────────────────────── */

export type ScenarioId = "beginner" | "intermediate" | "pro-swooper";

export interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  generate: () => Jump[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "beginner",
    label: "Fresh A-License",
    description: "1–2 seasons, ~80 jumps. Student progression into belly and first freefly.",
    generate: beginnerJumps,
  },
  {
    id: "intermediate",
    label: "Freefly Focus",
    description: "~400 jumps over 3 years. Belly base with a growing freefly habit.",
    generate: intermediateJumps,
  },
  {
    id: "pro-swooper",
    label: "Pro Swooper",
    description: "2 000+ jumps over 8 years. Competition canopy pilot — swoop is life.",
    generate: proSwooperJumps,
  },
];

/** Default export kept for backward compat (scripts, store fallback). */
export function sampleJumps(): Jump[] {
  return proSwooperJumps();
}

export function scenarioById(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id)!;
}

/* ── Shared infrastructure ─────────────────────────────────────────── */

const HOME_DZ = "Skydive Carolina";
const REGIONAL: string[] = ["Skydive Paraclete XP", "Skydive Orange"];
const TRAVEL: string[] = [
  "Skydive Deland", "Skydive Perris", "Skydive Arizona", "Skydive Elsinore",
  "Skydive Chicago", "Skydive Sebastian", "Skydive Spaceland Houston",
];

const SEASON_MULT = [0.5, 0.55, 0.75, 1.0, 1.15, 1.25, 1.3, 1.25, 1.1, 0.95, 0.7, 0.5];

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
  "tandem-instructor": { exit: [13000, 14000], deploy: [5200, 5800] },
  "tandem-student":    { exit: [13000, 14000], deploy: [5500, 6000] },
};

interface Phase {
  months: number;
  jumpsPerMonth: number;
  mix: Partial<Record<Discipline, number>>;
  travelBias: number;
}

/* ── Generator engine ──────────────────────────────────────────────── */

function generate(
  seed: number,
  yearsBack: number,
  startMonth: number,
  phases: Phase[],
  milestones: Array<{ at: number; note: string; disc?: Discipline }>,
): Jump[] {
  const rand = mulberry32(seed);
  const jumps: Array<Omit<Jump, "id">> = [];
  const today = new Date();
  const start = new Date(today.getFullYear() - yearsBack, startMonth, 14);
  let cursor = new Date(start);
  const cutoff = new Date(today.getTime() - 7 * 86_400_000);

  for (const phase of phases) {
    const mix = normalize(phase.mix);
    for (let m = 0; m < phase.months; m++) {
      if (cursor > cutoff) break;
      const mo = cursor.getMonth();
      const yr = cursor.getFullYear();
      const count = Math.round(phase.jumpsPerMonth * SEASON_MULT[mo]! * (0.8 + rand() * 0.4));
      const days = new Date(yr, mo + 1, 0).getDate();

      for (let k = 0; k < count; k++) {
        const date = new Date(yr, mo, 1 + Math.floor(rand() * days));
        if (date > cutoff) break;
        const disc = pick(mix, rand);
        const a = ALT[disc];
        const exit = rInt(a.exit[0], a.exit[1], rand);
        const deploy = Math.min(exit - 400, rInt(a.deploy[0], a.deploy[1], rand));
        const dz = pickDz(phase.travelBias, rand);
        const n = jumps.length + 1;
        const ms = milestones.find((x) => x.at === n && (!x.disc || x.disc === disc));
        jumps.push({
          date: iso(date),
          discipline: disc,
          exitAltitude: exit,
          deploymentAltitude: deploy,
          dropzone: dz,
          notes: ms ? ms.note : undefined,
        });
      }
      cursor = new Date(yr, mo + 1, 1);
    }
  }

  // Attach any milestones that didn't land exactly.
  for (const ms of milestones) {
    const j = jumps[ms.at - 1];
    if (!j || j.notes) continue;
    if (ms.disc && j.discipline !== ms.disc) {
      for (let d = 1; d <= 10; d++) {
        for (const c of [jumps[ms.at - 1 + d], jumps[ms.at - 1 - d]]) {
          if (c && !c.notes && (!ms.disc || c.discipline === ms.disc)) {
            c.notes = ms.note;
            break;
          }
        }
        if (jumps.some((x) => x.notes === ms.note)) break;
      }
    } else {
      j.notes = ms.note;
    }
  }

  return jumps.sort((a, b) => a.date.localeCompare(b.date)) as Jump[];
}

/* ── Scenario 1 — Beginner (1–2 seasons, ~80 jumps) ───────────────── */

function beginnerJumps(): Jump[] {
  return generate(0xbe_91_00, 1, 4, [
    // First tandem — the jump that starts it all
    { months: 1, jumpsPerMonth: 1, mix: { "tandem-student": 1 }, travelBias: 0 },
    // AFF student: 27–35 jumps across ~3 months
    { months: 3, jumpsPerMonth: 11, mix: { student: 0.92, "hop-pop": 0.08 }, travelBias: 0 },
    // Fresh A-license: belly focus, first freefly attempts
    { months: 10, jumpsPerMonth: 5, mix: { belly: 0.62, freefly: 0.12, tracking: 0.08, "hop-pop": 0.18 }, travelBias: 0.03 },
  ], [
    { at: 1, note: "AFF Cat A. Arch, breathe, check altitude. Repeat.", disc: "student" },
    { at: 15, note: "Solo clear-and-pull. Starting to feel like a skydiver.", disc: "student" },
    { at: 26, note: "A-license check dive! Beer owed.", disc: "belly" },
    { at: 50, note: "First 4-way belly. Docked on the second try.", disc: "belly" },
  ]);
}

/* ── Scenario 2 — Intermediate (~400 jumps, freefly focus) ─────────── */

function intermediateJumps(): Jump[] {
  return generate(0xff_10_20, 3, 5, [
    // First tandem
    { months: 1, jumpsPerMonth: 1, mix: { "tandem-student": 1 }, travelBias: 0 },
    // Student phase: ~30 jumps
    { months: 3, jumpsPerMonth: 11, mix: { student: 0.9, "hop-pop": 0.1 }, travelBias: 0 },
    // Novice belly year
    { months: 10, jumpsPerMonth: 10, mix: { belly: 0.6, freefly: 0.15, tracking: 0.1, "hop-pop": 0.15 }, travelBias: 0.05 },
    // Freefly focus ramps up
    { months: 12, jumpsPerMonth: 12, mix: { freefly: 0.42, belly: 0.28, tracking: 0.14, "hop-pop": 0.1, swoop: 0.06 }, travelBias: 0.1 },
    // Deepening freefly, first coaching jumps
    { months: 12, jumpsPerMonth: 14, mix: { freefly: 0.48, belly: 0.18, tracking: 0.12, coach: 0.08, "hop-pop": 0.08, swoop: 0.06 }, travelBias: 0.15 },
  ], [
    { at: 1, note: "AFF Cat A. Sensory overload in the best way.", disc: "student" },
    { at: 28, note: "A-license! Bought a case of beer for the DZ.", disc: "belly" },
    { at: 100, note: "Triple digits. First sit-fly attempt — ate it, grinning.", disc: "freefly" },
    { at: 200, note: "200. Sit-fly is clicking. Head-down next.", disc: "freefly" },
    { at: 300, note: "First head-down exit that stayed stable the whole jump.", disc: "freefly" },
  ]);
}

/* ── Scenario 3 — Pro Swooper (2000+ jumps, 8 years) ──────────────── */

function proSwooperJumps(): Jump[] {
  return generate(0xc0_0b_5e_ed, 8, 3, [
    // Student: ~35 jumps
    { months: 3, jumpsPerMonth: 12, mix: { student: 0.9, "hop-pop": 0.1 }, travelBias: 0 },
    // Novice: belly + first freefly
    { months: 10, jumpsPerMonth: 16, mix: { belly: 0.55, freefly: 0.18, tracking: 0.1, "hop-pop": 0.17 }, travelBias: 0.05 },
    // Building canopy skills — hop-pops for pattern work, swoop practice begins
    { months: 12, jumpsPerMonth: 22, mix: { belly: 0.22, freefly: 0.18, swoop: 0.2, "hop-pop": 0.2, tracking: 0.1, coach: 0.1 }, travelBias: 0.1 },
    // Swoop focus intensifies — canopy courses, competition entry
    { months: 18, jumpsPerMonth: 28, mix: { swoop: 0.4, "hop-pop": 0.18, belly: 0.12, freefly: 0.12, coach: 0.08, tracking: 0.06, aff: 0.04 }, travelBias: 0.2 },
    // Competition swooper — swoop dominates, teaching on the side
    { months: 24, jumpsPerMonth: 32, mix: { swoop: 0.52, "hop-pop": 0.14, coach: 0.1, aff: 0.08, freefly: 0.08, belly: 0.05, tracking: 0.03 }, travelBias: 0.35 },
    // Peak pro — swoop competition circuit, occasional fun jumps
    { months: 30, jumpsPerMonth: 28, mix: { swoop: 0.58, "hop-pop": 0.12, coach: 0.08, "tandem-instructor": 0.06, aff: 0.06, freefly: 0.05, belly: 0.03, tracking: 0.02 }, travelBias: 0.4 },
  ], [
    { at: 1, note: "AFF Cat A. The door opened and everything changed.", disc: "student" },
    { at: 30, note: "A-license check dive. Bought the beer, earned the card.", disc: "belly" },
    { at: 100, note: "100 jumps. Started noticing the canopy ride more than the freefall." },
    { at: 200, note: "First canopy course with Flight-1. 90° front-riser turn — felt the swoop.", disc: "swoop" },
    { at: 500, note: "500. Downsized to a Valkyrie 84. The gates are calling.", disc: "swoop" },
    { at: 750, note: "First competition — local CP meet. Placed mid-pack. Hooked.", disc: "swoop" },
    { at: 1000, note: "One thousand. 270° through the gates, clean entry, long carve.", disc: "swoop" },
    { at: 1500, note: "Podium finish at a regional. Speed round personal best.", disc: "swoop" },
    { at: 2000, note: "Two thousand. The pond is home. 450° on a good day.", disc: "swoop" },
  ]);
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function normalize(mix: Partial<Record<Discipline, number>>): Array<{ d: Discipline; w: number }> {
  const entries = Object.entries(mix) as Array<[Discipline, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  return entries.map(([d, w]) => ({ d, w: w / total }));
}

function pick(opts: Array<{ d: Discipline; w: number }>, rand: () => number): Discipline {
  const r = rand();
  let acc = 0;
  for (const o of opts) { acc += o.w; if (r <= acc) return o.d; }
  return opts[opts.length - 1]!.d;
}

function pickDz(travelBias: number, rand: () => number): string {
  const r = rand();
  if (r < 1 - travelBias) return HOME_DZ;
  if (r < 1 - travelBias / 3) return REGIONAL[Math.floor(rand() * REGIONAL.length)]!;
  return TRAVEL[Math.floor(rand() * TRAVEL.length)]!;
}

function rInt(lo: number, hi: number, rand: () => number): number {
  return Math.round(lo + rand() * (hi - lo));
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
