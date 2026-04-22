import "./styles.css";
import { loadJumps, loadScenario, resetToSeed, saveJumps } from "./store.ts";
import { SCENARIOS } from "./seed.ts";
import { renderTree, type LeafHover } from "./tree.ts";
import { renderJumpList } from "./logbook.ts";
import { renderHighlights } from "./highlights.ts";
import {
  addDays,
  daysBetween,
  formatDate,
  formatMonthYear,
  uid,
} from "./util.ts";
import type { Discipline, Jump } from "./types.ts";
import { initPanZoom } from "./panzoom.ts";

interface State {
  jumps: Jump[];
  filter: string;
  // Null means "show everything through the latest jump" (the default).
  // Otherwise the ISO date the scrubber is pinned to.
  asOf: string | null;
}

const state: State = {
  jumps: loadJumps(),
  filter: "",
  asOf: null,
};

const svg = document.getElementById("tree") as unknown as SVGSVGElement;
const tooltip = document.getElementById("leaf-tooltip") as HTMLElement;
const statJumps = byId("stat-jumps");
const statYears = byId("stat-years");
const statDisciplines = byId("stat-disciplines");
const statAltitude = byId("stat-altitude");
const jumpForm = document.getElementById("jump-form") as HTMLFormElement;
const jumpList = document.getElementById("jump-list") as HTMLOListElement;
const jumpSearch = document.getElementById("jump-search") as HTMLInputElement;
const scenarioOptions = document.getElementById("scenario-options") as HTMLElement;
const resetSeedBtn = document.getElementById("reset-seed");
const timeline = document.getElementById("timeline") as HTMLElement;
const timelineScrubber = document.getElementById(
  "timeline-scrubber",
) as HTMLInputElement;
const timelineDate = document.getElementById("timeline-date") as HTMLElement;
const timelineTicks = document.getElementById("timeline-ticks") as HTMLElement;
const timelineToday = document.getElementById(
  "timeline-today",
) as HTMLButtonElement;

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error("missing #" + id);
  return el;
}

// Tabs
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab!;
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.toggle("active", t === btn));
    document.querySelectorAll(".panel").forEach((p) => {
      p.classList.toggle("active", p.id === "panel-" + tab);
    });
    if (tab === "tree") drawTree();
    if (tab === "highlights") renderHighlights(byId("highlights"), state.jumps);
  });
});

// Render helpers
const pz = initPanZoom(svg);

document.getElementById("reset-zoom")?.addEventListener("click", () => pz.resetView());

function visibleJumps(): Jump[] {
  if (!state.asOf) return state.jumps;
  const cutoff = state.asOf;
  return state.jumps.filter((j) => j.date.localeCompare(cutoff) <= 0);
}

function drawTree() {
  const jumps = visibleJumps();
  renderTree(svg, jumps, onLeafHover);
  pz.fitContent();
  renderStats(jumps);
}

function renderStats(jumps: Jump[]) {
  statJumps.textContent = jumps.length.toLocaleString();
  const years = new Set(jumps.map((j) => j.date.slice(0, 4))).size;
  statYears.textContent = String(years);
  const disc = new Set(jumps.map((j) => j.discipline)).size;
  statDisciplines.textContent = String(disc);
  const ffFeet = jumps.reduce(
    (s, j) => s + Math.max(0, j.exitAltitude - j.deploymentAltitude),
    0,
  );
  const miles = ffFeet / 5280;
  statAltitude.textContent =
    miles >= 100
      ? Math.round(miles).toLocaleString()
      : miles.toFixed(1);
}

// --- Timeline scrubber ---

interface CareerBounds {
  first: string;
  last: string;
  spanDays: number;
}

function careerBounds(): CareerBounds | null {
  if (state.jumps.length === 0) return null;
  let first = state.jumps[0]!.date;
  let last = first;
  for (const j of state.jumps) {
    if (j.date < first) first = j.date;
    if (j.date > last) last = j.date;
  }
  return { first, last, spanDays: Math.max(0, daysBetween(first, last)) };
}

