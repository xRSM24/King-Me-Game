import { dailySeed, hashSeed, Rng } from "./rng.ts";
import type { BoardSetup, FeltMod, Laws } from "./types.ts";
import { emptyLaws } from "./types.ts";
import {
  EXTRA_THEM_DESC,
  EXTRA_YOU_DAILY_DESC,
  HOUSE_KING_DESC,
  JUMP_BACK_THEM_DESC,
  JUMP_BACK_YOU_DESC,
  LONG_KING_DESC,
  ONE_OOPS_DESC,
  OPEN_KING_YOU_DESC,
  THIRD_OOPS_DESC,
} from "./copy.ts";

export type DailyModId =
  | "ivoryKing"
  | "extraIvory"
  | "jumpBack"
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
  { id: "ivoryKing", side: "you", name: "Start as King", desc: OPEN_KING_YOU_DESC },
  { id: "extraIvory", side: "you", name: "Plus One", desc: EXTRA_YOU_DAILY_DESC },
  { id: "jumpBack", side: "you", name: "Player Boing", desc: JUMP_BACK_YOU_DESC },
  { id: "thirdOops", side: "you", name: "Third Oops", desc: THIRD_OOPS_DESC },
];

const ENEMY: DailyMod[] = [
  { id: "houseKing", side: "them", name: "An Enemy King", desc: HOUSE_KING_DESC },
  { id: "extraHouse", side: "them", name: "Crowded Felt", desc: EXTRA_THEM_DESC },
  { id: "houseBack", side: "them", name: "Enemy Boing", desc: JUMP_BACK_THEM_DESC },
  { id: "houseFly", side: "them", name: "Long King", desc: LONG_KING_DESC },
  { id: "oneOops", side: "them", name: "Tight Rope", desc: ONE_OOPS_DESC },
];

function oopsConflict(a: DailyModId, b: DailyModId): boolean {
  return (a === "thirdOops" && b === "oneOops") || (a === "oneOops" && b === "thirdOops");
}

/** Same two-or-three mods for everybody on this UTC day. One helps you, one helps the Enemy. */
export function dailyMods(day = dailySeed()): DailyMod[] {
  const rng = new Rng(hashSeed(day * 193 + 7));
  const you = rng.pick(PLAYER);
  const them = rng.pick(ENEMY);
  const picked: DailyMod[] = [you, them];
  if (rng.chance(0.42)) {
    const rest = [...PLAYER, ...ENEMY].filter(
      (m) => m.id !== you.id && m.id !== them.id && !oopsConflict(m.id, you.id) && !oopsConflict(m.id, them.id),
    );
    if (rest.length) picked.push(rng.pick(rest));
  }
  return picked;
}

export function asFelt(mod: DailyMod): FeltMod {
  return { title: mod.name, desc: mod.desc, side: mod.side };
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
