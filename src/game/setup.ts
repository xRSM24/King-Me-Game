import type { BoardMods, BoardSetup, FeltMod, Laws, Pos } from "./types.ts";
import { PATH_END, emptyLaws, isDark, samePos } from "./types.ts";
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
import { at, isHoleTrapped, modsFromSpec, piecesOf, setupBoard, type Board } from "./rules.ts";

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
  { rim: "#c4a35a", outer: "#4a2e18", back: "#2a1a0c", dark: "#8b5a2b", darkOdd: "#7a4e24", light: "#f3e2c4" },
  { rim: "#b88858", outer: "#3d2414", back: "#22140a", dark: "#6b3a22", darkOdd: "#5c301c", light: "#f6d7c3" },
  { rim: "#a89060", outer: "#3a2a14", back: "#201808", dark: "#7a5c32", darkOdd: "#6a4e2a", light: "#efe4c8" },
  { rim: "#c4b070", outer: "#4a3818", back: "#2a200c", dark: "#9a6b3a", darkOdd: "#885c32", light: "#f7eed8" },
  { rim: "#a87850", outer: "#3a2014", back: "#1e1008", dark: "#5c3d2e", darkOdd: "#4e3428", light: "#eadcc4" },
  { rim: "#b07050", outer: "#3a1810", back: "#1c0e08", dark: "#6b2e22", darkOdd: "#5a261c", light: "#f0dcc8" },
  { rim: "#9a9860", outer: "#323214", back: "#1a1a0c", dark: "#6b6a32", darkOdd: "#5a5828", light: "#efe8c9" },
  { rim: "#c4a060", outer: "#4a3818", back: "#2a200c", dark: "#b08a48", darkOdd: "#9a783c", light: "#f5f0d4" },
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

function trappedByHoles(board: Board, laws: Laws, mods: BoardMods): Pos[] {
  const out: Pos[] = [];
  for (const side of ["you", "them"] as const) {
    for (const { pos } of piecesOf(board, side)) {
      if (isHoleTrapped(board, pos, laws, mods)) out.push(pos);
    }
  }
  return out;
}

/** Place pits one at a time. Skip a square if it would wall in you or the Enemy. */
export function pickSafeHoles(rng: Rng, n: number, board: Board, laws: Laws, mods: BoardMods): Pos[] {
  if (n <= 0) return [];
  const spots = darkPlayable([2, 3, 4, 5]).filter((p) => !at(board, p));
  rng.shuffle(spots);
  const holes: Pos[] = [];
  for (const p of spots) {
    if (holes.length >= n) break;
    const trial: BoardMods = { ...mods, holes: [...holes, p] };
    if (trappedByHoles(board, laws, trial).length) continue;
    holes.push(p);
  }
  return holes;
}

export function holesEqual(a: Pos[], b: Pos[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((h, i) => samePos(h, b[i]!));
}

export function withHoleMods(felt: FeltMod[], n: number): FeltMod[] {
  const rest = felt.filter((m) => m.title !== "A Hole in the Felt" && m.title !== "Holes in the Felt");
  if (n <= 0) return rest;
  rest.push({
    title: n === 1 ? "A Hole in the Felt" : "Holes in the Felt",
    desc: n === 1 ? HOLE_ONE_DESC : holesDesc(n),
  });
  return rest;
}

/**
 * If a pit walls in a piece that could otherwise step (the side-file two-hole plug),
 * scoot that pit to another middle square — or drop it if nowhere is safe.
 */
export function unstickHoles(board: Board, laws: Laws, mods: BoardMods, rng: Rng): BoardMods {
  if (!mods.holes.length) return mods;
  if (!trappedByHoles(board, laws, mods).length) return mods;
  let holes = mods.holes.map((h) => ({ r: h.r, c: h.c }));
  let next: BoardMods = { ...mods, holes };
  for (let guard = 0; guard < 24; guard++) {
    const trapped = trappedByHoles(board, laws, next);
    if (!trapped.length) return next;
    const count = trapped.length;
    const dests = darkPlayable([2, 3, 4, 5]).filter(
      (p) => !at(board, p) && !holes.some((h) => samePos(h, p)),
    );
    rng.shuffle(dests);
    let moved = false;
    for (let i = 0; i < holes.length && !moved; i++) {
      for (const dest of dests) {
        const trial = holes.map((h, j) => (j === i ? dest : h));
        const cand: BoardMods = { ...mods, holes: trial };
        if (trappedByHoles(board, laws, cand).length < count) {
          holes = trial;
          next = cand;
          moved = true;
          break;
        }
      }
      if (moved) break;
      const dropped = holes.filter((_, j) => j !== i);
      const cand: BoardMods = { ...mods, holes: dropped };
      if (trappedByHoles(board, laws, cand).length < count) {
        holes = dropped;
        next = cand;
        moved = true;
      }
    }
    if (!moved) {
      const first = holes[0];
      if (!first) return next;
      next = { ...mods, holes: holes.filter((h) => !samePos(h, first)) };
      holes = next.holes;
    }
  }
  return next;
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

function debugFelt(): string | null {
  try {
    if (typeof location === "undefined") return null;
    return new URLSearchParams(location.search).get("felt");
  } catch {
    return null;
  }
}

/** Each New climb rolls a new path. Daily boards ignore this and use dailySeed(). */
export function boardSpec(index: number, extraYou: number, openKing: boolean, rng: Rng): BoardSetup {
  const i = Math.min(Math.max(index, 0), PATH_END - 1);
  const forceRace = debugFelt() === "race";
  if (i === 0 && !forceRace) return firstHop(rng, extraYou, openKing);
  const tier = TIERS[i]!;
  let youRows = tier.youRows;
  let themRows = tier.themRows;
  let youLane: Lane = "any";
  let themLane: Lane = "any";
  const feltMods: FeltMod[] = [];
  const shape = rng.next();
  if (forceRace || rng.chance(tier.race)) {
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
  const you = tier.you + extraYou;
  const youPos = pickSpots(rng, youRows, you, [], used, youLane);
  const themPos = pickSpots(rng, themRows, them, [], used, themLane);
  const draft: BoardSetup = {
    you,
    them,
    youRows,
    themRows,
    themKings,
    openKing,
    holes: [],
    bounce,
    themFly,
    youPos,
    themPos,
    blurb: "",
    feltMods: [],
  };
  let hid = 0;
  const laid = setupBoard(draft, () => ++hid);
  const holes = pickSafeHoles(rng, holeN, laid, emptyLaws(), modsFromSpec(draft, { themFly }));
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
