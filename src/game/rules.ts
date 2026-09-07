import type { BoardMods, BoardSetup, Cell, Laws, Move, Piece, Pos, Side } from "./types.ts";
import { CHASE_MAX_PIECES, SIZE, boardSize, emptyMods, inBoard, isDark, samePos } from "./types.ts";

export type Board = Cell[][];
export const FLY_SLIDE_MAX = 7;

const ALL: Pos[] = [
  { r: -1, c: -1 },
  { r: -1, c: 1 },
  { r: 1, c: -1 },
  { r: 1, c: 1 },
];

function avgRow(rows: number[], size: number): number {
  if (!rows.length) return (size - 1) / 2;
  return rows.reduce((s, r) => s + r, 0) / rows.length;
}

/** Far-edge king rows from where each side sat at setup. Never the same edge. */
export function campsFromRows(
  youRows: number[],
  themRows: number[],
  size = SIZE,
): Pick<BoardMods, "youKingRow" | "themKingRow" | "youHome" | "themHome"> {
  const uniq = (rows: number[]) => [...new Set(rows)].sort((a, b) => a - b);
  const mid = (size - 1) / 2;
  let youKingRow = avgRow(youRows, size) < mid ? size - 1 : 0;
  let themKingRow = avgRow(themRows, size) < mid ? size - 1 : 0;
  if (youKingRow === themKingRow) {
    youKingRow = 0;
    themKingRow = size - 1;
  }
  return {
    youKingRow,
    themKingRow,
    youHome: uniq(youRows),
    themHome: uniq(themRows),
  };
}

export function modsFromSpec(
  spec: Pick<BoardSetup, "youRows" | "themRows" | "holes" | "bounce" | "themFly" | "size">,
  extra: Partial<BoardMods> = {},
): BoardMods {
  const size = boardSize({ size: extra.size ?? spec.size });
  return {
    ...emptyMods(),
    holes: spec.holes,
    bounce: spec.bounce,
    themFly: spec.themFly,
    size,
    ...campsFromRows(spec.youRows, spec.themRows, size),
    ...extra,
  };
}

/** +1 walks down the felt (toward row 7), -1 walks up (toward row 0). */
export function manStep(side: Side, mods: BoardMods): number {
  const goal = side === "you" ? mods.youKingRow : mods.themKingRow;
  return goal < boardSize(mods) / 2 ? -1 : 1;
}

export function wouldCrown(side: Side, toRow: number, mods: BoardMods): boolean {
  const home = side === "you" ? mods.youHome : mods.themHome;
  const kingRow = side === "you" ? mods.youKingRow : mods.themKingRow;
  if (home.includes(toRow)) return false;
  return toRow === kingRow;
}

function backRow(side: Side, mods: BoardMods): number {
  return manStep(side, mods) < 0 ? boardSize(mods) - 1 : 0;
}

function kingRow(side: Side, mods: BoardMods): number {
  return side === "you" ? mods.youKingRow : mods.themKingRow;
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
  return inBoard(r, c, boardSize(mods)) && isDark(r, c) && !isHole(mods, r, c);
}

