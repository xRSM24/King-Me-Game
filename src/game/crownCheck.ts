/** Run with: node --experimental-strip-types src/game/crownCheck.ts */
import {
  applyMove,
  applyStartLaws,
  campsFromRows,
  isHole,
  isHoleTrapped,
  legalMoves,
  manStep,
  modsFromSpec,
  moreJumps,
  moveHitting,
  movesFrom,
  placeScout,
  playable,
  reviveKing,
  setupBoard,
  spreadCrown,
  wouldCrown,
  type Board,
} from "./rules.ts";
import { emptyLaws, emptyMods, SIZE, samePos } from "./types.ts";
import type { Piece } from "./types.ts";
import { hashSeed, Rng } from "./rng.ts";
import { boardSpec, unstickHoles } from "./setup.ts";

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

const farLaws = { ...emptyLaws(), farJump: true };
board = blank();
board[5]![2] = { id: 30, side: "you", king: false };
board[4]![3] = { id: 31, side: "them", king: false };
const farMoves = legalMoves(board, "you", farLaws, null, std);
const shortHop = farMoves.find((m) => m.capture && !m.far && m.to.r === 3 && m.to.c === 4);
const longHop = farMoves.find((m) => m.far && m.to.r === 2 && m.to.c === 5);
assert(shortHop, "Far Jump still allows the normal 2-square capture");
assert(longHop, "Far Jump offers a 3-square landing past the empty skip");
assert(longHop!.capture && longHop!.capture.r === 4 && longHop!.capture.c === 3, "Far Jump captures the adjacent Enemy");
assert(
  moveHitting(farMoves, shortHop!.from, shortHop!.capture!) === shortHop,
  "dropping onto the Enemy still takes the short hop when both exist",
);
assert(moveHitting(farMoves, longHop!.from, longHop!.to) === longHop, "dropping on the far star takes the Far Jump");

const used = { ...std, farJumpUsed: true };
const usedMoves = legalMoves(board, "you", farLaws, null, used);
assert(
  usedMoves.every((m) => !m.far),
  "Far Jump is once each turn",
);

board[5]![2] = { id: 32, side: "you", king: true };
const kingFar = legalMoves(board, "you", farLaws, null, std);
assert(
  kingFar.every((m) => !m.far),
  "Kings do not Far Jump",
);

board = blank();
board[5]![2] = { id: 33, side: "them", king: false };
board[4]![3] = { id: 34, side: "you", king: false };
const enemyFar = legalMoves(board, "them", farLaws, null, std);
assert(
  enemyFar.every((m) => !m.far),
  "the Enemy does not Far Jump",
);

board = blank();
board[5]![2] = { id: 35, side: "you", king: false };
board[4]![3] = { id: 36, side: "them", king: false };
const holeSkip = { ...std, holes: [{ r: 3, c: 4 }] };
assert(!playable(3, 4, holeSkip), "the skip square is a hole");
const overHole = legalMoves(board, "you", farLaws, null, holeSkip);
assert(
  overHole.some((m) => m.far && m.to.r === 2 && m.to.c === 5),
  "Far Jump may skip an empty hole and land past it",
);
assert(
  overHole.every((m) => !(m.capture && !m.far && m.to.r === 3)),
  "a normal jump cannot land on the hole",
);

board = blank();
board[1]![2] = { id: 40, side: "you", king: true };
board[2]![1] = { id: 41, side: "you", king: false };
const spread = spreadCrown(board, { r: 1, c: 2 }, "you");
assert(spread.pos && spread.pos.r === 2 && spread.pos.c === 1, "Double Crown kings a neighbor");
assert(spread.board[2]![1]?.king, "the neighbor is a King");
assert(spread.board[1]![2]?.king, "the original King stays a King");

