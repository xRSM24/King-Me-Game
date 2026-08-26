export type Side = "you" | "them";

export type Screen = "title" | "how" | "playing" | "pick" | "pause" | "end";

export interface Pos {
  r: number;
  c: number;
}

export interface Piece {
  id: number;
  side: Side;
  king: boolean;
}

export type Cell = Piece | null;

export interface Move {
  from: Pos;
  to: Pos;
  capture?: Pos;
}

export interface Laws {
  backJump: boolean;
  flyingKings: boolean;
  recruit: boolean;
  lastRites: boolean;
  openKing: boolean;
  extraMan: boolean;
  freeJump: boolean;
  hopCrown: boolean;
}

export interface Meta {
  notches: number;
  runs: number;
  wins: number;
  bestBoard: number;
  mute: boolean;
}

export interface BoardSetup {
  you: number;
  them: number;
  youRows: number[];
  themRows: number[];
  themKings: number;
  openKing: boolean;
}

export const SIZE = 8;
export const PATH_END = 6;
export const RUN_GOAL = "Beat the Black Crown";

export function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1;
}

export function inBoard(r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < SIZE && c < SIZE;
}

export function emptyLaws(): Laws {
  return {
    backJump: false,
    flyingKings: false,
    recruit: false,
    lastRites: false,
    openKing: false,
    extraMan: false,
    freeJump: false,
    hopCrown: false,
  };
}

export const BOARD_NAMES = [
  "Opening Quiet",
  "The Long File",
  "Crowded Felt",
  "King's Shadow",
  "Grave Row",
  "The Black Crown",
];