export function piecesOf(board: Board, side: Side): { piece: Piece; pos: Pos }[] {
  const out: { piece: Piece; pos: Pos }[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r]!.length; c++) {
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
    const size = boardSize(mods);
    for (const d of ALL) {
      for (let k = 1; k <= FLY_SLIDE_MAX; k++) {
        const r = from.r + d.r * k;
        const c = from.c + d.c * k;
        if (!inBoard(r, c, size) || !isDark(r, c)) break;
        if (isHole(mods, r, c)) continue;
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

/** Leap an empty pit: [you][pit][land]. Not a capture — you do not have to take it. */
function addHoleJumps(board: Board, from: Pos, piece: Piece, laws: Laws, mods: BoardMods, out: Move[]): void {
  if (!mods.holes.length) return;
  for (const d of jumpDirs(piece, laws, mods)) {
    const mr = from.r + d.r;
    const mc = from.c + d.c;
    const tr = from.r + d.r * 2;
    const tc = from.c + d.c * 2;
    if (!isHole(mods, mr, mc)) continue;
    if (board[mr]?.[mc]) continue;
    if (!playable(tr, tc, mods)) continue;
    if (board[tr]![tc]) continue;
    out.push({ from, to: { r: tr, c: tc }, overHole: { r: mr, c: mc } });
  }
}

/** Far Jump: [you][enemy][empty][land] on one diagonal. Once per your turn, men only. */
function addFarJumps(board: Board, from: Pos, piece: Piece, laws: Laws, mods: BoardMods, out: Move[]): void {
  if (piece.side !== "you" || piece.king) return;
  if (!laws.farJump || mods.farJumpUsed) return;
  const size = boardSize(mods);
  for (const d of jumpDirs(piece, laws, mods)) {
    const er = from.r + d.r;
    const ec = from.c + d.c;
    const sr = from.r + d.r * 2;
    const sc = from.c + d.c * 2;
    const tr = from.r + d.r * 3;
    const tc = from.c + d.c * 3;
    if (!inBoard(er, ec, size) || !inBoard(sr, sc, size)) continue;
    if (!isDark(sr, sc)) continue;
    if (!playable(tr, tc, mods)) continue;
    const mid = board[er]?.[ec];
    if (!mid || mid.side === piece.side) continue;
    if (board[sr]![sc]) continue;
    if (board[tr]![tc]) continue;
    out.push({ from, to: { r: tr, c: tc }, capture: { r: er, c: ec }, far: true });
  }
}

export function cloneMods(mods: BoardMods): BoardMods {
  return {
    ...mods,
    holes: mods.holes.map((h) => ({ r: h.r, c: h.c })),
    youHome: [...mods.youHome],
    themHome: [...mods.themHome],
  };
}

export function movesFrom(board: Board, from: Pos, laws: Laws, mods: BoardMods = emptyMods()): Move[] {
  const piece = at(board, from);
  if (!piece) return [];
  const jumps: Move[] = [];
  const slides: Move[] = [];
  addJumps(board, from, piece, laws, mods, jumps);
  addFarJumps(board, from, piece, laws, mods, jumps);
  addHoleJumps(board, from, piece, laws, mods, jumps);
  addSlide(board, from, piece, laws, mods, slides);
  return [...jumps, ...slides];
}

/** True when holes (not friendly pieces) are the only reason this piece has nowhere to go. */
export function isHoleTrapped(board: Board, pos: Pos, laws: Laws, mods: BoardMods): boolean {
  if (!at(board, pos)) return false;
  if (movesFrom(board, pos, laws, mods).length > 0) return false;
  if (!mods.holes.length) return false;
  return movesFrom(board, pos, laws, { ...mods, holes: [] }).length > 0;
}

export function legalMoves(
  board: Board,
  side: Side,
  laws: Laws,
  lock?: Pos | null,
  mods: BoardMods = emptyMods(),
  _allowQuiet = true,
): Move[] {
  const owned = piecesOf(board, side);
  const all: Move[] = [];
  for (const { pos } of owned) {
    if (lock && !samePos(pos, lock)) continue;
    all.push(...movesFrom(board, pos, laws, mods));
  }
  return all;
}

/** Square you hop over: Enemy or pit. */
export function hopOver(move: Move): Pos | null {
  if (move.capture) return move.capture;
  if (move.overHole) return move.overHole;
  return null;
}

export function trapdoorHole(move: Move): Pos | null {
  return move.capture ?? null;
}

export function moveHitting(moves: Move[], from: Pos, at: Pos): Move | undefined {
  const mine = moves.filter((m) => samePos(m.from, from));
  const land = mine.find((m) => samePos(m.to, at));
  if (land) return land;
  const over = mine.find((m) => {
    const mid = hopOver(m);
    return mid ? samePos(mid, at) : false;
  });
  return over;
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
  addFarJumps(board, pos, piece, laws, mods, jumps);
  return jumps.length > 0;
}

/** A regular piece diagonally next to a new King becomes a King too. */
export function spreadCrown(board: Board, pos: Pos, side: Side): { board: Board; pos: Pos | null } {
  const next = cloneBoard(board);
  for (const d of ALL) {
    const r = pos.r + d.r;
    const c = pos.c + d.c;
    if (!inBoard(r, c, board.length)) continue;
    const p = next[r]![c];
    if (p && p.side === side && !p.king) {
      p.king = true;
      return { board: next, pos: { r, c } };
    }
  }
  return { board, pos: null };
}

/** One regular piece walks two rows toward the Enemy, same file, if that square is free. */
export function placeScout(board: Board, side: Side, mods: BoardMods): Board {
  const step = manStep(side, mods);
  const home = backRow(side, mods);
  const men = piecesOf(board, side)
    .filter((x) => !x.piece.king)
    .sort((a, b) => Math.abs(a.pos.r - home) - Math.abs(b.pos.r - home));
  for (const { pos } of men) {
    const r = pos.r + step * 2;
    const c = pos.c;
    if (!playable(r, c, mods)) continue;
    if (board[r]![c]) continue;
    const next = cloneBoard(board);
    next[r]![c] = next[pos.r]![pos.c];
    next[pos.r]![pos.c] = null;
    return next;
  }
  return board;
}

/** Scout, then Double Crown any King that already sat down at setup. */
export function applyStartLaws(board: Board, laws: Laws, mods: BoardMods): Board {
  let next = board;
  if (laws.scout) next = placeScout(next, "you", mods);
  if (!laws.doubleCrown) return next;
  for (const { pos, piece } of piecesOf(next, "you")) {
    if (!piece.king) continue;
    const extra = spreadCrown(next, pos, "you");
    next = extra.board;
    if (extra.pos) break;
  }
  return next;
}

export function recruitMan(board: Board, side: Side, nextId: () => number, mods: BoardMods = emptyMods()): Board {
  const next = cloneBoard(board);
  const row = backRow(side, mods);
  for (let c = 0; c < boardSize(mods); c++) {
    if (!playable(row, c, mods)) continue;
    if (next[row]![c]) continue;
    next[row]![c] = { id: nextId(), side, king: false };
    return next;
  }
  return next;
}

/** Second Chance: a King returns from the far edge, not your back row, so it can hop every diagonal. */
export function reviveKing(
  board: Board,
  side: Side,
  nextId: () => number,
  laws: Laws,
  mods: BoardMods = emptyMods(),
): { board: Board; pos: Pos | null } {
  const next = cloneBoard(board);
  const goal = kingRow(side, mods);
  const towardHome = -manStep(side, mods);
  const size = boardSize(mods);
  const spots: Pos[] = [];
  for (let i = 0; i < size; i++) {
    const r = goal + towardHome * i;
    if (r < 0 || r >= size) break;
    for (let c = 0; c < size; c++) {
      if (!playable(r, c, mods)) continue;
      if (next[r]![c]) continue;
      spots.push({ r, c });
    }
  }
  if (!spots.length) return { board, pos: null };

  const scoreSpot = (pos: Pos): number => {
    next[pos.r]![pos.c] = { id: -1, side, king: true };
    const moves = movesFrom(next, pos, laws, mods);
    next[pos.r]![pos.c] = null;
    if (moves.some((m) => m.capture)) return 2;
    if (moves.length) return 1;
    return 0;
  };

  let best = spots[0]!;
  let bestScore = -1;
  for (const pos of spots) {
    const s = scoreSpot(pos);
    if (s > bestScore) {
      best = pos;
      bestScore = s;
      if (s === 2) break;
    }
  }
  next[best.r]![best.c] = { id: nextId(), side, king: true };
  return { board: next, pos: best };
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

/** King-only ending: a lone King can otherwise run forever. */
export function chaseArmed(board: Board): boolean {
  const you = piecesOf(board, "you");
  const them = piecesOf(board, "them");
  const n = you.length + them.length;
  if (n === 0 || n > CHASE_MAX_PIECES) return false;
  if (!you.length || !them.length) return false;
  return you.every((x) => x.piece.king) && them.every((x) => x.piece.king);
}

export function chaseWinner(board: Board): "you" | "them" | "draw" {
  const y = piecesOf(board, "you").length;
  const t = piecesOf(board, "them").length;
  if (y > t) return "you";
  if (t > y) return "them";
  return "draw";
}

export function setupBoard(spec: BoardSetup, nextId: () => number): Board {
  const size = spec.size === 10 ? 10 : SIZE;
  const board: Board = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) row.push(null);
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
      for (let c = 0; c < size; c++) {
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
  for (let r = 0; r < board.length && left > 0; r++) {
    for (let c = 0; c < board[r]!.length && left > 0; c++) {
      const p = board[r]![c];
      if (p && p.side === side && !p.king) {
        p.king = true;
        left -= 1;
      }
    }
  }
}