board = blank();
board[6]![1] = { id: 42, side: "you", king: false };
board[6]![3] = { id: 43, side: "you", king: false };
const scouted = placeScout(board, "you", std);
assert(scouted[4]![1] || scouted[4]![3], "Scout walks two rows toward the Enemy");
assert(!scouted[6]![1] || !scouted[6]![3], "Scout leaves its old square");
assert(scouted[6]![1] || scouted[6]![3], "the other regular piece stays put");

board = blank();
board[7]![0] = { id: 44, side: "you", king: true };
board[6]![1] = { id: 45, side: "you", king: false };
const dressed = applyStartLaws(board, { ...emptyLaws(), scout: true, doubleCrown: true }, std);
assert(dressed[4]![1]?.id === 45 && !dressed[6]![1], "Scout moves the regular piece first");
assert(dressed[7]![0]?.king, "the setup King stays");
assert(!dressed[4]![1]?.king, "Double Crown needs a neighbor, not a piece two rows away");

board = blank();
board[7]![0] = { id: 46, side: "you", king: true };
board[6]![1] = { id: 47, side: "you", king: false };
const crownedSetup = applyStartLaws(board, { ...emptyLaws(), doubleCrown: true }, std);
assert(crownedSetup[6]![1]?.king, "Start as King plus Double Crown kings the neighbor");

board = blank();
board[5]![2] = { id: 50, side: "you", king: false };
board[4]![3] = { id: 51, side: "them", king: false };
board[2]![5] = { id: 52, side: "them", king: false };
const afterTake = applyMove(board, { from: { r: 5, c: 2 }, to: { r: 3, c: 4 }, capture: { r: 4, c: 3 } }, std);
assert(afterTake[3]![4]?.side === "you", "the capturer sits on the landing");
const trap = { ...std, holes: [{ r: 3, c: 4 }], trapdoorUsed: true };
assert(isHole(trap, 3, 4), "Trapdoor marks the landing as a hole");
assert(afterTake[3]![4], "the piece may keep sitting on the new hole");
assert(!playable(3, 4, trap), "nobody else may land there after");
assert(moreJumps(afterTake, { r: 3, c: 4 }, emptyLaws(), trap), "you can still jump from a Trapdoor hole");

board = blank();
board[5]![2] = { id: 55, side: "you", king: false };
const pitLeap = { ...std, holes: [{ r: 4, c: 3 }] };
const overPit = legalMoves(board, "you", emptyLaws(), null, pitLeap, true);
const pitHop = overPit.find((m) => m.overHole && m.to.r === 3 && m.to.c === 4);
assert(pitHop, "you may jump over a pit onto the next dark square");
assert(pitHop!.overHole && pitHop!.overHole.r === 4 && pitHop!.overHole.c === 3, "the leap names the pit");
assert(
  moveHitting(overPit, pitHop!.from, pitHop!.overHole!) === pitHop,
  "dropping onto the pit counts as jumping over it",
);
assert(!overPit.some((m) => samePos(m.to, { r: 4, c: 3 })), "nobody may land on the pit");

board = blank();
board[5]![2] = { id: 56, side: "you", king: false };
board[4]![1] = { id: 57, side: "them", king: false };
const mustTake = legalMoves(board, "you", emptyLaws(), null, pitLeap);
assert(mustTake.every((m) => m.capture), "a capture still beats leaping a pit");
assert(mustTake.every((m) => !m.overHole), "you do not have to jump a pit when an Enemy is up");

board = blank();
board[7]![0] = { id: 58, side: "you", king: true };
const flyLaws = { ...emptyLaws(), flyingKings: true };
const flyMods = { ...std, holes: [{ r: 6, c: 1 }] };
const flies = legalMoves(board, "you", flyLaws, null, flyMods, true);
assert(
  flies.some((m) => m.to.r === 5 && m.to.c === 2),
  "a Super King slides past a pit",
);
assert(
  flies.every((m) => !(m.to.r === 6 && m.to.c === 1)),
  "a Super King still may not land on a pit",
);

