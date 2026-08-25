import type { IdentityId, RunState } from "./types.ts";

export interface Resonance {
  id: string;
  name: string;
  need: IdentityId[];
  uniqueCount?: number;
  desc: string;
  hint: string;
}

export const RESONANCES: Resonance[] = [
  {
    id: "packrat",
    name: "Packrat",
    need: ["rat", "thief"],
    desc: "Harvests yield double gold.",
    hint: "A thief and a rat, counting together.",
  },
  {
    id: "bulwark",
    name: "Bulwark",
    need: ["guard", "knight"],
    desc: "Each floor begins with two stitches.",
    hint: "Shield and oath, stacked.",
  },
  {
    id: "deathwind",
    name: "Deathwind",
    need: ["archer", "thief"],
    desc: "Ranged shots deal +2 and steal 1 gold.",
    hint: "A bow in a pickpocket's hands.",
  },
  {
    id: "cinderstep",
    name: "Cinderstep",
    need: ["pyromancer", "rat"],
    desc: "Leaving a tile ignites it.",
    hint: "Filth that learned fire.",
  },
  {
    id: "saintbones",
    name: "Saint of Bones",
    need: ["priest", "knight"],
    desc: "A torn soul lashes every adjacent enemy for 2.",
    hint: "A prayer with a sword still in it.",
  },
  {
    id: "honorless",
    name: "Honorless",
    need: ["thief", "knight"],
    desc: "Melee deals +2 if you moved this turn.",
    hint: "Knighthood, stolen.",
  },
  {
    id: "ashchoir",
    name: "Ash Choir",
    need: ["priest", "pyromancer"],
    desc: "Harvesting also weaves a stitch.",
    hint: "Rites and accidents, sung together.",
  },
  {
    id: "manyfaces",
    name: "Many Faces",
    need: [],
    uniqueCount: 4,
    desc: "Max stack +1 while the choir holds.",
    hint: "Four different lives, still arguing.",
  },
];

export function buildSet(state: RunState): Set<IdentityId> {
  const s = new Set<IdentityId>(state.player.stack);
  for (const id of state.memories) s.add(id);
  return s;
}

export function activeResonances(state: RunState): Resonance[] {
  const have = buildSet(state);
  const unique = new Set(state.player.stack).size;
  return RESONANCES.filter((r) => {
    if (r.uniqueCount && unique < r.uniqueCount) return false;
    return r.need.every((id) => have.has(id));
  });
}

export function hasRes(state: RunState, id: string): boolean {
  return activeResonances(state).some((r) => r.id === id);
}

export function echoSet(state: RunState): Set<IdentityId> {
  const s = new Set<IdentityId>(state.player.stack.slice(1));
  for (const id of state.memories) s.add(id);
  return s;
}
