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

export function renderJumpList(
  root: HTMLOListElement,
  jumps: Jump[],
  filter: string,
  onDelete: (id: string) => void,
): void {
  root.innerHTML = "";
  const q = filter.trim().toLowerCase();
  const filtered = jumps.filter((j) => {
    if (!q) return true;
    return (
      j.discipline.includes(q) ||
      j.dropzone.toLowerCase().includes(q) ||
      (j.notes ?? "").toLowerCase().includes(q) ||
      j.date.includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    const li = document.createElement("li");
    li.className = "jump-empty";
    li.textContent = q
      ? "No jumps match that filter."
      : "No jumps yet — plant your first leaf.";
    root.append(li);
    return;
  }

  // Cap the visible list — a career can be thousands of jumps.
  const MAX_VISIBLE = 300;
  const shown = sorted.slice(0, MAX_VISIBLE);
  const hidden = sorted.length - shown.length;

  for (const j of shown) {
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

    const dz = document.createElement("span");
    dz.className = "jump-dz";
    dz.textContent = j.dropzone;
    header.append(dz);

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

    root.append(li);
  }

  if (hidden > 0) {
    const more = document.createElement("li");
    more.className = "jump-empty";
    more.textContent =
      `Showing ${shown.length.toLocaleString()} of ` +
      `${sorted.length.toLocaleString()} jumps — refine the search to see more.`;
    root.append(more);
  }
}
