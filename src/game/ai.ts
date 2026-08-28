import { Rng } from "./rng.ts";
import { applyMove, at, legalMoves, moreJumps, piecesOf, type Board } from "./rules.ts";
import type { BoardMods, Laws, Move, Pos } from "./types.ts";
import { SIZE, emptyMods, samePos } from "./types.ts";

export interface AiMemory {
  lastFrom: Pos | null;
  lastTo: Pos | null;
  lastCapture: boolean;
  lastPieceId: number | null;
}

export function emptyMemory(): AiMemory {
  return { lastFrom: null, lastTo: null, lastCapture: false, lastPieceId: null };
}

export function remember(mem: AiMemory, board: Board, move: Move): void {
  mem.lastFrom = move.from;
  mem.lastTo = move.to;
  mem.lastCapture = !!move.capture;
  mem.lastPieceId = at(board, move.to)?.id ?? null;
}

function reverses(move: Move, mem: AiMemory): boolean {
  if (!mem.lastFrom || !mem.lastTo || mem.lastCapture) return false;
  return samePos(move.from, mem.lastTo) && samePos(move.to, mem.lastFrom);
}

function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function nearestYou(board: Board, pos: Pos): number {
  let best = 24;
  for (const { pos: p } of piecesOf(board, "you")) {
    const d = manhattan(pos, p);
    if (d < best) best = d;
  }
  return best;
}

function threatened(board: Board, laws: Laws, mods: BoardMods, pos: Pos): boolean {
  const opp = legalMoves(board, "you", laws, null, mods);
  return opp.some((m) => m.capture && m.capture.r === pos.r && m.capture.c === pos.c);
}

function pressure(board: Board, laws: Laws, mods: BoardMods): number {
  return legalMoves(board, "them", laws, null, mods).filter((m) => m.capture).length;
}

function chainValue(
  board: Board,
  start: Move,
  laws: Laws,
  mods: BoardMods,
  rng: Rng,
  skill: number,
): { board: Board; pos: Pos; score: number } {
  let b = applyMove(board, start);
  let pos = start.to;
  let captures = start.capture ? 1 : 0;
  if (start.capture) {
    const taken = board[start.capture.r]![start.capture.c];
    if (taken?.king) captures += 1;
  }
  let guard = 0;
  while (start.capture && moreJumps(b, pos, laws, mods) && guard++ < 8) {
    const jumps = legalMoves(b, "them", laws, pos, mods);
    if (!jumps.length) break;
    const nxt = skill > 0.5 ? jumps.reduce((a, m) => (m.to.r > a.to.r ? m : a)) : rng.pick(jumps);
    b = applyMove(b, nxt);
    pos = nxt.to;
    captures += 1;
  }
  let score = captures * 14;
  const piece = b[pos.r]![pos.c];
  if (piece?.king) score += 3;
  if (pos.r === SIZE - 1) score += 5;
  if (skill > 0.22 && threatened(b, laws, mods, pos)) score -= 6 + skill * 5;
  const youLeft = piecesOf(b, "you").length;
  const themLeft = piecesOf(b, "them").length;
  score += (themLeft - youLeft) * 0.5;
  return { board: b, pos, score };
}

function pickCasual(pool: Move[], mem: AiMemory, rng: Rng): Move {
  const fresh = pool.filter((m) => !reverses(m, mem));
  const base = fresh.length ? fresh : pool;
  const downfield = base.filter((m) => m.to.r >= m.from.r);
  return rng.pick(downfield.length ? downfield : base);
}

export function think(
  board: Board,
  laws: Laws,
  rng: Rng,
  skill: number,
  mods: BoardMods = emptyMods(),
  mem: AiMemory = emptyMemory(),
): Move | null {
  const moves = legalMoves(board, "them", laws, null, mods);
  if (!moves.length) return null;
  const jumps = moves.filter((m) => m.capture);
  const pool = jumps.length ? jumps : moves;
  if (skill < 0.18 && rng.chance(0.4)) return pickCasual(pool, mem, rng);
  if (skill < 0.35 && rng.chance(0.16)) return pickCasual(pool, mem, rng);

  let best = pool[0]!;
  let bestS = -1e9;
  for (const m of pool) {
    const next = chainValue(board, m, laws, mods, rng, skill);
    let s = next.score;
    if (!m.capture) {
      const piece = at(board, m.from);
      s += (m.to.r - m.from.r) * (1.15 + skill * 0.8);
      const closer = nearestYou(board, m.from) - nearestYou(next.board, m.to);
      s += closer * (0.9 + skill * 0.7);
      s += pressure(next.board, laws, mods) * (1.6 + skill);
      if (piece?.king && m.to.r < 2) s -= 1.4;
      if (reverses(m, mem)) s -= 8.5;
      if (mem.lastPieceId != null && piece?.id === mem.lastPieceId) s -= 1.4 + skill * 0.6;
    }
    s += rng.next() * (skill > 0.7 ? 0.04 : 0.12);
    if (s > bestS) {
      bestS = s;
      best = m;
    }
  }
  return best;
}
