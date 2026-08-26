import type { BoardSetup, Cell, Laws, Move, Piece, Pos, Side } from "./types.ts";
import { SIZE, inBoard, isDark, samePos } from "./types.ts";

export type Board = Cell[][];

const YOU_FWD: Pos[] = [
  { r: -1, c: -1 },
  { r: -1, c: 1 },
];
const THEM_FWD: Pos[] = [
  { r: 1, c: -1 },
  { r: 1, c: 1 },
];
const ALL: Pos[] = [
  { r: -1, c: -1 },
  { r: -1, c: 1 },
  { r: 1, c: -1 },
  { r: 1, c: 1 },
];

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}

export function at(board: Board, p: Pos): Cell {
  return board[p.r]?.[p.c] ?? null;
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

function fwd(side: Side): Pos[] {
  return side === "you" ? YOU_FWD : THEM_FWD;
}

function moveDirs(piece: Piece): Pos[] {
  return piece.king ? ALL : fwd(piece.side);
}

function jumpDirs(piece: Piece, laws: Laws): Pos[] {
  if (piece.king) return ALL;
  if (piece.side === "you" && laws.backJump) return ALL;
  return fwd(piece.side);
}

function addSlide(board: Board, from: Pos, piece: Piece, laws: Laws, out: Move[]): void {
  if (piece.king && laws.flyingKings && piece.side === "you") {
    for (const d of ALL) {
      for (let k = 1; k < SIZE; k++) {
        const r = from.r + d.r * k;
        const c = from.c + d.c * k;
        if (!inBoard(r, c) || !isDark(r, c)) break;
        if (board[r]![c]) break;
        out.push({ from, to: { r, c } });
      }
    }
    return;
  }
  for (const d of moveDirs(piece)) {
    const r = from.r + d.r;
    const c = from.c + d.c;
    if (!inBoard(r, c) || !isDark(r, c)) continue;
    if (!board[r]![c]) out.push({ from, to: { r, c } });
  }
}

function addJumps(board: Board, from: Pos, piece: Piece, laws: Laws, out: Move[]): void {
  for (const d of jumpDirs(piece, laws)) {
    const mr = from.r + d.r;
    const mc = from.c + d.c;
    const tr = from.r + d.r * 2;
    const tc = from.c + d.c * 2;
    if (!inBoard(tr, tc) || !isDark(tr, tc)) continue;
    const mid = board[mr]?.[mc];
    if (!mid || mid.side === piece.side) continue;
    if (board[tr]![tc]) continue;
    out.push({ from, to: { r: tr, c: tc }, capture: { r: mr, c: mc } });
  }
}

export function movesFrom(board: Board, from: Pos, laws: Laws): Move[] {
  const piece = at(board, from);
  if (!piece) return [];
  const jumps: Move[] = [];
  const slides: Move[] = [];
  addJumps(board, from, piece, laws, jumps);
  addSlide(board, from, piece, laws, slides);
  return [...jumps, ...slides];
}

export function legalMoves(board: Board, side: Side, laws: Laws, lock?: Pos | null): Move[] {
  const owned = piecesOf(board, side);
  const all: Move[] = [];
  for (const { pos } of owned) {
    if (lock && !samePos(pos, lock)) continue;
    all.push(...movesFrom(board, pos, laws));
  }
  const jumps = all.filter((m) => m.capture);
  if (lock) return jumps.length ? jumps : [];
  if (jumps.length && !(laws.freeJump && side === "you")) return jumps;
  return all;
}

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.r]![move.from.c];
  if (!piece) return next;
  next[move.from.r]![move.from.c] = null;
  if (move.capture) next[move.capture.r]![move.capture.c] = null;
  const placed: Piece = { ...piece };
  if (placed.side === "you" && move.to.r === 0) placed.king = true;
  if (placed.side === "them" && move.to.r === SIZE - 1) placed.king = true;
  next[move.to.r]![move.to.c] = placed;
  return next;
}

export function moreJumps(board: Board, pos: Pos, laws: Laws): boolean {
  const piece = at(board, pos);
  if (!piece) return false;
  const jumps: Move[] = [];
  addJumps(board, pos, piece, laws, jumps);
  return jumps.length > 0;
}

export function recruitMan(board: Board, side: Side, nextId: () => number): Board {
  const next = cloneBoard(board);
  const row = side === "you" ? SIZE - 1 : 0;
  for (let c = 0; c < SIZE; c++) {
    if (!isDark(row, c)) continue;
    if (next[row]![c]) continue;
    next[row]![c] = { id: nextId(), side, king: false };
    return next;
  }
  return next;
}

export function crownRandom(board: Board, side: Side, pick: (n: number) => number): { board: Board; did: boolean } {
  const men = piecesOf(board, side).filter((x) => !x.piece.king);
  if (!men.length) return { board, did: false };
  const chosen = men[pick(men.length)]!;
  const next = cloneBoard(board);
  const p = next[chosen.pos.r]![chosen.pos.c];
  if (p) p.king = true;
  return { board: next, did: true };
}

export function outcome(board: Board, sideToMove: Side, laws: Laws): "you" | "them" | null {
  const you = piecesOf(board, "you").length;
  const them = piecesOf(board, "them").length;
  if (you === 0) return "them";
  if (them === 0) return "you";
  if (legalMoves(board, sideToMove, laws).length === 0) return sideToMove === "you" ? "them" : "you";
  return null;
}

export function setupBoard(spec: BoardSetup, nextId: () => number): Board {
  const board: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < SIZE; c++) row.push(null);
    board.push(row);
  }

  const place = (side: Side, count: number, rows: number[], kingFirst: boolean) => {
    let n = 0;
    let crowned = false;
    for (const r of rows) {
      for (let c = 0; c < SIZE; c++) {
        if (n >= count) return;
        if (!isDark(r, c)) continue;
        const king = kingFirst && !crowned && side === "you";
        if (king) crowned = true;
        board[r]![c] = { id: nextId(), side, king };
        n += 1;
      }
    }
  };

  place("them", spec.them, spec.themRows, false);
  place("you", spec.you, spec.youRows, spec.openKing);
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
