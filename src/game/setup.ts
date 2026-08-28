import type { BoardSetup, FeltMod, Pos } from "./types.ts";
import { PATH_END, isDark } from "./types.ts";
import { Rng, hashSeed } from "./rng.ts";

const ADJ = [
  "Sunny",
  "Peppy",
  "Dusty",
  "Spiky",
  "Stormy",
  "Velvet",
  "Spark",
  "Moon",
  "Rapid",
  "Hidden",
  "Brave",
  "Lucky",
  "Misty",
  "Zesty",
  "Cherry",
  "Thunder",
];
const NOUN = [
  "Meadow",
  "Alley",
  "Bridge",
  "Garden",
  "Tower",
  "River",
  "Stairs",
  "Gate",
  "Lantern",
  "Parade",
  "Castle",
  "File",
  "Pit",
  "Well",
  "March",
  "Corner",
];

function key(p: Pos): string {
  return `${p.r},${p.c}`;
}

function blocked(holes: Pos[], p: Pos): boolean {
  return holes.some((h) => h.r === p.r && h.c === p.c);
}

export function darkPlayable(rows: number[], holes: Pos[] = []): Pos[] {
  const out: Pos[] = [];
  for (const r of rows) {
    for (let c = 0; c < 8; c++) {
      if (!isDark(r, c)) continue;
      const p = { r, c };
      if (!blocked(holes, p)) out.push(p);
    }
  }
  return out;
}

export function pickSpots(rng: Rng, rows: number[], n: number, holes: Pos[], used: Set<string>): Pos[] {
  const spots = darkPlayable(rows, holes).filter((p) => !used.has(key(p)));
  rng.shuffle(spots);
  const out = spots.slice(0, Math.max(0, n));
  for (const p of out) used.add(key(p));
  return out;
}

export function pickHoles(rng: Rng, n: number, used: Set<string>): Pos[] {
  const spots = darkPlayable([2, 3, 4, 5]).filter((p) => !used.has(key(p)));
  rng.shuffle(spots);
  const out = spots.slice(0, Math.max(0, n));
  for (const p of out) used.add(key(p));
  return out;
}

/** Ivory (higher row) jumps a charcoal toward the crown. */
export function openingJump(rng: Rng, holes: Pos[] = []): { you: Pos; them: Pos; land: Pos } {
  const options: { you: Pos; them: Pos; land: Pos }[] = [];
  for (let r = 2; r <= 4; r++) {
    for (let c = 0; c < 8; c++) {
      if (!isDark(r, c)) continue;
      const land = { r, c };
      if (blocked(holes, land)) continue;
      for (const dc of [-1, 1]) {
        const them = { r: r + 1, c: c + dc };
        const you = { r: r + 2, c: c + dc * 2 };
        if (!isDark(them.r, them.c) || !isDark(you.r, you.c)) continue;
        if (them.c < 0 || them.c > 7 || you.c < 0 || you.c > 7) continue;
        if (you.r > 7) continue;
        if (blocked(holes, them) || blocked(holes, you)) continue;
        options.push({ you, them, land });
      }
    }
  }
  rng.shuffle(options);
  return options[0] ?? { you: { r: 5, c: 2 }, them: { r: 4, c: 3 }, land: { r: 3, c: 4 } };
}

export const CLIMB_SKILL = [0.1, 0.3, 0.48, 0.66, 0.82, 0.95];