board = blank();
board[6]![1] = { id: 60, side: "you", king: false };
board[4]![3] = { id: 61, side: "you", king: false };
const plugged = { ...std, holes: [{ r: 5, c: 0 }, { r: 5, c: 2 }] };
assert(isHoleTrapped(board, { r: 6, c: 1 }, emptyLaws(), plugged), "two pits plus a blocked landing can wall in a piece");
assert(movesFrom(board, { r: 6, c: 1 }, emptyLaws(), plugged).length === 0, "no step and no leap when both landings are gone");
const freed = unstickHoles(board, emptyLaws(), plugged, new Rng(7));
assert(!isHoleTrapped(board, { r: 6, c: 1 }, emptyLaws(), freed), "unstick opens a path for the walled-in piece");
assert(movesFrom(board, { r: 6, c: 1 }, emptyLaws(), freed).length > 0, "the side piece can step after unstick");
assert(freed.holes.length === 2, "the two pits move, they do not vanish");

board = blank();
board[7]![0] = { id: 62, side: "you", king: false };
board[6]![1] = { id: 63, side: "you", king: false };
const behind = { ...std, holes: [{ r: 3, c: 4 }] };
assert(!isHoleTrapped(board, { r: 7, c: 0 }, emptyLaws(), behind), "a piece behind a friend is not a hole trap");
const still = unstickHoles(board, emptyLaws(), behind, new Rng(3));
assert(still.holes.length === 1 && still.holes[0]!.r === 3 && still.holes[0]!.c === 4, "harmless pits stay put");

board = blank();
board[6]![7] = { id: 64, side: "you", king: false };
const edgePit = { ...std, holes: [{ r: 5, c: 6 }] };
const edgeLeap = movesFrom(board, { r: 6, c: 7 }, emptyLaws(), edgePit);
assert(
  edgeLeap.some((m) => m.overHole && m.to.r === 4 && m.to.c === 5),
  "an edge piece jumps over the pit onto the star past it",
);
board[4]![5] = { id: 65, side: "you", king: false };
assert(isHoleTrapped(board, { r: 6, c: 7 }, emptyLaws(), edgePit), "one pit can seal the right file when the far square is taken");
const edgeFree = unstickHoles(board, emptyLaws(), edgePit, new Rng(11));
assert(movesFrom(board, { r: 6, c: 7 }, emptyLaws(), edgeFree).length > 0, "the right-file piece can step after unstick");

board = blank();
board[1]![6] = { id: 70, side: "them", king: false };
board[2]![7] = { id: 71, side: "them", king: false };
const enemyPit = { ...std, holes: [{ r: 2, c: 5 }, { r: 3, c: 6 }] };
assert(
  movesFrom(board, { r: 2, c: 7 }, emptyLaws(), enemyPit).some((m) => m.overHole),
  "an Enemy on the edge may jump over the pit",
);
board[4]![5] = { id: 72, side: "them", king: false };
assert(isHoleTrapped(board, { r: 2, c: 7 }, emptyLaws(), enemyPit), "the edge Enemy is sealed when the far square is taken");
const enemyFree = unstickHoles(board, emptyLaws(), enemyPit, new Rng(19));
assert(movesFrom(board, { r: 2, c: 7 }, emptyLaws(), enemyFree).length > 0, "the edge Enemy can step after unstick");

for (let seed = 1; seed <= 40; seed++) {
  for (let i = 1; i <= 5; i++) {
    const rng = new Rng(hashSeed(seed * 104729 + i * 17));
    const spec = boardSpec(i, 0, false, rng);
    const mods = modsFromSpec(spec);
    let n = 0;
    const felt = applyStartLaws(setupBoard(spec, () => ++n), emptyLaws(), mods);
    const free = unstickHoles(felt, emptyLaws(), mods, new Rng(seed + i));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!felt[r]![c]) continue;
        const pos = { r, c };
        if (isHoleTrapped(felt, pos, emptyLaws(), free)) {
          throw new Error(`hole trap left on board ${i} seed ${seed} at ${r},${c}`);
        }
      }
    }
  }
}

console.log("crown checks ok");

