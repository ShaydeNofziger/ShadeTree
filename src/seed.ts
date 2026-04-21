import type { Discipline, Jump } from "./types.ts";
import { uid } from "./util.ts";

interface Template {
  discipline: Discipline;
  exit: number;
  deploy: number;
  dz: string;
  notes: string;
}

const DROPZONES = [
  "Skydive Carolina",
  "Skydive Paraclete XP",
  "Raeford Drop Zone",
  "Skydive Deland",
  "Perris Valley",
];

const TEMPLATES: Template[] = [
  { discipline: "student", exit: 13500, deploy: 5500, dz: "Skydive Carolina", notes: "AFF Cat A — tandem-to-solo transition. Arch, arch, arch." },
  { discipline: "student", exit: 13500, deploy: 5500, dz: "Skydive Carolina", notes: "First solo exit. Heart in my throat." },
  { discipline: "belly", exit: 13500, deploy: 4500, dz: "Skydive Carolina", notes: "100th jump — group belly, zero dock but all smiles." },
  { discipline: "belly", exit: 13500, deploy: 4500, dz: "Skydive Carolina", notes: "4-way practice, star to sidebody." },
  { discipline: "freefly", exit: 14000, deploy: 4500, dz: "Skydive Paraclete XP", notes: "First sit-fly — shaky but I found it." },
  { discipline: "freefly", exit: 14000, deploy: 4500, dz: "Skydive Paraclete XP", notes: "Tunnel drill paid off, clean head-down recovery." },
  { discipline: "freefly", exit: 14000, deploy: 4500, dz: "Skydive Paraclete XP", notes: "HD exit off the step. Felt fast, looked faster." },
  { discipline: "tracking", exit: 13500, deploy: 4500, dz: "Raeford Drop Zone", notes: "Tracking dive across the airfield, smooth and glassy." },
  { discipline: "swoop", exit: 5500, deploy: 5000, dz: "Skydive Carolina", notes: "270° turn practice — high but holding the line." },
  { discipline: "swoop", exit: 5500, deploy: 5000, dz: "Skydive Carolina", notes: "Swoop course day 3 — finally landed the gates." },
  { discipline: "swoop", exit: 5500, deploy: 5000, dz: "Skydive Carolina", notes: "PPC warmup — 450° felt like a dream." },
  { discipline: "wingsuit", exit: 14000, deploy: 4500, dz: "Skydive Deland", notes: "First wingsuit flight coached. Legs. The legs." },
  { discipline: "wingsuit", exit: 14000, deploy: 4500, dz: "Skydive Deland", notes: "Glide ratio climbing — tracked the whole ridge line." },
  { discipline: "hop-pop", exit: 5500, deploy: 5400, dz: "Skydive Carolina", notes: "Sunset hop & pop. Air smelled like honeysuckle." },
  { discipline: "hop-pop", exit: 4500, deploy: 4400, dz: "Skydive Carolina", notes: "Check-dive after reserve repack. Boring = good." },
  { discipline: "belly", exit: 13500, deploy: 4500, dz: "Perris Valley", notes: "Travel jump — different air, different dirt." },
  { discipline: "freefly", exit: 14000, deploy: 4500, dz: "Skydive Paraclete XP", notes: "Carved a perfect orbit. Kept the grip." },
  { discipline: "tracking", exit: 13500, deploy: 4500, dz: "Raeford Drop Zone", notes: "Angle flying with the crew. Held the bearing." },
  { discipline: "belly", exit: 13500, deploy: 4500, dz: "Skydive Carolina", notes: "Big-way attempt — nailed the slot." },
  { discipline: "swoop", exit: 5500, deploy: 5000, dz: "Skydive Carolina", notes: "Turf surf through the gates. Grass on the wing." },
];

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length]!;
}

