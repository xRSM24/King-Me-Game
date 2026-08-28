import type { BoardSetup, FeltMod, Pos } from "./types.ts";
import { PATH_END, isDark } from "./types.ts";
import { Rng, hashSeed } from "./rng.ts";
import {
  CLOSE_QUARTERS_DESC,
  FIRST_JUMP_DESC,
  FIRST_LANE_CENTER,
  FIRST_LANE_LEFT,
  FIRST_LANE_RIGHT,
  HOLE_ONE_DESC,
  JUMP_BACK_BOTH_DESC,
  LONG_KING_DESC,
  OPPOSITE_WINGS_DESC,
  RACE_DESC,
  STAGGER_DESC,
  enemyKingsDesc,
  holesDesc,
  laneDesc,
} from "./copy.ts";

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
  "Copper",
  "Plum",
  "Neon",
  "Foggy",
  "Jolly",
  "Crisp",
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
  "Harbor",
  "Attic",
  "Dune",
  "Forge",
  "Orchard",
  "Kettle",
];

export type Lane = "any" | "left" | "right" | "center";

export interface FeltTheme {
  rim: string;
  outer: string;
  back: string;
  dark: string;
  darkOdd: string;
  light: string;
}

const FELTS: FeltTheme[] = [
  { rim: "#ff8ec8", outer: "#3d2466", back: "#2a1848", dark: "#4a2d78", darkOdd: "#3d2466", light: "#ffe9f4" },
  { rim: "#5ad7c4", outer: "#143d3a", back: "#0f2a28", dark: "#1f5c56", darkOdd: "#164740", light: "#e5fff8" },
  { rim: "#ffb347", outer: "#4a2410", back: "#2a1408", dark: "#6b3a1c", darkOdd: "#542c14", light: "#fff0dd" },
  { rim: "#7eb6ff", outer: "#1a2a55", back: "#101830", dark: "#2a4580", darkOdd: "#1e3466", light: "#e8f1ff" },
  { rim: "#ff6b8a", outer: "#4a1028", back: "#2a0814", dark: "#6b2040", darkOdd: "#541830", light: "#ffe8ee" },
  { rim: "#c5a3ff", outer: "#2a1855", back: "#160c30", dark: "#4a3080", darkOdd: "#3a2466", light: "#f3e9ff" },
  { rim: "#9dffb0", outer: "#14331c", back: "#0c1e10", dark: "#2a5c38", darkOdd: "#1e472c", light: "#e9ffee" },
  { rim: "#ffd45a", outer: "#3d2a10", back: "#221808", dark: "#6b5020", darkOdd: "#544018", light: "#fff8e0" },
];

export function feltTheme(seed: number, index: number): FeltTheme {
  const rng = new Rng(hashSeed(seed * 13 + (index + 3) * 7919));
  return rng.pick(FELTS);
}

function inLane(p: Pos, lane: Lane): boolean {
  if (lane === "left") return p.c <= 3;
  if (lane === "right") return p.c >= 4;
  if (lane === "center") return p.c >= 2 && p.c <= 5;
  return true;
}

function laneTitle(lane: Lane): string | null {
  if (lane === "left") return "Left File";
  if (lane === "right") return "Right File";
  if (lane === "center") return "Center Crowd";
  return null;
}

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