function refreshTimeline() {
  const bounds = careerBounds();
  if (!bounds) {
    timeline.hidden = true;
    state.asOf = null;
    return;
  }
  timeline.hidden = false;
  timelineScrubber.min = "0";
  timelineScrubber.max = String(bounds.spanDays);
  // Snap an out-of-range asOf (after deletes, reseed, or new jumps).
  const asOf = state.asOf ?? bounds.last;
  const clampedDays = Math.max(
    0,
    Math.min(bounds.spanDays, daysBetween(bounds.first, asOf)),
  );
  timelineScrubber.value = String(clampedDays);
  const snapped = addDays(bounds.first, clampedDays);
  state.asOf = snapped === bounds.last ? null : snapped;
  renderTimelineLabel(bounds);
  renderTimelineTicks(bounds);
}

function renderTimelineLabel(bounds: CareerBounds) {
  const viewDate = state.asOf ?? bounds.last;
  timelineDate.textContent = formatMonthYear(viewDate);
  timelineToday.hidden = state.asOf === null;
}

function renderTimelineTicks(bounds: CareerBounds) {
  const firstYear = Number(bounds.first.slice(0, 4));
  const lastYear = Number(bounds.last.slice(0, 4));
  const span = lastYear - firstYear;
  if (span <= 0) {
    timelineTicks.innerHTML = "";
    return;
  }
  // Show 3–5 tick labels, picked so they read cleanly at any career length.
  const stepSize = span <= 4 ? 1 : span <= 10 ? 2 : span <= 20 ? 4 : 5;
  const marks: number[] = [];
  for (let y = firstYear; y <= lastYear; y += stepSize) marks.push(y);
  if (marks[marks.length - 1] !== lastYear) marks.push(lastYear);
  timelineTicks.innerHTML = marks
    .map((y) => `<span>'${String(y).slice(2)}</span>`)
    .join("");
}

let pendingScrub = 0;
timelineScrubber.addEventListener("input", () => {
  const bounds = careerBounds();
  if (!bounds) return;
  const days = Number(timelineScrubber.value);
  const picked = addDays(bounds.first, days);
  state.asOf = days >= bounds.spanDays ? null : picked;
  renderTimelineLabel(bounds);
  // Coalesce rapid slider events so we redraw at most once per frame.
  if (pendingScrub) return;
  pendingScrub = requestAnimationFrame(() => {
    pendingScrub = 0;
    drawTree();
  });
});

timelineToday.addEventListener("click", () => {
  state.asOf = null;
  refreshTimeline();
  drawTree();
});

function renderList() {
  renderJumpList(jumpList, state.jumps, state.filter, deleteJump);
}

