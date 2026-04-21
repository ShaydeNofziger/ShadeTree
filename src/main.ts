import "./styles.css";
import { loadJumps, resetToSeed, saveJumps } from "./store.ts";
import { renderTree, type LeafHover } from "./tree.ts";
import { renderJumpList } from "./logbook.ts";
import { rollFortune, type Fortune } from "./oracle.ts";
import { formatDate, uid } from "./util.ts";
import type { Discipline, Jump } from "./types.ts";

interface State {
  jumps: Jump[];
  filter: string;
  fortune: Fortune | null;
}

const state: State = {
  jumps: loadJumps(),
  filter: "",
  fortune: null,
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
const resetSeedBtn = document.getElementById("reset-seed") as HTMLButtonElement;
const oracleRoll = document.getElementById("oracle-roll") as HTMLButtonElement;
const oracleCopy = document.getElementById("oracle-copy") as HTMLButtonElement;
const oracleQuote = document.getElementById("oracle-quote") as HTMLElement;
const oracleForecast = document.getElementById("oracle-forecast") as HTMLElement;
const oracleHeading = document.getElementById("oracle-heading") as HTMLElement;
const oracleDial = document.getElementById("oracle-dial") as HTMLElement;

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
  });
});

// Render helpers
function drawTree() {
  renderTree(svg, state.jumps, onLeafHover);
  renderStats();
}

function renderStats() {
  statJumps.textContent = String(state.jumps.length);
  const years = new Set(state.jumps.map((j) => j.date.slice(0, 4))).size;
  statYears.textContent = String(years);
  const disc = new Set(state.jumps.map((j) => j.discipline)).size;
  statDisciplines.textContent = String(disc);
  const ff = state.jumps.reduce(
    (s, j) => s + Math.max(0, j.exitAltitude - j.deploymentAltitude),
    0,
  );
  statAltitude.textContent = ff.toLocaleString();
}

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
  const sx = svgRect.width / vb.width;
  const sy = svgRect.height / vb.height;
  const px = (svgRect.left - stageRect.left) + h.x * sx + 14;
  const py = (svgRect.top - stageRect.top) + h.y * sy - 14;
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
  jumpForm.reset();
  // Restore defaults
  (jumpForm.elements.namedItem("exitAltitude") as HTMLInputElement).value =
    "13500";
  (jumpForm.elements.namedItem("deploymentAltitude") as HTMLInputElement).value =
    "4500";
  renderList();
  drawTree();
  flash("Leaf planted.");
});

resetSeedBtn.addEventListener("click", () => {
  if (!confirm("Reset your logbook to the sample tree? This clears your local jumps.")) return;
  state.jumps = resetToSeed();
  renderList();
  drawTree();
  flash("Tree reseeded.");
});

jumpSearch.addEventListener("input", () => {
  state.filter = jumpSearch.value;
  renderList();
});

function deleteJump(id: string) {
  state.jumps = state.jumps.filter((j) => j.id !== id);
  saveJumps(state.jumps);
  renderList();
  drawTree();
}

// Oracle
function renderFortune(f: Fortune) {
  oracleQuote.textContent = f.mantra;
  oracleHeading.textContent = `${f.direction} · ${f.windKnots} kt`;
  oracleDial.style.setProperty("--heading", `${f.headingDeg}deg`);
  oracleForecast.innerHTML =
    `<div><span class="k">Discipline</span><span class="v">${f.forecast.discipline}</span></div>` +
    `<div><span class="k">Gates</span><span class="v">${f.forecast.gates}</span></div>` +
    `<div><span class="k">Visibility</span><span class="v">${f.forecast.visibility}</span></div>` +
    `<div><span class="k">Ceiling</span><span class="v">${f.ceilingFt.toLocaleString()} ft</span></div>`;
}

oracleRoll.addEventListener("click", () => {
  const f = rollFortune(state.jumps);
  state.fortune = f;
  renderFortune(f);
});

oracleCopy.addEventListener("click", async () => {
  if (!state.fortune) return;
  try {
    await navigator.clipboard.writeText(state.fortune.mantra);
    flash("Mantra copied.");
  } catch {
    flash("Couldn't copy — try again.");
  }
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
renderList();
drawTree();
// Pre-roll a fortune so the card has content on first visit.
const initial = rollFortune(state.jumps);
state.fortune = initial;
renderFortune(initial);

// Re-layout on resize (SVG is responsive, but tooltip position depends on it).
window.addEventListener("resize", () => {
  tooltip.hidden = true;
});
