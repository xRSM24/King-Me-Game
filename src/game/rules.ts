import type { BoardMods, BoardSetup, Cell, Laws, Move, Piece, Pos, Side } from "./types.ts";
import { SIZE, emptyMods, inBoard, isDark, samePos } from "./types.ts";

export type Board = Cell[][];

const ALL: Pos[] = [
  { r: -1, c: -1 },
  { r: -1, c: 1 },
  { r: 1, c: -1 },
  { r: 1, c: 1 },
];

function avgRow(rows: number[]): number {
  if (!rows.length) return (SIZE - 1) / 2;
  return rows.reduce((s, r) => s + r, 0) / rows.length;
}

/** Far-edge king rows from where each side sat at setup. Never the same edge. */
export function campsFromRows(
  youRows: number[],
  themRows: number[],
): Pick<BoardMods, "youKingRow" | "themKingRow" | "youHome" | "themHome"> {
  const uniq = (rows: number[]) => [...new Set(rows)].sort((a, b) => a - b);
  const mid = (SIZE - 1) / 2;
  let youKingRow = avgRow(youRows) < mid ? SIZE - 1 : 0;
  let themKingRow = avgRow(themRows) < mid ? SIZE - 1 : 0;
  if (youKingRow === themKingRow) {
    youKingRow = 0;
    themKingRow = SIZE - 1;
  }
  return {
    youKingRow,
    themKingRow,
    youHome: uniq(youRows),
    themHome: uniq(themRows),
  };
}

export function modsFromSpec(
  spec: Pick<BoardSetup, "youRows" | "themRows" | "holes" | "bounce" | "themFly">,
  extra: Partial<BoardMods> = {},
): BoardMods {
  return {
    ...emptyMods(),
    holes: spec.holes,
    bounce: spec.bounce,
    themFly: spec.themFly,
    ...campsFromRows(spec.youRows, spec.themRows),
    ...extra,
  };
}

/** +1 walks down the felt (toward row 7), -1 walks up (toward row 0). */
export function manStep(side: Side, mods: BoardMods): number {
  const goal = side === "you" ? mods.youKingRow : mods.themKingRow;
  return goal < SIZE / 2 ? -1 : 1;
}

export function wouldCrown(side: Side, toRow: number, mods: BoardMods): boolean {
  const home = side === "you" ? mods.youHome : mods.themHome;
  const kingRow = side === "you" ? mods.youKingRow : mods.themKingRow;
  if (home.includes(toRow)) return false;
  return toRow === kingRow;
}

function backRow(side: Side, mods: BoardMods): number {
  return manStep(side, mods) < 0 ? SIZE - 1 : 0;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}

export function at(board: Board, p: Pos): Cell {
  return board[p.r]?.[p.c] ?? null;
}

export function isHole(mods: BoardMods, r: number, c: number): boolean {
  return mods.holes.some((h) => h.r === r && h.c === c);
}

export function playable(r: number, c: number, mods: BoardMods): boolean {
  return inBoard(r, c) && isDark(r, c) && !isHole(mods, r, c);
}

export function piecesOf(board: Board, side: Side): { piece: Piece; pos: Pos }[] {
  const out: { piece: Piece; pos: Pos }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = board[r]![c];
      if (p && p.side === side) out.push({ piece: p, pos: { r, c } });
    }
  }
  return out;
}

function fwd(side: Side, mods: BoardMods): Pos[] {
  const dr = manStep(side, mods);
  return [
    { r: dr, c: -1 },
    { r: dr, c: 1 },
  ];
}

function moveDirs(piece: Piece, mods: BoardMods): Pos[] {
  return piece.king ? ALL : fwd(piece.side, mods);
}

function jumpDirs(piece: Piece, laws: Laws, mods: BoardMods): Pos[] {
  if (piece.king) return ALL;
  if (mods.bounce) return ALL;
  if (piece.side === "you" && laws.backJump) return ALL;
  if (piece.side === "them" && mods.themBack) return ALL;
  return fwd(piece.side, mods);
}

function canFly(piece: Piece, laws: Laws, mods: BoardMods): boolean {
  if (!piece.king) return false;
  if (piece.side === "you" && laws.flyingKings) return true;
  if (piece.side === "them" && mods.themFly) return true;
  return false;
}

function addSlide(board: Board, from: Pos, piece: Piece, laws: Laws, mods: BoardMods, out: Move[]): void {
  if (canFly(piece, laws, mods)) {
    for (const d of ALL) {
      for (let k = 1; k < SIZE; k++) {
        const r = from.r + d.r * k;
        const c = from.c + d.c * k;
        if (!playable(r, c, mods)) break;
        if (board[r]![c]) break;
        out.push({ from, to: { r, c } });
      }
    }
    return;
  }
  for (const d of moveDirs(piece, mods)) {
    const r = from.r + d.r;
    const c = from.c + d.c;
    if (!playable(r, c, mods)) continue;
    if (!board[r]![c]) out.push({ from, to: { r, c } });
  }
}

