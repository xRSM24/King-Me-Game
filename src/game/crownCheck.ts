/** Run with: node --experimental-strip-types src/game/crownCheck.ts */
import { applyMove, campsFromRows, legalMoves, manStep, moveHitting, reviveKing, wouldCrown, type Board } from "./rules.ts";
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

board = blank();
board[3]![2] = { id: 10, side: "you", king: true };
board[2]![1] = { id: 11, side: "them", king: false };
board[2]![3] = { id: 12, side: "them", king: false };
board[4]![1] = { id: 13, side: "them", king: false };
board[4]![3] = { id: 14, side: "them", king: false };
const kingJumps = legalMoves(board, "you", emptyLaws(), null, std);
assert(
  kingJumps.filter((m) => m.capture).length === 4,
  "a King in the middle jumps all 4 diagonals, including back",
);
assert(
  kingJumps.some((m) => m.capture && m.to.r > m.from.r),
  "a King can capture toward home",
);

board = blank();
board[1]![2] = { id: 20, side: "them", king: false };
board[6]![1] = { id: 21, side: "them", king: false };
let seq = 100;
const revived = reviveKing(board, "you", () => seq++, emptyLaws(), std);
assert(revived.pos, "Second Chance places a King");
assert(revived.board[revived.pos!.r]![revived.pos!.c]?.king, "the returned piece is a King");
assert(revived.pos!.r !== 7, "Second Chance does not sit the King on your back row");
const homeward = legalMoves(revived.board, "you", emptyLaws(), null, std);
assert(
  homeward.some((m) => m.capture && m.to.r > m.from.r),
  "the returned King can capture back toward home",
);

const take = homeward.find((m) => m.capture)!;
assert(take.capture, "homeward jump has a capture square");
assert(
  moveHitting(homeward, take.from, take.capture!) === take,
  "dropping onto the Enemy counts as that jump",
);
assert(
  moveHitting(homeward, take.from, take.to) === take,
  "dropping onto the star past them still counts",
);

console.log("crown checks ok");