export function climbNames(seed: number): string[] {
  const rng = new Rng(hashSeed(seed ^ 0x51a1d));
  const used = new Set<string>();
  const pick = (pool: string[]): string => {
    for (let i = 0; i < 24; i++) {
      const n = rng.pick(pool);
      if (!used.has(n)) {
        used.add(n);
        return n;
      }
    }
    return rng.pick(pool);
  };
  return [
    `First Hop · ${pick(ADJ)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `The Crown · ${pick(NOUN)}`,
  ];
}

interface Tier {
  you: number;
  them: [number, number];
  themKings: [number, number];
  holes: [number, number];
  bounce: number;
  themFly: boolean;
  youRows: number[];
  themRows: number[];
  race: number;
}

const TIERS: Tier[] = [
  {
    you: 3,
    them: [2, 2],
    themKings: [0, 0],
    holes: [0, 0],
    bounce: 0,
    themFly: false,
    youRows: [7, 6],
    themRows: [0, 1],
    race: 0,
  },
  {
    you: 4,
    them: [4, 5],
    themKings: [0, 0],
    holes: [0, 1],
    bounce: 0,
    themFly: false,
    youRows: [7, 6],
    themRows: [0, 1],
    race: 0.55,
  },
  {
    you: 4,
    them: [5, 6],
    themKings: [0, 1],
    holes: [2, 4],
    bounce: 0.15,
    themFly: false,
    youRows: [7, 6],
    themRows: [0, 1],
    race: 0.2,
  },
  {
    you: 5,
    them: [6, 7],
    themKings: [1, 1],
    holes: [1, 3],
    bounce: 0.25,
    themFly: false,
    youRows: [7, 6, 5],
    themRows: [0, 1, 2],
    race: 0,
  },
  {
    you: 5,
    them: [7, 8],
    themKings: [1, 2],
    holes: [0, 3],
    bounce: 0.55,
    themFly: false,
    youRows: [7, 6, 5],
    themRows: [0, 1, 2],
    race: 0,
  },
  {
    you: 6,
    them: [9, 11],
    themKings: [2, 3],
    holes: [0, 2],
    bounce: 0.2,
    themFly: true,
    youRows: [7, 6, 5],
    themRows: [0, 1, 2],
    race: 0,
  },
];

function between(rng: Rng, span: [number, number]): number {
  return rng.range(span[0], span[1]);
}

function firstHop(rng: Rng, extraYou: number, openKing: boolean): BoardSetup {
  const used = new Set<string>();
  const jump = openingJump(rng);
  used.add(key(jump.you));
  used.add(key(jump.them));
  const you = 3 + extraYou;
  const youPos = [jump.you, ...pickSpots(rng, [7, 6], you - 1, [], used)];
  const themPos = [jump.them, ...pickSpots(rng, [0, 1, 2], 1, [], used)];
  return {
    you,
    them: 2,
    youRows: [7, 6],
    themRows: [0, 1],
    themKings: 0,
    openKing,
    holes: [],
    bounce: false,
    themFly: false,
    youPos,
    themPos,
    blurb: "Jump the star first. Captures are the fun part!",
    feltMods: [
      { title: "First Jump", desc: "Jump the star first. Captures are the fun part!" },
    ],
  };
}

/** Each climb rolls a new path. Later indexes outscale Stars. */
export function boardSpec(index: number, extraYou: number, openKing: boolean, rng: Rng): BoardSetup {
  const i = Math.min(Math.max(index, 0), PATH_END - 1);
  if (i === 0) return firstHop(rng, extraYou, openKing);
  const tier = TIERS[i]!;
  const race = rng.chance(tier.race);
  const youRows = race ? [3, 2] : tier.youRows;
  const themRows = race ? [6, 5, 7] : tier.themRows;
  const them = between(rng, tier.them);
  const themKings = between(rng, tier.themKings);
  const holeN = between(rng, tier.holes);
  const bounce = rng.chance(tier.bounce);
  const themFly = tier.themFly;
  const used = new Set<string>();
  const holes = pickHoles(rng, holeN, used);
  const you = tier.you + extraYou;
  const youPos = pickSpots(rng, youRows, you, holes, used);
  const themPos = pickSpots(rng, themRows, them, holes, used);
  const feltMods: FeltMod[] = [];
  if (race) feltMods.push({ title: "Race to the Far Row", desc: "Make a King before the Enemy does." });
  if (holes.length) {
    feltMods.push({
      title: holes.length === 1 ? "A Hole in the Felt" : "Holes in the Felt",
      desc: "Don't land in a pit.",
    });
  }
  if (themKings === 1) feltMods.push({ title: "An Enemy King", desc: "The Enemy starts with a King.", side: "them" });
  else if (themKings > 1) {
    feltMods.push({
      title: "Enemy Kings",
      desc: `The Enemy starts with ${themKings} Kings.`,
      side: "them",
    });
  }
  if (bounce) {
    feltMods.push({
      title: "Everyone May Jump Backward",
      desc: "Player and Enemy pieces may jump backward.",
    });
  }
  if (themFly) feltMods.push({ title: "Long King", desc: "Enemy Kings slide extra far.", side: "them" });
  const blurb = feltMods.length ? feltMods.map((m) => m.title).join(" · ") : `${them} Enemy vs ${you} player pieces`;
  return {
    you,
    them,
    youRows,
    themRows,
    themKings,
    openKing,
    holes,
    bounce,
    themFly,
    youPos,
    themPos,
    blurb,
    feltMods,
  };
}