function addJumps(board: Board, from: Pos, piece: Piece, laws: Laws, mods: BoardMods, out: Move[]): void {
  for (const d of jumpDirs(piece, laws, mods)) {
    const mr = from.r + d.r;
    const mc = from.c + d.c;
    const tr = from.r + d.r * 2;
    const tc = from.c + d.c * 2;
    if (!playable(tr, tc, mods)) continue;
    const mid = board[mr]?.[mc];
    if (!mid || mid.side === piece.side) continue;
    if (board[tr]![tc]) continue;
    out.push({ from, to: { r: tr, c: tc }, capture: { r: mr, c: mc } });
  }
}

export function movesFrom(board: Board, from: Pos, laws: Laws, mods: BoardMods = emptyMods()): Move[] {
  const piece = at(board, from);
  if (!piece) return [];
  const jumps: Move[] = [];
  const slides: Move[] = [];
  addJumps(board, from, piece, laws, mods, jumps);
  addSlide(board, from, piece, laws, mods, slides);
  return [...jumps, ...slides];
}

export function legalMoves(
  board: Board,
  side: Side,
  laws: Laws,
  lock?: Pos | null,
  mods: BoardMods = emptyMods(),
  allowQuiet = false,
): Move[] {
  const owned = piecesOf(board, side);
  const all: Move[] = [];
  for (const { pos } of owned) {
    if (lock && !samePos(pos, lock)) continue;
    all.push(...movesFrom(board, pos, laws, mods));
  }
  const jumps = all.filter((m) => m.capture);
  if (lock) return jumps.length ? jumps : [];
  if (jumps.length && !allowQuiet) return jumps;
  return all;
}

export function applyMove(board: Board, move: Move, mods: BoardMods = emptyMods()): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.r]![move.from.c];
  if (!piece) return next;
  next[move.from.r]![move.from.c] = null;
  if (move.capture) next[move.capture.r]![move.capture.c] = null;
  const placed: Piece = { ...piece };
  if (wouldCrown(placed.side, move.to.r, mods)) placed.king = true;
  next[move.to.r]![move.to.c] = placed;
  return next;
}

export function moreJumps(board: Board, pos: Pos, laws: Laws, mods: BoardMods = emptyMods()): boolean {
  const piece = at(board, pos);
  if (!piece) return false;
  const jumps: Move[] = [];
  addJumps(board, pos, piece, laws, mods, jumps);
  return jumps.length > 0;
}

export function recruitMan(board: Board, side: Side, nextId: () => number, mods: BoardMods = emptyMods()): Board {
  const next = cloneBoard(board);
  const row = backRow(side, mods);
  for (let c = 0; c < SIZE; c++) {
    if (!playable(row, c, mods)) continue;
    if (next[row]![c]) continue;
    next[row]![c] = { id: nextId(), side, king: false };
    return next;
  }
  return next;
}

export function crownRandom(board: Board, side: Side, pick: (n: number) => number): { board: Board; did: boolean; pos: Pos | null } {
  const men = piecesOf(board, side).filter((x) => !x.piece.king);
  if (!men.length) return { board, did: false, pos: null };
  const chosen = men[pick(men.length)]!;
  const next = cloneBoard(board);
  const p = next[chosen.pos.r]![chosen.pos.c];
  if (p) p.king = true;
  return { board: next, did: true, pos: chosen.pos };
}

export function outcome(board: Board, sideToMove: Side, laws: Laws, mods: BoardMods = emptyMods()): "you" | "them" | null {
  const you = piecesOf(board, "you").length;
  const them = piecesOf(board, "them").length;
  if (you === 0) return "them";
  if (them === 0) return "you";
  if (legalMoves(board, sideToMove, laws, null, mods).length === 0) return sideToMove === "you" ? "them" : "you";
  return null;
}

export function setupBoard(spec: BoardSetup, nextId: () => number): Board {
  const board: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < SIZE; c++) row.push(null);
    board.push(row);
  }

  const mods: BoardMods = modsFromSpec(spec);

  const stamp = (side: Side, pos: Pos, king: boolean) => {
    if (!playable(pos.r, pos.c, mods)) return false;
    if (board[pos.r]![pos.c]) return false;
    board[pos.r]![pos.c] = { id: nextId(), side, king };
    return true;
  };

  const fill = (side: Side, count: number, rows: number[], spots: Pos[] | undefined, kingFirst: boolean) => {
    let n = 0;
    let crowned = false;
    if (spots) {
      for (const pos of spots) {
        if (n >= count) return;
        const king = kingFirst && !crowned && side === "you";
        if (stamp(side, pos, king)) {
          if (king) crowned = true;
          n += 1;
        }
      }
    }
    for (const r of rows) {
      for (let c = 0; c < SIZE; c++) {
        if (n >= count) return;
        const king = kingFirst && !crowned && side === "you";
        if (stamp(side, { r, c }, king)) {
          if (king) crowned = true;
          n += 1;
        }
      }
    }
  };

  fill("them", spec.them, spec.themRows, spec.themPos, false);
  fill("you", spec.you, spec.youRows, spec.youPos, spec.openKing);
  crownSide(board, "them", spec.themKings);
  return board;
}

function crownSide(board: Board, side: Side, n: number): void {
  let left = n;
  for (let r = 0; r < SIZE && left > 0; r++) {
    for (let c = 0; c < SIZE && left > 0; c++) {
      const p = board[r]![c];
      if (p && p.side === side && !p.king) {
        p.king = true;
        left -= 1;
      }
    }
  }
}
