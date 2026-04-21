import { sampleJumps } from "../src/seed.ts";

const jumps = sampleJumps();
console.log("Total jumps:", jumps.length.toLocaleString());

const years = new Set(jumps.map((j) => j.date.slice(0, 4)));
const yrs = [...years].sort();
console.log("Years spanned:", years.size, `(${yrs[0]} → ${yrs.at(-1)})`);

const byDisc = jumps.reduce(
  (m, j) => {
    m[j.discipline] = (m[j.discipline] ?? 0) + 1;
    return m;
  },
  {} as Record<string, number>,
);
console.log("\nBy discipline:");
Object.entries(byDisc)
  .sort((a, b) => b[1] - a[1])
  .forEach(([d, n]) => {
    const pct = ((n / jumps.length) * 100).toFixed(1);
    console.log(`  ${d.padEnd(10)} ${String(n).padStart(5)}  ${pct}%`);
  });

const byYear = jumps.reduce(
  (m, j) => {
    const y = j.date.slice(0, 4);
    m[y] = (m[y] ?? 0) + 1;
    return m;
  },
  {} as Record<string, number>,
);
console.log("\nBy year:");
Object.entries(byYear)
  .sort()
  .forEach(([y, n]) => console.log(`  ${y}  ${String(n).padStart(4)}`));

const freefallFt = jumps.reduce(
  (s, j) => s + Math.max(0, j.exitAltitude - j.deploymentAltitude),
  0,
);
console.log(
  `\nTotal freefall: ${freefallFt.toLocaleString()} ft  (${Math.round(freefallFt / 5280).toLocaleString()} mi)`,
);

const milestones = jumps.filter((j) => j.notes && j.notes.length > 30);
console.log(`\nMilestone notes found: ${milestones.length}`);
milestones.slice(0, 6).forEach((j, i) => {
  const idx = jumps.indexOf(j) + 1;
  console.log(`  ${i + 1}. #${idx} [${j.date}] ${j.discipline}: ${j.notes}`);
});
