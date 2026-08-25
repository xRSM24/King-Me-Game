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
    name: "Extra Pin",
    cost: 18,
    desc: "Start with one Lucky Pin.",
  },
  {
    id: "stack5",
    name: "Bigger Backpack",
    cost: 28,
    desc: "Max pile of 4 costumes.",
  },
  {
    id: "gold",
    name: "Snack Money",
    cost: 10,
    desc: "Start with 4 coins.",
  },
  {
    id: "maps",
    name: "See-Through Socks",
    cost: 16,
    desc: "The mini-map shows the whole floor.",
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