export function pickSpots(
  rng: Rng,
  rows: number[],
  n: number,
  holes: Pos[],
  used: Set<string>,
  lane: Lane = "any",
): Pos[] {
  const open = darkPlayable(rows, holes).filter((p) => !used.has(key(p)));
  const narrowed = lane === "any" ? open : open.filter((p) => inLane(p, lane));
  const spots = narrowed.length >= n ? narrowed : open;
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
export function openingJump(rng: Rng, holes: Pos[] = [], lane: Lane = "any"): { you: Pos; them: Pos; land: Pos } {
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
  const preferred = lane === "any" ? options : options.filter((o) => inLane(o.land, lane));
  const pool = preferred.length ? preferred : options;
  rng.shuffle(pool);
  return pool[0] ?? { you: { r: 5, c: 2 }, them: { r: 4, c: 3 }, land: { r: 3, c: 4 } };
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
    them: [4, 6],
    themKings: [0, 0],
    holes: [0, 2],
    bounce: 0,
    themFly: false,
    youRows: [7, 6],
    themRows: [0, 1],
    race: 0.42,
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
  const lane: Lane = rng.pick(["left", "right", "center"]);
  const jump = openingJump(rng, [], lane);
  used.add(key(jump.you));
  used.add(key(jump.them));
  const you = 3 + extraYou;
  const youPos = [jump.you, ...pickSpots(rng, [7, 6, 5], you - 1, [], used, lane)];
  const themPos = [jump.them, ...pickSpots(rng, [0, 1, 2], 1, [], used, lane)];
  const file = laneTitle(lane);
  const feltMods: FeltMod[] = [{ title: "First Jump", desc: FIRST_JUMP_DESC }];
  if (file) {
    const laneBlurb =
      lane === "left" ? FIRST_LANE_LEFT : lane === "right" ? FIRST_LANE_RIGHT : FIRST_LANE_CENTER;
    feltMods.push({
      title: file,
      desc: laneBlurb,
    });
  }
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
    blurb: FIRST_JUMP_DESC,
    feltMods,
  };
}

/** Each New climb rolls a new path. Daily boards ignore this and use dailySeed(). */
export function boardSpec(index: number, extraYou: number, openKing: boolean, rng: Rng): BoardSetup {
  const i = Math.min(Math.max(index, 0), PATH_END - 1);
  if (i === 0) return firstHop(rng, extraYou, openKing);
  const tier = TIERS[i]!;
  let youRows = tier.youRows;
  let themRows = tier.themRows;
  let youLane: Lane = "any";
  let themLane: Lane = "any";
  const feltMods: FeltMod[] = [];
  const shape = rng.next();
  if (rng.chance(tier.race)) {
    youRows = [3, 2];
    themRows = [6, 5, 7];
    feltMods.push({ title: "Race to the Far Row", desc: RACE_DESC });
  } else if (shape < 0.2) {
    youLane = rng.pick(["left", "right"]);
    themLane = youLane;
    feltMods.push({
      title: youLane === "left" ? "Left File" : "Right File",
      desc: laneDesc(youLane),
    });
  } else if (shape < 0.38) {
    youLane = rng.pick(["left", "right"]);
    themLane = youLane === "left" ? "right" : "left";
    feltMods.push({
      title: "Opposite Wings",
      desc: OPPOSITE_WINGS_DESC,
    });
  } else if (shape < 0.52 && i >= 2) {
    youRows = [6, 5];
    themRows = [1, 2];
    feltMods.push({ title: "Close Quarters", desc: CLOSE_QUARTERS_DESC });
  } else if (shape < 0.66) {
    youRows = [7, 6, 5];
    themRows = [0, 1, 2];
    youLane = "center";
    themLane = "center";
    feltMods.push({ title: "Center Crowd", desc: laneDesc("center") });
  } else if (shape < 0.8) {
    youRows = [7, 6, 5];
    themRows = [0, 1, 2];
    feltMods.push({ title: "Staggered Line", desc: STAGGER_DESC });
  }

  const them = between(rng, tier.them);
  const themKings = between(rng, tier.themKings);
  const holeN = between(rng, tier.holes);
  const bounce = rng.chance(tier.bounce);
  const themFly = tier.themFly;
  const used = new Set<string>();
  const holes = pickHoles(rng, holeN, used);
  const you = tier.you + extraYou;
  const youPos = pickSpots(rng, youRows, you, holes, used, youLane);
  const themPos = pickSpots(rng, themRows, them, holes, used, themLane);
  if (holes.length) {
    feltMods.push({
      title: holes.length === 1 ? "A Hole in the Felt" : "Holes in the Felt",
      desc: holes.length === 1 ? HOLE_ONE_DESC : holesDesc(holes.length),
    });
  }
  if (themKings === 1) feltMods.push({ title: "An Enemy King", desc: enemyKingsDesc(1), side: "them" });
  else if (themKings > 1) {
    feltMods.push({
      title: "Enemy Kings",
      desc: enemyKingsDesc(themKings),
      side: "them",
    });
  }
  if (bounce) {
    feltMods.push({
      title: "Everyone May Jump Backward",
      desc: JUMP_BACK_BOTH_DESC,
    });
  }
  if (themFly) feltMods.push({ title: "Long King", desc: LONG_KING_DESC, side: "them" });
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
