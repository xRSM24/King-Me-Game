/** Run with: node --experimental-strip-types src/game/crownCheck.ts */
import { applyMove, campsFromRows, legalMoves, manStep, wouldCrown, type Board } from "./rules.ts";
import { emptyLaws, emptyMods, SIZE } from "./types.ts";
import type { Piece } from "./types.ts";

function blank(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const race = { ...emptyMods(), ...campsFromRows([3, 2], [6, 5, 7]) };
assert(race.youKingRow === 7, "race: you king on the bottom edge");
assert(race.themKingRow === 0, "race: Enemy king on the top edge");
assert(manStep("you", race) === 1, "race: you walk down, away from your camp");
assert(manStep("them", race) === -1, "race: Enemy walks up, away from their camp");
assert(!wouldCrown("you", 0, race), "race: row 0 is not your far row");
assert(!wouldCrown("you", 2, race), "race: your starting ranks never crown");
assert(!wouldCrown("you", 3, race), "race: your starting ranks never crown");
assert(wouldCrown("you", 7, race), "race: far row 7 does crown you");
assert(wouldCrown("them", 0, race), "race: far row 0 does crown the Enemy");
assert(!wouldCrown("them", 7, race), "race: Enemy starting ranks never crown");

const std = emptyMods();
assert(wouldCrown("you", 0, std), "normal: you crown on row 0");
assert(!wouldCrown("you", 7, std), "normal: you do not crown in your own back");
assert(wouldCrown("them", 7, std), "normal: Enemy crowns on row 7");
assert(!wouldCrown("them", 0, std), "normal: Enemy does not crown in their own back");
assert(manStep("you", std) === -1, "normal: you walk up");
assert(manStep("them", std) === 1, "normal: Enemy walks down");

let board = blank();
const you: Piece = { id: 1, side: "you", king: false };
board[2]![1] = you;
const intoOwnTop = applyMove(board, { from: { r: 2, c: 1 }, to: { r: 0, c: 3 } }, race);
assert(!intoOwnTop[0]![3]?.king, "moving into your own starting neighborhood does not king");

board = blank();
board[6]![1] = { id: 2, side: "you", king: false };
const intoFar = applyMove(board, { from: { r: 6, c: 1 }, to: { r: 7, c: 0 } }, race);
assert(intoFar[7]![0]?.king, "reaching the far edge from your camp does king");

board = blank();
board[3]![2] = { id: 3, side: "you", king: false };
const slides = legalMoves(board, "you", emptyLaws(), null, race, true);
assert(slides.length > 0, "a man in the race camp can step");
assert(
  slides.every((m) => m.to.r > m.from.r),
  "race men only walk toward the far edge, not back into their camp",
);

board = blank();
board[6]![1] = { id: 4, side: "you", king: false };
const ownBack = applyMove(board, { from: { r: 6, c: 1 }, to: { r: 7, c: 0 } }, std);
assert(!ownBack[7]![0]?.king, "on a normal board, stepping onto your own back row does not king");

console.log("crown checks ok");