function onLeafHover(h: LeafHover | null) {
  if (!h) {
    tooltip.hidden = true;
    return;
  }
  const j = h.jump;
  const freefall = Math.max(0, j.exitAltitude - j.deploymentAltitude);
  tooltip.innerHTML =
    (h.milestone ? `<div class="t-milestone">★ ${escapeHtml(h.milestone)}</div>` : "") +
    `<div class="t-date">${formatDate(j.date)}</div>` +
    `<div class="t-disc">${j.discipline}</div>` +
    `<div class="t-dz">${escapeHtml(j.dropzone)}</div>` +
    `<div class="t-meta">exit ${j.exitAltitude.toLocaleString()} ft · ` +
    `freefall ${freefall.toLocaleString()} ft</div>` +
    (j.notes ? `<p class="t-notes">${escapeHtml(j.notes)}</p>` : "");
  tooltip.hidden = false;
  // Position inside the stage.
  const stage = svg.parentElement as HTMLElement;
  const svgRect = svg.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scale = Math.min(svgRect.width / vb.width, svgRect.height / vb.height);
  const renderedW = vb.width * scale;
  const renderedH = vb.height * scale;
  const offsetX = (svgRect.width - renderedW) / 2;
  const offsetY = svgRect.height - renderedH; // xMidYMax
  const px = (svgRect.left - stageRect.left) + offsetX + (h.x - vb.x) * scale + 14;
  const py = (svgRect.top - stageRect.top) + offsetY + (h.y - vb.y) * scale - 14;
  tooltip.style.left = `${px}px`;
  tooltip.style.top = `${py}px`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Form submit
jumpForm.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const fd = new FormData(jumpForm);
  const jump: Jump = {
    id: uid(),
    date: String(fd.get("date")),
    discipline: String(fd.get("discipline")) as Discipline,
    exitAltitude: Number(fd.get("exitAltitude")),
    deploymentAltitude: Number(fd.get("deploymentAltitude")),
    dropzone: String(fd.get("dropzone")).trim(),
    notes: String(fd.get("notes") ?? "").trim() || undefined,
  };
  if (!jump.date || !jump.dropzone) return;
  state.jumps = [...state.jumps, jump];
  saveJumps(state.jumps);
  // Newly planted jumps should always be visible; snap the scrubber forward.
  state.asOf = null;
  jumpForm.reset();
  // Restore defaults
  (jumpForm.elements.namedItem("exitAltitude") as HTMLInputElement).value =
    "13500";
  (jumpForm.elements.namedItem("deploymentAltitude") as HTMLInputElement).value =
    "4500";
  renderList();
  refreshTimeline();
  drawTree();
  flash("Leaf planted.");
});

// Scenario picker (HEAD)
for (const s of SCENARIOS) {
  const btn = document.createElement("button");
  btn.className = "ghost scenario-btn";
  btn.innerHTML = `<strong>${s.label}</strong><span>${s.description}</span>`;
  btn.addEventListener("click", () => {
    if (!confirm(`Load "${s.label}" scenario? This replaces your current logbook.`)) return;
    state.jumps = loadScenario(s.id);
    state.asOf = null;
    renderList();
    refreshTimeline();
    drawTree();
    flash(`Loaded: ${s.label}`);
  });
  scenarioOptions.append(btn);
}

// Reset to seed (main)
resetSeedBtn?.addEventListener("click", () => {
  if (!confirm("Reset your logbook to the sample tree? This clears your local jumps.")) return;
  state.jumps = resetToSeed();
  state.asOf = null;
  renderList();
  refreshTimeline();
  drawTree();
  flash("Tree reseeded.");
});

jumpSearch.addEventListener("input", () => {
  state.filter = jumpSearch.value;
  renderList();
});

// Export / Import / Merge
function jumpKey(j: Jump): string {
  return `${j.date}|${j.exitAltitude}|${j.deploymentAltitude}`;
}

byId("format-info").addEventListener("click", () => {
  const example = `[
  {
    "date": "2025-06-14",
    "discipline": "belly",
    "exitAltitude": 13500,
    "deploymentAltitude": 4500,
    "dropzone": "Skydive Carolina",
    "notes": "optional"
  }
]`;
  const el = document.getElementById("format-popover");
  if (el) { el.remove(); return; }
  const pop = document.createElement("div");
  pop.id = "format-popover";
  pop.className = "format-popover";
  pop.innerHTML = `<pre>${example}</pre><p>Disciplines: belly, freefly, swoop, wingsuit, tracking, hop-pop, student, coach, aff, tandem-instructor, tandem-student</p>`;
  byId("format-info").parentElement!.append(pop);
  const dismiss = (e: MouseEvent) => {
    if (!pop.contains(e.target as Node) && e.target !== byId("format-info")) {
      pop.remove();
      document.removeEventListener("click", dismiss);
    }
  };
  setTimeout(() => document.addEventListener("click", dismiss), 0);
});

