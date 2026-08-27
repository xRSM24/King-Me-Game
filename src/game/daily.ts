import type { BoardSetup, Pos } from "./types.ts";
import { Rng, dailySeed, hashSeed } from "./rng.ts";

const ADJ = ["Ash", "Iron", "Long", "Crowded", "Night", "Thorn", "Quiet", "Bitter"];
const NOUN = ["File", "Pit", "Gate", "Row", "Crown", "Corner", "Well", "March"];

export function utcDayKey(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function holes(rng: Rng, n: number): Pos[] {
  const spots: Pos[] = [];
  for (let r = 2; r <= 5; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) spots.push({ r, c });
    }
  }
  rng.shuffle(spots);
  return spots.slice(0, n);
}

/** One mean board, same for everyone on this UTC day. */
export function dailySpec(day = dailySeed()): BoardSetup {
  const rng = new Rng(hashSeed(day * 97 + 13));
  const flavor = rng.int(5);
  const title = `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
  const base = {
    youRows: [7, 6, 5],
    themRows: [0, 1, 2],
    openKing: false,
    youPos: undefined as Pos[] | undefined,
    themPos: undefined as Pos[] | undefined,
  };
  const flavors: Omit<BoardSetup, "openKing">[] = [
    {
      ...base,
      you: 4,
      them: 8,
      themKings: 1,
      holes: [],
      bounce: false,
      themFly: false,
      blurb: `${title}. Outnumbered. Plan every hop — fewest moves sits on top.`,
    },
    {
      ...base,
      you: 4,
      them: 7,
      themKings: 1,
      holes: holes(rng, 4),
      bounce: false,
      themFly: false,
      blurb: `${title}. Holes in the middle. Don't land in a pit.`,
    },
    {
      ...base,
      you: 3,
      them: 7,
      themKings: 2,
      holes: [],
      bounce: false,
      themFly: false,
      blurb: `${title}. Two charcoal kings. Three ivory. Be tidy.`,
    },
    {
      ...base,
      you: 4,
      them: 8,
      themKings: 1,
      holes: [],
      bounce: true,
      themFly: false,
      blurb: `${title}. Everyone jumps backward. Chaos favors the house.`,
    },
    {
      ...base,
      you: 4,
      them: 9,
      themKings: 1,
      holes: holes(rng, 2),
      bounce: false,
      themFly: true,
      blurb: `${title}. Their king slides far. Steal it or get walked.`,
    },
  ];
  const spec = flavors[flavor]!;
  return { ...spec, openKing: false };
}

export function dailyTitle(day = dailySeed()): string {
  const rng = new Rng(hashSeed(day * 97 + 13));
  rng.int(5);
  return `${rng.pick(ADJ)} ${rng.pick(NOUN)}`;
}
