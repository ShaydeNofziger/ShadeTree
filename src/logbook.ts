import type { Discipline, Jump } from "./types.ts";
import { formatDate } from "./util.ts";

const DISC_BADGE: Record<Discipline, string> = {
  belly: "Belly",
  freefly: "Freefly",
  swoop: "Swoop",
  wingsuit: "Wingsuit",
  tracking: "Tracking",
  "hop-pop": "H&P",
  student: "Student",
  coach: "Coach",
  aff: "AFF",
  "tandem-instructor": "TI",
  "tandem-student": "TS",
};

export interface JumpFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  discipline: string;
  dropzone: string;
}

const PAGE_SIZE = 100;

export interface PageInfo {
  page: number;
  totalPages: number;
  totalFiltered: number;
}

export function renderJumpList(
  root: HTMLOListElement,
  paginationRoot: HTMLElement,
  jumps: Jump[],
  filters: JumpFilters,
  page: number,
  onDelete: (id: string) => void,
  onPageChange: (p: number) => void,
): PageInfo {
  root.innerHTML = "";
  paginationRoot.innerHTML = "";

  const filtered = applyFilters(jumps, filters);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clamped = Math.max(1, Math.min(page, totalPages));
  const start = (clamped - 1) * PAGE_SIZE;
  const shown = sorted.slice(start, start + PAGE_SIZE);

  if (sorted.length === 0) {
    const li = document.createElement("li");
    li.className = "jump-empty";
    li.textContent = hasActiveFilter(filters)
      ? "No jumps match those filters."
      : "No jumps yet — plant your first leaf.";
    root.append(li);
    return { page: clamped, totalPages, totalFiltered: 0 };
  }

  for (const j of shown) {
    root.append(renderItem(j, onDelete));
  }

  if (totalPages > 1) {
    renderPagination(paginationRoot, clamped, totalPages, sorted.length, onPageChange);
  }

  return { page: clamped, totalPages, totalFiltered: sorted.length };
}

function hasActiveFilter(f: JumpFilters): boolean {
  return !!(f.search || f.dateFrom || f.dateTo || f.discipline || f.dropzone);
}

function applyFilters(jumps: Jump[], f: JumpFilters): Jump[] {
  const q = f.search.trim().toLowerCase();
  return jumps.filter((j) => {
    if (f.dateFrom && j.date < f.dateFrom) return false;
    if (f.dateTo && j.date > f.dateTo) return false;
    if (f.discipline && j.discipline !== f.discipline) return false;
    if (f.dropzone && j.dropzone !== f.dropzone) return false;
    if (q) {
      return (
        j.discipline.includes(q) ||
        j.dropzone.toLowerCase().includes(q) ||
        (j.notes ?? "").toLowerCase().includes(q) ||
        j.date.includes(q)
      );
    }
    return true;
  });
}

function renderItem(j: Jump, onDelete: (id: string) => void): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "jump-item";
  li.dataset.id = j.id;

  const header = document.createElement("div");
  header.className = "jump-item-header";
  const badge = document.createElement("span");
  badge.className = `badge disc-${j.discipline}`;
  badge.textContent = DISC_BADGE[j.discipline];
  header.append(badge);

  const date = document.createElement("span");
  date.className = "jump-date";
  date.textContent = formatDate(j.date);
  header.append(date);

  const del = document.createElement("button");
  del.className = "jump-delete";
  del.type = "button";
  del.setAttribute("aria-label", "Delete jump");
  del.textContent = "×";
  del.addEventListener("click", () => onDelete(j.id));
  header.append(del);

  li.append(header);

  const meta = document.createElement("div");
  meta.className = "jump-meta";
  const freefall = Math.max(0, j.exitAltitude - j.deploymentAltitude);
  meta.innerHTML =
    `<span>exit <strong>${j.exitAltitude.toLocaleString()}</strong> ft</span>` +
    `<span>deploy <strong>${j.deploymentAltitude.toLocaleString()}</strong> ft</span>` +
    `<span>freefall <strong>${freefall.toLocaleString()}</strong> ft</span>`;
  li.append(meta);

  if (j.notes) {
    const notes = document.createElement("p");
    notes.className = "jump-notes";
    notes.textContent = j.notes;
    li.append(notes);
  }

  const dz = document.createElement("div");
  dz.className = "jump-dz";
  dz.textContent = j.dropzone;
  li.append(dz);

  return li;
}

function renderPagination(
  root: HTMLElement,
  current: number,
  total: number,
  filteredCount: number,
  onPageChange: (p: number) => void,
) {
  const info = document.createElement("span");
  info.className = "page-info";
  info.textContent = `Page ${current} of ${total} (${filteredCount.toLocaleString()} jumps)`;

  const prev = document.createElement("button");
  prev.className = "ghost small";
  prev.textContent = "‹ Prev";
  prev.disabled = current <= 1;
  prev.addEventListener("click", () => onPageChange(current - 1));

  const next = document.createElement("button");
  next.className = "ghost small";
  next.textContent = "Next ›";
  next.disabled = current >= total;
  next.addEventListener("click", () => onPageChange(current + 1));

  root.append(prev, info, next);
}
