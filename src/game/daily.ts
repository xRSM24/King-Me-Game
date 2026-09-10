import type { BoardSetup, FeltMod } from "./types.ts";
import { emptyLaws } from "./types.ts";
import { Rng, dailySeed, hashSeed } from "./rng.ts";
import { pickSafeHoles, pickSpots } from "./setup.ts";
import { modsFromSpec, setupBoard } from "./rules.ts";
import {
  HOLE_ONE_DESC,
  JUMP_BACK_BOTH_DESC,
  LONG_KING_DESC,
  enemyKingsDesc,
  holesDesc,
} from "./copy.ts";

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
  { you: 4, them: 8, themKings: 1, holeN: 0, bounce: false, themFly: false, hint: "8 Enemy vs 4 of you. Plan every hop — fewest moves sits on top." },
  { you: 4, them: 7, themKings: 1, holeN: 4, bounce: false, themFly: false, hint: "4 pits in the middle. Nobody may land on them." },
  { you: 3, them: 7, themKings: 2, holeN: 0, bounce: false, themFly: false, hint: "2 Enemy Kings (1 square any diagonal). 3 player pieces. Be tidy." },
  { you: 4, them: 8, themKings: 1, holeN: 0, bounce: true, themFly: false, hint: "Everyone may jump all 4 diagonals. Quiet slides still go forward 1 square." },
  { you: 4, them: 9, themKings: 1, holeN: 2, bounce: false, themFly: true, hint: "Their King may slide any empty squares on a diagonal. Steal it or get walked." },
];

/** One mean board, same for everyone on this UTC day. */
export function dailySpec(day = dailySeed()): BoardSetup {
  const rng = new Rng(hashSeed(day * 97 + 13));
  const flavor = FLAVORS[rng.int(FLAVORS.length)]!;
  const title = `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
  const used = new Set<string>();
  const youPos = pickSpots(rng, [7, 6, 5], flavor.you, [], used);
  const themPos = pickSpots(rng, [0, 1, 2], flavor.them, [], used);
  const draft: BoardSetup = {
    you: flavor.you,
    them: flavor.them,
    youRows: [7, 6, 5],
    themRows: [0, 1, 2],
    themKings: flavor.themKings,
    openKing: false,
    holes: [],
    bounce: flavor.bounce,
    themFly: flavor.themFly,
    youPos,
    themPos,
    blurb: "",
    feltMods: [],
  };
  let hid = 0;
  const laid = setupBoard(draft, () => ++hid);
  const holes = pickSafeHoles(rng, flavor.holeN, laid, emptyLaws(), modsFromSpec(draft));
  const feltMods: FeltMod[] = [];
  if (flavor.themKings === 1) feltMods.push({ title: "An Enemy King", desc: enemyKingsDesc(1), side: "them" });
  else if (flavor.themKings > 1) {
    feltMods.push({
      title: "Enemy Kings",
      desc: enemyKingsDesc(flavor.themKings),
      side: "them",
    });
  }
  if (holes.length) {
    feltMods.push({
      title: holes.length === 1 ? "A Hole in the Felt" : "Holes in the Felt",
      desc: holes.length === 1 ? HOLE_ONE_DESC : holesDesc(holes.length),
    });
  }
  if (flavor.bounce) {
    feltMods.push({
      title: "Everyone May Jump Backward",
      desc: JUMP_BACK_BOTH_DESC,
    });
  }
  if (flavor.themFly) feltMods.push({ title: "Long King", desc: LONG_KING_DESC, side: "them" });
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
    feltMods,
  };
}

export function dailyTitle(day = dailySeed()): string {
  const rng = new Rng(hashSeed(day * 97 + 13));
  rng.int(5);
  return `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
}
