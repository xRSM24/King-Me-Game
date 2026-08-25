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
    name: "Snack Magnet",
    need: ["rat", "thief"],
    desc: "Snacks give double coins.",
    hint: "A raccoon and a rat, counting snacks.",
  },
  {
    id: "bulwark",
    name: "Double Pan",
    need: ["guard", "knight"],
    desc: "Each floor starts with two Lucky Pins.",
    hint: "Saucepan plus cardboard. Unstoppable.",
  },
  {
    id: "deathwind",
    name: "Pew Thief",
    need: ["archer", "thief"],
    desc: "Pew shots deal +2 and steal 1 coin.",
    hint: "A rubber band in sticky fingers.",
  },
  {
    id: "cinderstep",
    name: "Hot Cheese",
    need: ["pyromancer", "rat"],
    desc: "Leaving a tile makes it spicy.",
    hint: "Zoom, but spicy.",
  },
  {
    id: "saintbones",
    name: "Boop Back",
    need: ["priest", "knight"],
    desc: "A flying-off costume boops every neighbor for 2.",
    hint: "Soap plus cardboard equals justice.",
  },
  {
    id: "honorless",
    name: "Sneaky Boop",
    need: ["thief", "knight"],
    desc: "Bonks deal +2 if you moved this turn.",
    hint: "Knighthood, stolen, still cardboard.",
  },
  {
    id: "ashchoir",
    name: "Bubble Chili",
    need: ["priest", "pyromancer"],
    desc: "Snacking also slaps on a Lucky Pin.",
    hint: "Soap and spice, surprisingly legal.",
  },
  {
    id: "manyfaces",
    name: "Costume Party",
    need: [],
    uniqueCount: 4,
    desc: "Max pile +1 while the party lasts.",
    hint: "Four outfits arguing in a pile.",
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
