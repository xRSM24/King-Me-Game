import type { Meta } from "./types.ts";

const KEY = "jumpgrave-meta-v1";

const EMPTY: Meta = {
  notches: 0,
  runs: 0,
  wins: 0,
  bestBoard: 0,
  mute: false,
};

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Partial<Meta>;
    return {
      ...EMPTY,
      ...p,
      notches: typeof p.notches === "number" ? p.notches : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveMeta(meta: Meta): void {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

/** Permanent bonus from Stars. Approaches +1 extra man and a 30% opening-king chance. */
export function notchBonus(notches: number): { extra: number; kingChance: number } {
  const s = Math.max(0, notches);
  return {
    extra: Math.round(0.85 * (1 - Math.exp(-s / 70))),
    kingChance: 0.3 * (1 - Math.exp(-s / 90)),
  };
}

export function notchesFromRun(hops: number, current: number): number {
  const raw = 6 + hops * 0.35;
  const fade = 90 / (90 + current);
  return Math.max(2, Math.round(raw * fade));
}