byId("export-jumps").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.jumps, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `shadetree-logbook-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  flash("Logbook exported.");
});

function pickJSON(onSuccess: (jumps: Jump[]) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Jump[];
        if (!Array.isArray(parsed) || !parsed.every((j) => j.date && j.discipline)) {
          flash("Invalid logbook file."); return;
        }
        for (const j of parsed) { if (!j.id) j.id = uid(); }
        onSuccess(parsed);
      } catch { flash("Could not read file."); }
    };
    reader.readAsText(file);
  });
  input.click();
}

byId("import-jumps").addEventListener("click", () => {
  pickJSON((parsed) => {
    state.jumps = parsed;
    saveJumps(state.jumps);
    renderList();
    drawTree();
    flash(`Imported ${parsed.length} jumps.`);
  });
});

byId("merge-jumps").addEventListener("click", () => {
  pickJSON((parsed) => {
    const existing = new Set(state.jumps.map(jumpKey));
    const fresh = parsed.filter((j) => !existing.has(jumpKey(j)));
    if (fresh.length === 0) { flash("No new jumps to merge."); return; }
    state.jumps = [...state.jumps, ...fresh].sort((a, b) => a.date.localeCompare(b.date));
    saveJumps(state.jumps);
    renderList();
    drawTree();
    flash(`Merged ${fresh.length} new jump${fresh.length === 1 ? "" : "s"}.`);
  });
});

// Delete confirmation
const deleteModal = byId("delete-modal");
const deleteConfirmBtn = byId("delete-confirm");
const deleteCancelBtn = byId("delete-cancel");
let pendingDeleteId = "";

function deleteJump(id: string) {
  pendingDeleteId = id;
  deleteModal.hidden = false;
  deleteConfirmBtn.focus();
}

function closeDelete() { deleteModal.hidden = true; pendingDeleteId = ""; }

deleteConfirmBtn.addEventListener("click", () => {
  state.jumps = state.jumps.filter((j) => j.id !== pendingDeleteId);
  saveJumps(state.jumps);
  renderList();
  refreshTimeline();
  drawTree();
  closeDelete();
});

deleteCancelBtn.addEventListener("click", closeDelete);
deleteModal.addEventListener("click", (e) => { if (e.target === deleteModal) closeDelete(); });
deleteModal.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDelete();
  if (e.key === "Enter") { e.preventDefault(); deleteConfirmBtn.click(); }
});

// About modal
const aboutModal = byId("about-modal");
const aboutCloseBtn = byId("about-close");
byId("about-open").addEventListener("click", () => { aboutModal.hidden = false; aboutCloseBtn.focus(); });
aboutCloseBtn.addEventListener("click", () => { aboutModal.hidden = true; });
aboutModal.addEventListener("click", (e) => { if (e.target === aboutModal) aboutModal.hidden = true; });
aboutModal.addEventListener("keydown", (e) => { if (e.key === "Escape") aboutModal.hidden = true; });

// Bulk log modal
const bulkModal = byId("bulk-modal");
const bulkGrid = byId("bulk-grid");
const DISC_OPTIONS = `<option value="belly">Belly</option><option value="freefly">Freefly</option><option value="swoop">Swoop</option><option value="wingsuit">Wingsuit</option><option value="tracking">Tracking</option><option value="hop-pop">Hop &amp; Pop</option><option value="student">Student</option><option value="coach">Coach</option><option value="aff">AFF Instr.</option><option value="tandem-instructor">Tandem Instr.</option><option value="tandem-student">Tandem Student</option>`;

const today = new Date().toISOString().slice(0, 10);

function addBulkRow(prev?: { date: string; disc: string; exit: string; deploy: string; dz: string }) {
  const d = document.createElement("input");
  d.type = "date"; d.value = prev?.date ?? today;
  const disc = document.createElement("select");
  disc.innerHTML = DISC_OPTIONS;
  if (prev?.disc) disc.value = prev.disc;
  const exit = document.createElement("input");
  exit.type = "number"; exit.value = prev?.exit ?? "13500"; exit.min = "2000"; exit.max = "30000"; exit.step = "100";
  const deploy = document.createElement("input");
  deploy.type = "number"; deploy.value = prev?.deploy ?? "4500"; deploy.min = "1800"; deploy.max = "14000"; deploy.step = "100";
  const dzIn = document.createElement("input");
  dzIn.type = "text"; dzIn.value = prev?.dz ?? ""; dzIn.placeholder = "Skydive Carolina";
  const notes = document.createElement("input");
  notes.type = "text"; notes.placeholder = "optional";

  // Enter on last field → new row carrying forward values
  notes.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBulkRow({ date: d.value, disc: disc.value, exit: exit.value, deploy: deploy.value, dz: dzIn.value });
    }
  });

  bulkGrid.append(d, disc, exit, deploy, dzIn, notes);
  d.focus();
}

byId("bulk-open").addEventListener("click", () => {
  // Clear previous rows (keep headers)
  while (bulkGrid.children.length > 6) bulkGrid.removeChild(bulkGrid.lastChild!);
  addBulkRow();
  bulkModal.hidden = false;
});

function closeBulk() { bulkModal.hidden = true; }

byId("bulk-add-row").addEventListener("click", () => {
  const inputs = bulkGrid.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
  const len = inputs.length;
  if (len >= 6) {
    const base = len - 6;
    addBulkRow({
      date: (inputs[base] as HTMLInputElement).value,
      disc: (inputs[base + 1] as HTMLSelectElement).value,
      exit: (inputs[base + 2] as HTMLInputElement).value,
      deploy: (inputs[base + 3] as HTMLInputElement).value,
      dz: (inputs[base + 4] as HTMLInputElement).value,
    });
  } else {
    addBulkRow();
  }
});

byId("bulk-cancel").addEventListener("click", closeBulk);
bulkModal.addEventListener("click", (e) => { if (e.target === bulkModal) closeBulk(); });
bulkModal.addEventListener("keydown", (e) => { if (e.key === "Escape") closeBulk(); });

byId("bulk-save").addEventListener("click", () => {
  const inputs = bulkGrid.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
  const cols = 6;
  const rows = Math.floor(inputs.length / cols);
  let added = 0;
  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    const date = (inputs[base] as HTMLInputElement).value;
    const discipline = (inputs[base + 1] as HTMLSelectElement).value as Discipline;
    const exitAlt = Number((inputs[base + 2] as HTMLInputElement).value);
    const deployAlt = Number((inputs[base + 3] as HTMLInputElement).value);
    const dropzone = (inputs[base + 4] as HTMLInputElement).value.trim();
    const noteVal = (inputs[base + 5] as HTMLInputElement).value.trim();
    if (!date || !dropzone) continue;
    state.jumps.push({
      id: uid(),
      date,
      discipline,
      exitAltitude: exitAlt,
      deploymentAltitude: deployAlt,
      dropzone,
      notes: noteVal || undefined,
    });
    added++;
  }
  if (added === 0) { flash("No valid rows to save."); return; }
  state.jumps.sort((a, b) => a.date.localeCompare(b.date));
  saveJumps(state.jumps);
  renderList();
  drawTree();
  closeBulk();
  flash(`Planted ${added} leaf${added === 1 ? "" : "s"}.`);
});

// Lightweight toast
let flashTimer: number | undefined;
function flash(msg: string) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => t!.classList.remove("show"), 1800);
}

// Initial paint
(jumpForm.elements.namedItem("date") as HTMLInputElement).value = new Date().toISOString().slice(0, 10);
renderList();
refreshTimeline();
drawTree();

// Re-layout on resize (SVG is responsive, but tooltip position depends on it).
window.addEventListener("resize", () => {
  tooltip.hidden = true;
});
