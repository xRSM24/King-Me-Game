import { dailySeed, hashSeed, Rng } from "./rng.ts";
import type { BoardSetup, Laws } from "./types.ts";
import { emptyLaws } from "./types.ts";

export type DailyModId =
  | "ivoryKing"
  | "extraIvory"
  | "jumpBack"
  | "skipJump"
  | "thirdOops"
  | "houseKing"
  | "extraHouse"
  | "houseBack"
  | "houseFly"
  | "oneOops";

export interface DailyMod {
  id: DailyModId;
  side: "you" | "them";
  name: string;
  desc: string;
}

const PLAYER: DailyMod[] = [
  { id: "ivoryKing", side: "you", name: "Start Crowned", desc: "One ivory man already wears a crown." },
  { id: "extraIvory", side: "you", name: "Plus One", desc: "You sit an extra checker." },
  { id: "jumpBack", side: "you", name: "Ivory Boing", desc: "Your men may jump backward." },
  { id: "skipJump", side: "you", name: "Skip the Jump", desc: "You don't have to jump. The house still does." },
  { id: "thirdOops", side: "you", name: "Third Oops", desc: "Three take-backs instead of two." },
];

const HOUSE: DailyMod[] = [
  { id: "houseKing", side: "them", name: "Shadow Crown", desc: "The house sits an extra king." },
  { id: "extraHouse", side: "them", name: "Crowded Felt", desc: "One more charcoal checker." },
  { id: "houseBack", side: "them", name: "House Boing", desc: "Charcoal men may jump backward." },
  { id: "houseFly", side: "them", name: "Long King", desc: "Their kings slide extra far." },
  { id: "oneOops", side: "them", name: "Tight Rope", desc: "Only one Oops today." },
];

function oopsConflict(a: DailyModId, b: DailyModId): boolean {
  return (a === "thirdOops" && b === "oneOops") || (a === "oneOops" && b === "thirdOops");
}

/** Same two-or-three mods for everybody on this UTC day. One helps ivory, one helps the house. */
export function dailyMods(day = dailySeed()): DailyMod[] {
  const rng = new Rng(hashSeed(day * 193 + 7));
  const you = rng.pick(PLAYER);
  const them = rng.pick(HOUSE);
  const picked: DailyMod[] = [you, them];
  if (rng.chance(0.42)) {
    const rest = [...PLAYER, ...HOUSE].filter(
      (m) => m.id !== you.id && m.id !== them.id && !oopsConflict(m.id, you.id) && !oopsConflict(m.id, them.id),
    );
    if (rest.length) picked.push(rng.pick(rest));
  }
  return picked;
}

export function applyDailyMods(
  spec: BoardSetup,
  mods: DailyMod[],
): { spec: BoardSetup; laws: Laws; oops: number; themBack: boolean; themFly: boolean } {
  let next = { ...spec };
  const laws = emptyLaws();
  let oops = 2;
  let themBack = false;
  let themFly = spec.themFly;
  for (const m of mods) {
    if (m.id === "ivoryKing") {
      next = { ...next, openKing: true };
      laws.openKing = true;
    } else if (m.id === "extraIvory") {
      next = { ...next, you: next.you + 1 };
      laws.extraMan = true;
    } else if (m.id === "jumpBack") {
      laws.backJump = true;
    } else if (m.id === "skipJump") {
      laws.freeJump = true;
    } else if (m.id === "thirdOops") {
      oops = 3;
    } else if (m.id === "houseKing") {
      next = { ...next, themKings: next.themKings + 1 };
    } else if (m.id === "extraHouse") {
      next = { ...next, them: next.them + 1 };
    } else if (m.id === "houseBack") {
      themBack = true;
    } else if (m.id === "houseFly") {
      themFly = true;
    } else if (m.id === "oneOops") {
      oops = 1;
    }
  }
  return { spec: next, laws, oops, themBack, themFly };
}
