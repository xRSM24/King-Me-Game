import type { IdentityId, Meta } from "./types.ts";

export type { Meta };

const KEY = "soulstack-meta-v1";

const EMPTY: Meta = {
  remembrance: 0,
  seen: ["vagabond"],
  resonances: [],
  wins: 0,
  bestFloor: 0,
  bestGold: 0,
  runs: 0,
  perks: [],
  usurper: false,
  mute: false,
  shake: true,
};

export const PERKS = [
  {
    id: "stitch",
    name: "Spare Thread",
    cost: 12,
    desc: "Begin each descent with one stitch.",
  },
  {
    id: "stack5",
    name: "Deeper Pockets",
    cost: 20,
    desc: "Max stack 5. A fifth life is a fifth argument.",
  },
  {
    id: "gold",
    name: "Grave Change",
    cost: 10,
    desc: "Start with 4 gold.",
  },
  {
    id: "maps",
    name: "Cartographer's Guilt",
    cost: 16,
    desc: "The minimap reveals the whole floor.",
  },
] as const;

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, seen: [...EMPTY.seen], perks: [] };
    const p = JSON.parse(raw) as Partial<Meta>;
    return {
      ...EMPTY,
      ...p,
      seen: Array.isArray(p.seen) ? (p.seen as IdentityId[]) : ["vagabond"],
      resonances: Array.isArray(p.resonances) ? p.resonances : [],
      perks: Array.isArray(p.perks) ? p.perks : [],
    };
  } catch {
    return { ...EMPTY, seen: [...EMPTY.seen], perks: [] };
  }
}

export function saveMeta(meta: Meta): void {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

export function hasPerk(meta: Meta, id: string): boolean {
  return meta.perks.includes(id);
}

export function remembranceFor(opts: {
  floor: number;
  worn: number;
  resonances: number;
  win: boolean;
  usurper: boolean;
}): number {
  return (
    opts.floor * 2 +
    opts.worn * 3 +
    opts.resonances * 5 +
    (opts.win ? 18 : 0) +
    (opts.usurper ? 8 : 0)
  );
}
