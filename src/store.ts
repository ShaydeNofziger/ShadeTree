import type { Jump } from "./types.ts";
import { sampleJumps } from "./seed.ts";

const KEY = "shadetree:v2:jumps";

export function loadJumps(): Jump[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedAndPersist();
    const parsed = JSON.parse(raw) as Jump[];
    if (!Array.isArray(parsed)) return seedAndPersist();
    return parsed;
  } catch {
    return seedAndPersist();
  }
}

export function saveJumps(jumps: Jump[]): void {
  localStorage.setItem(KEY, JSON.stringify(jumps));
}

export function resetToSeed(): Jump[] {
  const s = sampleJumps();
  saveJumps(s);
  return s;
}

function seedAndPersist(): Jump[] {
  const s = sampleJumps();
  saveJumps(s);
  return s;
}
