import type { Jump } from "./types.ts";
import { sampleJumps, scenarioById, type ScenarioId } from "./seed.ts";
import { uid } from "./util.ts";

const KEY = "shadetree:v2:jumps";

/** Ensure every jump has an id (backfill seed/imported data). */
function ensureIds(jumps: Jump[]): Jump[] {
  for (const j of jumps) { if (!j.id) j.id = uid(); }
  return jumps;
}

export function loadJumps(): Jump[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedAndPersist();
    const parsed = JSON.parse(raw) as Jump[];
    if (!Array.isArray(parsed)) return seedAndPersist();
    return ensureIds(parsed);
  } catch {
    return seedAndPersist();
  }
}

export function saveJumps(jumps: Jump[]): void {
  localStorage.setItem(KEY, JSON.stringify(jumps));
}

export function resetToSeed(): Jump[] {
  const s = ensureIds(sampleJumps());
  saveJumps(s);
  return s;
}

export function loadScenario(id: ScenarioId): Jump[] {
  const s = ensureIds(scenarioById(id).generate());
  saveJumps(s);
  return s;
}

function seedAndPersist(): Jump[] {
  const s = ensureIds(sampleJumps());
  saveJumps(s);
  return s;
}
