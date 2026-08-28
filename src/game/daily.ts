import type { BoardSetup } from "./types.ts";
import { Rng, dailySeed, hashSeed } from "./rng.ts";
import { pickHoles, pickSpots } from "./setup.ts";

const ADJ = ["Ash", "Iron", "Long", "Crowded", "Night", "Thorn", "Quiet", "Bitter"];
const NOUN = ["File", "Pit", "Gate", "Row", "Crown", "Corner", "Well", "March"];

export function utcDayKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Flavor = {
  you: number;
  them: number;
  themKings: number;
  holeN: number;
  bounce: boolean;
  themFly: boolean;
  hint: string;
};

const FLAVORS: Flavor[] = [
  { you: 4, them: 8, themKings: 1, holeN: 0, bounce: false, themFly: false, hint: "Outnumbered. Plan every hop — fewest moves sits on top." },
  { you: 4, them: 7, themKings: 1, holeN: 4, bounce: false, themFly: false, hint: "Holes in the middle. Don't land in a pit." },
  { you: 3, them: 7, themKings: 2, holeN: 0, bounce: false, themFly: false, hint: "Two charcoal kings. Three ivory. Be tidy." },
  { you: 4, them: 8, themKings: 1, holeN: 0, bounce: true, themFly: false, hint: "Everyone jumps backward. Chaos favors the house." },
  { you: 4, them: 9, themKings: 1, holeN: 2, bounce: false, themFly: true, hint: "Their king slides far. Steal it or get walked." },
];

/** One mean board, same for everyone on this UTC day. */
export function dailySpec(day = dailySeed()): BoardSetup {
  const rng = new Rng(hashSeed(day * 97 + 13));
  const flavor = FLAVORS[rng.int(FLAVORS.length)]!;
  const title = `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
  const used = new Set<string>();
  const holes = pickHoles(rng, flavor.holeN, used);
  const youPos = pickSpots(rng, [7, 6, 5], flavor.you, holes, used);
  const themPos = pickSpots(rng, [0, 1, 2], flavor.them, holes, used);
  return {
    you: flavor.you,
    them: flavor.them,
    youRows: [7, 6, 5],
    themRows: [0, 1, 2],
    themKings: flavor.themKings,
    openKing: false,
    holes,
    bounce: flavor.bounce,
    themFly: flavor.themFly,
    youPos,
    themPos,
    blurb: `${title}. ${flavor.hint}`,
  };
}

export function dailyTitle(day = dailySeed()): string {
  const rng = new Rng(hashSeed(day * 97 + 13));
  rng.int(5);
  return `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
}
