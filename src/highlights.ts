import type { Discipline, Jump } from "./types.ts";
import { formatDate } from "./util.ts";

interface Highlight {
  icon: string;
  title: string;
  value: string;
  detail?: string;
}

const DISC_LABEL: Record<Discipline, string> = {
  belly: "Belly", freefly: "Freefly", swoop: "Swoop", wingsuit: "Wingsuit",
  tracking: "Tracking", "hop-pop": "Hop & Pop", student: "Student",
  coach: "Coach", aff: "AFF", tandem: "Tandem",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function renderHighlights(root: HTMLElement, jumps: Jump[]): void {
  root.innerHTML = "";
  if (jumps.length === 0) {
    root.innerHTML = `<p class="hl-empty">Log some jumps to unlock highlights.</p>`;
    return;
  }

  const sorted = [...jumps].sort((a, b) => a.date.localeCompare(b.date));
  const highlights: Highlight[] = [];

  // ── Career overview ──
  const years = new Set(sorted.map((j) => j.date.slice(0, 4)));
  const totalFF = sorted.reduce((s, j) => s + Math.max(0, j.exitAltitude - j.deploymentAltitude), 0);
  highlights.push({
    icon: "🌳", title: "Career span",
    value: `${years.size} season${years.size === 1 ? "" : "s"}`,
    detail: `${sorted[0]!.date.slice(0, 4)} – ${sorted[sorted.length - 1]!.date.slice(0, 4)}`,
  });
  highlights.push({
    icon: "🪂", title: "Total freefall",
    value: `${Math.round(totalFF / 5280).toLocaleString()} miles`,
    detail: `${totalFF.toLocaleString()} ft across ${sorted.length.toLocaleString()} jumps`,
  });

  // ── Number milestones ──
  const milestoneNums = [25, 50, 100, 200, 500, 1000, 2000, 5000];
  for (const n of milestoneNums) {
    if (sorted.length >= n) {
      const j = sorted[n - 1]!;
      highlights.push({
        icon: "⭐", title: `Jump #${n.toLocaleString()}`,
        value: formatDate(j.date),
        detail: `${DISC_LABEL[j.discipline]} at ${j.dropzone}`,
      });
    }
  }

  // ── Discipline firsts ──
  const seen = new Set<Discipline>();
  for (const j of sorted) {
    if (!seen.has(j.discipline)) {
      seen.add(j.discipline);
      if (j.discipline !== "student") {
        highlights.push({
          icon: "🌱", title: `First ${DISC_LABEL[j.discipline]} jump`,
          value: formatDate(j.date),
          detail: j.dropzone,
        });
      }
    }
  }

  // ── Last student jump ──
  const lastStudent = [...sorted].reverse().find((j) => j.discipline === "student");
  if (lastStudent) {
    highlights.push({
      icon: "🎓", title: "Last student jump",
      value: formatDate(lastStudent.date),
      detail: lastStudent.dropzone,
    });
  }

  // ── Altitude records per discipline ──
  const byDisc = new Map<Discipline, Jump[]>();
  for (const j of sorted) {
    const arr = byDisc.get(j.discipline) ?? [];
    arr.push(j);
    byDisc.set(j.discipline, arr);
  }

  for (const [disc, dj] of byDisc) {
    if (dj.length < 3) continue;
    const highest = dj.reduce((a, b) => a.exitAltitude > b.exitAltitude ? a : b);
    const lowest = dj.reduce((a, b) => a.deploymentAltitude < b.deploymentAltitude ? a : b);
    highlights.push({
      icon: "⬆️", title: `Highest exit — ${DISC_LABEL[disc]}`,
      value: `${highest.exitAltitude.toLocaleString()} ft`,
      detail: `${formatDate(highest.date)} at ${highest.dropzone}`,
    });
    highlights.push({
      icon: "⬇️", title: `Lowest pull — ${DISC_LABEL[disc]}`,
      value: `${lowest.deploymentAltitude.toLocaleString()} ft`,
      detail: `${formatDate(lowest.date)} at ${lowest.dropzone}`,
    });
  }

  // ── Busiest month on average ──
  const monthTotals = new Array<number>(12).fill(0);
  for (const j of sorted) monthTotals[parseInt(j.date.slice(5, 7)) - 1]++;
  const monthAvg = monthTotals.map((t) => t / years.size);
  const busiestMonth = monthAvg.indexOf(Math.max(...monthAvg));
  highlights.push({
    icon: "📅", title: "Busiest month (avg)",
    value: MONTH_NAMES[busiestMonth]!,
    detail: `~${Math.round(monthAvg[busiestMonth]!)} jumps/year in ${MONTH_NAMES[busiestMonth]}`,
  });

  // ── Busiest single day ──
  const dayCounts = new Map<string, number>();
  for (const j of sorted) dayCounts.set(j.date, (dayCounts.get(j.date) ?? 0) + 1);
  let busiestDay = sorted[0]!.date;
  let busiestDayCount = 0;
  for (const [d, c] of dayCounts) {
    if (c > busiestDayCount) { busiestDay = d; busiestDayCount = c; }
  }
  highlights.push({
    icon: "🔥", title: "Busiest single day",
    value: `${busiestDayCount} jumps`,
    detail: formatDate(busiestDay),
  });

  // ── Longest streak (consecutive days with jumps) ──
  const uniqueDays = [...new Set(sorted.map((j) => j.date))].sort();
  let streak = 1, maxStreak = 1, streakEnd = uniqueDays[0]!;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]!).getTime();
    const cur = new Date(uniqueDays[i]!).getTime();
    if (cur - prev === 86_400_000) {
      streak++;
      if (streak > maxStreak) { maxStreak = streak; streakEnd = uniqueDays[i]!; }
    } else {
      streak = 1;
    }
  }
  if (maxStreak > 1) {
    highlights.push({
      icon: "🔗", title: "Longest streak",
      value: `${maxStreak} consecutive days`,
      detail: `Ending ${formatDate(streakEnd)}`,
    });
  }

  // ── Most visited DZ ──
  const dzCounts = new Map<string, number>();
  for (const j of sorted) dzCounts.set(j.dropzone, (dzCounts.get(j.dropzone) ?? 0) + 1);
  let topDz = "", topDzCount = 0;
  for (const [dz, c] of dzCounts) {
    if (c > topDzCount) { topDz = dz; topDzCount = c; }
  }
  highlights.push({
    icon: "🏠", title: "Home DZ",
    value: topDz,
    detail: `${topDzCount.toLocaleString()} jumps (${Math.round(topDzCount / sorted.length * 100)}%)`,
  });

  // ── DZs visited ──
  highlights.push({
    icon: "✈️", title: "Dropzones visited",
    value: String(dzCounts.size),
  });

  // ── Favorite discipline ──
  let topDisc: Discipline = "belly", topDiscCount = 0;
  for (const [d, dj] of byDisc) {
    if (dj.length > topDiscCount) { topDisc = d; topDiscCount = dj.length; }
  }
  highlights.push({
    icon: "💜", title: "Favorite discipline",
    value: DISC_LABEL[topDisc],
    detail: `${topDiscCount.toLocaleString()} jumps (${Math.round(topDiscCount / sorted.length * 100)}%)`,
  });

  // ── Longest gap ──
  let maxGap = 0, gapAfter = sorted[0]!.date;
  for (let i = 1; i < sorted.length; i++) {
    const gap = new Date(sorted[i]!.date).getTime() - new Date(sorted[i - 1]!.date).getTime();
    if (gap > maxGap) { maxGap = gap; gapAfter = sorted[i - 1]!.date; }
  }
  if (maxGap > 0) {
    const gapDays = Math.round(maxGap / 86_400_000);
    highlights.push({
      icon: "⏸️", title: "Longest break",
      value: gapDays > 60 ? `${Math.round(gapDays / 30)} months` : `${gapDays} days`,
      detail: `After ${formatDate(gapAfter)}`,
    });
  }

  // Render cards.
  for (const h of highlights) {
    const card = document.createElement("div");
    card.className = "hl-card";
    card.innerHTML =
      `<span class="hl-icon">${h.icon}</span>` +
      `<div class="hl-body">` +
      `<div class="hl-title">${esc(h.title)}</div>` +
      `<div class="hl-value">${esc(h.value)}</div>` +
      (h.detail ? `<div class="hl-detail">${esc(h.detail)}</div>` : "") +
      `</div>`;
    root.append(card);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
