import { Rng } from "./rng.ts";
import { applyMove, legalMoves, moreJumps, piecesOf, type Board } from "./rules.ts";
import type { BoardMods, Laws, Move, Pos } from "./types.ts";
import { SIZE, emptyMods } from "./types.ts";

function threatened(board: Board, laws: Laws, mods: BoardMods, pos: Pos): boolean {
  const opp = legalMoves(board, "you", { ...laws, freeJump: false }, null, mods);
  return opp.some((m) => m.capture && m.capture.r === pos.r && m.capture.c === pos.c);
}

function chainValue(board: Board, start: Move, laws: Laws, mods: BoardMods, rng: Rng, skill: number): number {
  let b = applyMove(board, start);
  let pos = start.to;
  let captures = start.capture ? 1 : 0;
  let guard = 0;
  while (start.capture && moreJumps(b, pos, laws, mods) && guard++ < 8) {
    const jumps = legalMoves(b, "them", laws, pos, mods);
    if (!jumps.length) break;
    const nxt = rng.pick(jumps);
    b = applyMove(b, nxt);
    pos = nxt.to;
    captures += 1;
  }
  let score = captures * 12;
  const piece = b[pos.r]![pos.c];
  if (piece?.king) score += 3;
  if (pos.r === SIZE - 1) score += 4;
  if (skill > 0.35 && threatened(b, laws, mods, pos)) score -= 5;
  const youLeft = piecesOf(b, "you").length;
  const themLeft = piecesOf(b, "them").length;
  score += (themLeft - youLeft) * 0.4;
  return score + rng.next() * 0.2;
}

export function think(
  board: Board,
  laws: Laws,
  rng: Rng,
  skill: number,
  mods: BoardMods = emptyMods(),
): Move | null {
  const moves = legalMoves(board, "them", laws, null, mods);
  if (!moves.length) return null;
  const jumps = moves.filter((m) => m.capture);
  const pool = jumps.length ? jumps : moves;
  if (skill < 0.22 && rng.chance(0.6)) return rng.pick(pool);
  let best = pool[0]!;
  let bestS = -1e9;
  for (const m of pool) {
    let s = chainValue(board, m, laws, mods, rng, skill);
    if (!m.capture) {
      if (m.to.r === SIZE - 1) s += 6;
      const dist = Math.abs(m.to.c - 3.5);
      s += (3 - dist) * 0.3 * skill;
    }
    if (s > bestS) {
      bestS = s;
      best = m;
    }
  }
  return best;
}
