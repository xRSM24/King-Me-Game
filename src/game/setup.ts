import type { BoardMods, BoardSetup, FeltMod, Laws, Pos } from "./types.ts";
import { PATH_END, boardSize, emptyLaws, inBoard, isDark, samePos } from "./types.ts";
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
  "Brave",
  "Lucky",
  "Zesty",
  "Cherry",
  "Thunder",
  "Copper",
  "Plum",
  "Neon",
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
  { rim: "#8b5a32", outer: "#3a2212", back: "#1a2422", dark: "#4a6570", darkOdd: "#3f5a64", light: "#e4eef0" },
  { rim: "#7a4a28", outer: "#321c10", back: "#18241e", dark: "#4d6b5c", darkOdd: "#436155", light: "#e6eee6" },
  { rim: "#9a6a3a", outer: "#3a2412", back: "#1a2228", dark: "#455a6e", darkOdd: "#3c5062", light: "#e4eaf0" },
  { rim: "#6e4a2e", outer: "#2e1c10", back: "#16241e", dark: "#3f6458", darkOdd: "#38584e", light: "#e5ebe6" },
  { rim: "#a07040", outer: "#402410", back: "#1c2426", dark: "#4a5c68", darkOdd: "#41525c", light: "#e8ecee" },
  { rim: "#8a6238", outer: "#382410", back: "#1a2620", dark: "#547060", darkOdd: "#4a6456", light: "#e8eee8" },
  { rim: "#b07a48", outer: "#4a2c14", back: "#163038", dark: "#3d6a6e", darkOdd: "#365e62", light: "#e2eef0" },
  { rim: "#5a3a28", outer: "#2a1810", back: "#1c2220", dark: "#5a6560", darkOdd: "#505a56", light: "#eceeea" },
];

export function feltTheme(seed: number, index: number): FeltTheme {
  const rng = new Rng(hashSeed(seed * 13 + (index + 3) * 7919));
  return rng.pick(FELTS);
}