function dateOffset(startYear: number, monthIdx: number, day: number): string {
  const mm = String(monthIdx + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${startYear}-${mm}-${dd}`;
}

export function sampleJumps(): Jump[] {
  const jumps: Jump[] = [];
  const today = new Date();
  const thisYear = today.getFullYear();
  const startYear = thisYear - 3;

  // Distribute ~52 jumps across ~3 years with discipline progression.
  const plan: Array<{ year: number; month: number; day: number; tpl: number }> = [
    // Year 1 — student, first belly jumps
    { year: startYear, month: 3, day: 14, tpl: 0 },
    { year: startYear, month: 3, day: 28, tpl: 1 },
    { year: startYear, month: 4, day: 9, tpl: 1 },
    { year: startYear, month: 4, day: 22, tpl: 3 },
    { year: startYear, month: 5, day: 4, tpl: 3 },
    { year: startYear, month: 5, day: 18, tpl: 3 },
    { year: startYear, month: 6, day: 1, tpl: 13 },
    { year: startYear, month: 6, day: 16, tpl: 14 },
    { year: startYear, month: 7, day: 2, tpl: 3 },
    { year: startYear, month: 8, day: 12, tpl: 3 },
    { year: startYear, month: 8, day: 25, tpl: 2 },
    { year: startYear, month: 9, day: 10, tpl: 7 },
    { year: startYear, month: 10, day: 3, tpl: 13 },

    // Year 2 — freefly emerges
    { year: startYear + 1, month: 2, day: 21, tpl: 4 },
    { year: startYear + 1, month: 3, day: 5, tpl: 4 },
    { year: startYear + 1, month: 3, day: 19, tpl: 5 },
    { year: startYear + 1, month: 4, day: 2, tpl: 5 },
    { year: startYear + 1, month: 4, day: 20, tpl: 3 },
    { year: startYear + 1, month: 5, day: 9, tpl: 16 },
    { year: startYear + 1, month: 5, day: 24, tpl: 6 },
    { year: startYear + 1, month: 6, day: 11, tpl: 15 },
    { year: startYear + 1, month: 7, day: 4, tpl: 18 },
    { year: startYear + 1, month: 7, day: 20, tpl: 2 },
    { year: startYear + 1, month: 8, day: 8, tpl: 17 },
    { year: startYear + 1, month: 9, day: 1, tpl: 6 },
    { year: startYear + 1, month: 9, day: 22, tpl: 7 },
    { year: startYear + 1, month: 10, day: 14, tpl: 13 },
    { year: startYear + 1, month: 11, day: 5, tpl: 14 },

    // Year 3 — swoop, wingsuit, tracking mastery
    { year: startYear + 2, month: 1, day: 18, tpl: 8 },
    { year: startYear + 2, month: 2, day: 3, tpl: 8 },
    { year: startYear + 2, month: 2, day: 24, tpl: 9 },
    { year: startYear + 2, month: 3, day: 10, tpl: 9 },
    { year: startYear + 2, month: 3, day: 28, tpl: 10 },
    { year: startYear + 2, month: 4, day: 12, tpl: 11 },
    { year: startYear + 2, month: 4, day: 26, tpl: 12 },
    { year: startYear + 2, month: 5, day: 14, tpl: 12 },
    { year: startYear + 2, month: 6, day: 1, tpl: 6 },
    { year: startYear + 2, month: 6, day: 21, tpl: 19 },
    { year: startYear + 2, month: 7, day: 6, tpl: 10 },
    { year: startYear + 2, month: 7, day: 23, tpl: 17 },
    { year: startYear + 2, month: 8, day: 10, tpl: 18 },
    { year: startYear + 2, month: 9, day: 5, tpl: 11 },
    { year: startYear + 2, month: 9, day: 27, tpl: 13 },
    { year: startYear + 2, month: 10, day: 15, tpl: 19 },
    { year: startYear + 2, month: 11, day: 8, tpl: 13 },

    // This year — recent jumps
    { year: thisYear, month: 1, day: 22, tpl: 10 },
    { year: thisYear, month: 2, day: 8, tpl: 6 },
    { year: thisYear, month: 2, day: 28, tpl: 19 },
    { year: thisYear, month: 3, day: 15, tpl: 11 },
    { year: thisYear, month: 3, day: 29, tpl: 17 },
  ];

  plan.forEach((p, i) => {
    const tpl = TEMPLATES[p.tpl % TEMPLATES.length]!;
    jumps.push({
      id: uid() + "-" + i,
      date: dateOffset(p.year, p.month, p.day),
      discipline: tpl.discipline,
      exitAltitude: tpl.exit,
      deploymentAltitude: tpl.deploy,
      dropzone: pick(DROPZONES, i + p.tpl) ?? tpl.dz,
      notes: tpl.notes,
    });
  });

  return jumps.sort((a, b) => a.date.localeCompare(b.date));
}
