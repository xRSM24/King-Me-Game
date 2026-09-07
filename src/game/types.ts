export type Side = "you" | "them";

export type Screen = "title" | "how" | "privacy" | "support" | "playing" | "pick" | "pause" | "end" | "daily" | "account" | "history" | "studio";

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
  far?: boolean;
  /** Pit you leap; landing is the next dark square. Not a capture. */
  overHole?: Pos;
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
  farJump: boolean;
  doubleCrown: boolean;
  trapdoor: boolean;
  scout: boolean;
  widePond: boolean;
  napTime: boolean;
  back2Back: boolean;
}

export interface FeltMod {
  title: string;
  desc: string;
  side?: Side;
}

export interface BoardMods {
  holes: Pos[];
  bounce: boolean;
  themFly: boolean;
  themBack: boolean;
  /** Row a non-King of yours becomes King on. 0 = top of the felt. */
  youKingRow: number;
  /** Row a non-King of theirs becomes King on. SIZE-1 = bottom of the felt. */
  themKingRow: number;
  /** Ranks this side sat on at setup. Landing here never crowns. */
  youHome: number[];
  themHome: number[];
  /** Far Jump already used this turn. */
  farJumpUsed: boolean;
  /** Trapdoor already made a hole this board. */
  trapdoorUsed: boolean;
  /** 8 unless Wide Pond made this climb 10×10. */
  size: number;
  napUsed: boolean;
  napPending: boolean;
  /** Remaining Back 2 Back opening hops this board (0 if the law is off). */
  openingHops: number;
}

export interface Meta {
  notches: number;
  runs: number;
  wins: number;
  bestBoard: number;
  mute: boolean;
  colorblind: boolean;
  reduceMotion: boolean;
  sawTutorial: boolean;
}

export interface BoardSetup {
  you: number;
  them: number;
  youRows: number[];
  themRows: number[];
  themKings: number;
  openKing: boolean;
  holes: Pos[];
  bounce: boolean;
  themFly: boolean;
  blurb: string;
  feltMods: FeltMod[];
  youPos?: Pos[];
  themPos?: Pos[];
}

export const SIZE = 8;
export const PATH_END = 6;
export const RUN_GOAL = "Beat the Crown";
/** Quiet hops allowed once only Kings remain (4 or fewer pieces). Then most pieces win. */
export const CHASE_HOPS = 8;
export const CHASE_MAX_PIECES = 4;

export function posKey(p: Pos): string {
  return `${p.r},${p.c}`;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.r === b.r && a.c === b.c;
}

export function isDark(r: number, c: number): boolean {
  return (r + c) % 2 === 1;
}

export function boardSize(mods: { size?: number }): number {
  return mods.size === 10 ? 10 : 8;
}

export function inBoard(r: number, c: number, size: number = SIZE): boolean {
  return r >= 0 && c >= 0 && r < size && c < size;
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
    farJump: false,
    doubleCrown: false,
    trapdoor: false,
    scout: false,
    widePond: false,
    napTime: false,
    back2Back: false,
  };
}

export function emptyMods(): BoardMods {
  return {
    holes: [],
    bounce: false,
    themFly: false,
    themBack: false,
    youKingRow: 0,
    themKingRow: SIZE - 1,
    youHome: [6, 7],
    themHome: [0, 1],
    farJumpUsed: false,
    trapdoorUsed: false,
    size: SIZE,
    napUsed: false,
    napPending: false,
    openingHops: 0,
  };
}

export const BOARD_NAMES = [
  "First Hop",
  "Crown Race",
  "Holey Felt",
  "Shadow King",
  "Super Bounce",
  "The Crown",
];