function inLane(p: Pos, lane: Lane, size = 8): boolean {
  const split = size / 2;
  if (lane === "left") return p.c < split;
  if (lane === "right") return p.c >= split;
  if (lane === "center") return p.c >= split - 2 && p.c <= split + 1;
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

export function scaleRowsForSize(rows: number[], size: number): number[] {
  if (size === 8) return rows.slice();
  const delta = size - 8;
  return rows.map((r) => (r >= 4 ? r + delta : r));
}

export function holeBand(size: number): number[] {
  const last = size - 3;
  const out: number[] = [];
  for (let r = 2; r <= last; r++) out.push(r);
  return out;
}

export function darkPlayable(rows: number[], holes: Pos[] = [], size = 8): Pos[] {
  const out: Pos[] = [];
  for (const r of rows) {
    for (let c = 0; c < size; c++) {
      if (!isDark(r, c)) continue;
      const p = { r, c };
      if (!blocked(holes, p)) out.push(p);
    }
  }
  return out;
}

function growRowsForLane(
  rows: number[],
  n: number,
  lane: Lane,
  holes: Pos[],
  used: Set<string>,
  size: number,
): number[] {
  if (lane === "any") return rows.slice();
  const out = rows.slice();
  const inLaneCount = (): number =>
    darkPlayable(out, holes, size).filter((p) => !used.has(key(p)) && inLane(p, lane, size)).length;
  const themSide = out.reduce((a, b) => a + b, 0) / out.length < size / 2;
  let guard = 0;
  while (inLaneCount() < n && guard++ < size) {
    if (themSide) {
      const next = Math.max(...out) + 1;
      if (next >= size / 2) break;
      out.push(next);
    } else {
      const next = Math.min(...out) - 1;
      if (next < size / 2) break;
      out.push(next);
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
  size = 8,
): Pos[] {
  const grown = growRowsForLane(rows, n, lane, holes, used, size);
  const open = darkPlayable(grown, holes, size).filter((p) => !used.has(key(p)));
  const spots = lane === "any" ? open : open.filter((p) => inLane(p, lane, size));
  rng.shuffle(spots);
  const out = spots.slice(0, Math.max(0, n));
  for (const p of out) used.add(key(p));
  return out;
}

export function pickHoles(rng: Rng, n: number, used: Set<string>, size = 8): Pos[] {
  const spots = darkPlayable(holeBand(size), [], size).filter((p) => !used.has(key(p)));
  rng.shuffle(spots);
  const out = spots.slice(0, Math.max(0, n));
  for (const p of out) used.add(key(p));
  return out;
}

export function pickLily(rng: Rng, board: Board, mods: BoardMods): Pos | null {
  const size = boardSize(mods);
  const emptyDark = (rows: number[]): Pos[] =>
    darkPlayable(rows, mods.holes, size).filter((p) => !at(board, p));
  const mid = emptyDark(holeBand(size));
  rng.shuffle(mid);
  if (mid[0]) return mid[0];
  const rows = Array.from({ length: size }, (_, r) => r);
  const any = emptyDark(rows);
  rng.shuffle(any);
  return any[0] ?? null;
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

export function maplePathToKingRank(_board: Board, mods: BoardMods, from: Pos): boolean {
  const size = boardSize(mods);
  if (!inBoard(from.r, from.c, size) || !isDark(from.r, from.c) || blocked(mods.holes, from)) {
    return false;
  }
  const seen = new Set<string>([key(from)]);
  const queue: Pos[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]!;
    if (here.r === mods.youKingRow) return true;
    for (const dr of [-1, 1]) {
      for (const dc of [-1, 1]) {
        const next = { r: here.r + dr, c: here.c + dc };
        const nextKey = key(next);
        if (
          inBoard(next.r, next.c, size) &&
          isDark(next.r, next.c) &&
          !blocked(mods.holes, next) &&
          !seen.has(nextKey)
        ) {
          seen.add(nextKey);
          queue.push(next);
        }
      }
    }
  }
  return false;
}

function pathlessMaples(board: Board, mods: BoardMods): Pos[] {
  return piecesOf(board, "you")
    .map(({ pos }) => pos)
    .filter((pos) => !maplePathToKingRank(board, mods, pos));
}

function holeProblems(board: Board, laws: Laws, mods: BoardMods): number {
  return trappedByHoles(board, laws, mods).length + pathlessMaples(board, mods).length;
}

/** Place pits one at a time. Skip a square if it would wall in you or the Enemy. */
export function pickSafeHoles(rng: Rng, n: number, board: Board, laws: Laws, mods: BoardMods): Pos[] {
  if (n <= 0) return [];
  const size = boardSize(mods);
  const spots = darkPlayable(holeBand(size), [], size).filter((p) => !at(board, p));
  rng.shuffle(spots);
  const holes: Pos[] = [];
  for (const p of spots) {
    if (holes.length >= n) break;
    const trial: BoardMods = { ...mods, holes: [...holes, p] };
    if (trappedByHoles(board, laws, trial).length) continue;
    if (pathlessMaples(board, trial).length) continue;
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
  if (!holeProblems(board, laws, mods)) return mods;
  let holes = mods.holes.map((h) => ({ r: h.r, c: h.c }));
  let next: BoardMods = { ...mods, holes };
  const size = boardSize(mods);
  while (holes.length) {
    const count = holeProblems(board, laws, next);
    if (!count) return next;
    const dests = darkPlayable(holeBand(size), [], size).filter(
      (p) => !at(board, p) && !holes.some((h) => samePos(h, p)),
    );
    rng.shuffle(dests);
    let moved = false;
    for (let i = 0; i < holes.length && !moved; i++) {
      for (const dest of dests) {
        const trial = holes.map((h, j) => (j === i ? dest : h));
        const cand: BoardMods = { ...mods, holes: trial };
        if (holeProblems(board, laws, cand) < count) {
          holes = trial;
          next = cand;
          moved = true;
          break;
        }
      }
      if (moved) break;
      const dropped = holes.filter((_, j) => j !== i);
      const cand: BoardMods = { ...mods, holes: dropped };
      if (holeProblems(board, laws, cand) < count) {
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
export function openingJump(
  rng: Rng,
  holes: Pos[] = [],
  lane: Lane = "any",
  size = 8,
): { you: Pos; them: Pos; land: Pos } {
  const options: { you: Pos; them: Pos; land: Pos }[] = [];
  for (let r = 2; r <= 4; r++) {
    for (let c = 0; c < size; c++) {
      if (!isDark(r, c)) continue;
      const land = { r, c };
      if (blocked(holes, land)) continue;
      for (const dc of [-1, 1]) {
        const them = { r: r + 1, c: c + dc };
        const you = { r: r + 2, c: c + dc * 2 };
        if (!isDark(them.r, them.c) || !isDark(you.r, you.c)) continue;
        if (them.c < 0 || them.c >= size || you.c < 0 || you.c >= size) continue;
        if (you.r >= size) continue;
        if (blocked(holes, them) || blocked(holes, you)) continue;
        options.push({ you, them, land });
      }
    }
  }
  const preferred = lane === "any" ? options : options.filter((o) => inLane(o.land, lane, size));
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
    "First Hop",
    `${pick(ADJ)} ${pick(NOUN)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `${pick(ADJ)} ${pick(NOUN)}`,
    `The Crown · ${pick(NOUN)}`,
  ];
}

export function normalizeClimbNames(names: string[]): string[] {
  return names.map((n, i) => (i === 0 ? "First Hop" : n));
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

function firstHop(rng: Rng, extraYou: number, openKing: boolean, size: number): BoardSetup {
  const used = new Set<string>();
  const lane: Lane = rng.pick(["left", "right", "center"]);
  const jump = openingJump(rng, [], lane, size);
  used.add(key(jump.you));
  used.add(key(jump.them));
  const you = 3 + extraYou;
  const youRows = scaleRowsForSize([7, 6], size);
  const themRows = scaleRowsForSize([0, 1], size);
  const youPos = [
    jump.you,
    ...pickSpots(rng, scaleRowsForSize([7, 6, 5], size), you - 1, [], used, lane, size),
  ];
  const themPos = [jump.them, ...pickSpots(rng, [0, 1, 2], 1, [], used, lane, size)];
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
    youRows,
    themRows,
    themKings: 0,
    openKing,
    holes: [],
    bounce: false,
    themFly: false,
    youPos,
    themPos,
    blurb: FIRST_JUMP_DESC,
    feltMods,
    size,
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
export function boardSpec(index: number, extraYou: number, openKing: boolean, rng: Rng, size = 8): BoardSetup {
  const i = Math.min(Math.max(index, 0), PATH_END - 1);
  const forceRace = debugFelt() === "race";
  if (i === 0 && !forceRace) return firstHop(rng, extraYou, openKing, size);
  const tier = TIERS[i]!;
  let youRows = tier.youRows;
  let themRows = tier.themRows;
  let youLane: Lane = "any";
  let themLane: Lane = "any";
  const feltMods: FeltMod[] = [];
  const shape = rng.next();
  if (forceRace || rng.chance(tier.race)) {
    youRows = [5, 4];
    themRows = [2, 3, 1];
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
  youRows = scaleRowsForSize(youRows, size);
  themRows = scaleRowsForSize(themRows, size);

  const them = between(rng, tier.them);
  const themKings = between(rng, tier.themKings);
  const holeN = between(rng, tier.holes);
  const bounce = rng.chance(tier.bounce);
  const themFly = tier.themFly;
  const used = new Set<string>();
  const you = tier.you + extraYou;
  const youPos = pickSpots(rng, youRows, you, [], used, youLane, size);
  const themPos = pickSpots(rng, themRows, them, [], used, themLane, size);
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
    size,
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
    size,
  };
}
