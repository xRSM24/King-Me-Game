/** Run with: node --experimental-strip-types src/game/powerCheck.ts */
import { boardSize, emptyLaws, emptyMods, inBoard, SIZE } from "./types.ts";
import type { Piece } from "./types.ts";
import { LAW_DEFS, unusedLaws } from "./laws.ts";
import {
  campsFromRows,
  legalMoves,
  setupBoard,
  wouldCrown,
  type Board,
} from "./rules.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const laws = emptyLaws();
assert(laws.widePond === false, "widePond defaults off");
assert(laws.napTime === false, "napTime defaults off");
assert(laws.back2Back === false, "back2Back defaults off");
assert(laws.freeJump === false, "freeJump stays unused");

const mods = emptyMods();
assert(mods.size === 8, "default board size is 8");
assert(mods.napUsed === false, "napUsed defaults false");
assert(mods.napPending === false, "napPending defaults false");
assert(mods.openingHops === 0, "openingHops defaults 0");
assert(boardSize(mods) === 8, "boardSize reads 8");
assert(boardSize({ ...mods, size: 10 }) === 10, "boardSize reads 10");
assert(inBoard(9, 0, 10), "row 9 is on a 10-board");
assert(!inBoard(9, 0, 8), "row 9 is off an 8-board");
assert(!inBoard(8, 0), "inBoard without size still uses 8");

assert(LAW_DEFS.length === 14, "fourteen climb powers");
assert(LAW_DEFS.every((d) => d.scene === d.id), "scene id matches law id");
const names = LAW_DEFS.map((d) => d.name);
assert(names.includes("Starting King"), "Start as King renamed Starting King");
assert(!names.includes("Start as King"), "old Start as King name is gone");
assert(names.includes("Wide Pond"), "Wide Pond is in the pool");
assert(names.includes("Nap Time"), "Nap Time is in the pool");
assert(names.includes("Back 2 Back"), "Back 2 Back is in the pool");
const superKing = LAW_DEFS.find((d) => d.id === "flyingKings")!;
assert(superKing.desc.includes("7"), "Super King card says 7");
const owned = { ...emptyLaws(), backJump: true };
assert(
  unusedLaws(owned).every((d) => d.id !== "backJump"),
  "owned laws drop out of the pick pool",
);
assert(unusedLaws(emptyLaws()).length === 14, "fresh climb can offer all fourteen");

function blankSize(n: number): Board {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => null));
}

const tenCamps = campsFromRows([9, 8], [0, 1], 10);
assert(tenCamps.youKingRow === 0, "10-board: you still king on the far top");
assert(tenCamps.themKingRow === 9, "10-board: Enemy kings on row 9");
assert(wouldCrown("you", 0, { ...emptyMods(), size: 10, ...tenCamps }), "you crown on row 0 of a 10-board");
assert(!wouldCrown("you", 9, { ...emptyMods(), size: 10, ...tenCamps }), "you do not crown on your 10-board home");
assert(wouldCrown("them", 9, { ...emptyMods(), size: 10, ...tenCamps }), "Enemy crowns on row 9");

const fly = { ...emptyLaws(), flyingKings: true };
const ten = { ...emptyMods(), size: 10, ...tenCamps };
let b = blankSize(10);
b[9]![0] = { id: 1, side: "you", king: true } satisfies Piece;
const slides = legalMoves(b, "you", fly, null, ten, true);
assert(slides.some((m) => m.to.r === 2 && m.to.c === 7), "Super King can slide 7 on a 10-board");
assert(
  slides.every((m) => Math.max(Math.abs(m.to.r - 9), Math.abs(m.to.c - 0)) <= 7),
  "Super King never slides 8+ empty squares",
);
assert(!slides.some((m) => m.to.r === 0 && m.to.c === 9), "9-square king ride is illegal");

const spec8 = {
  you: 1,
  them: 1,
  youRows: [7, 6],
  themRows: [0, 1],
  themKings: 0,
  openKing: false,
  holes: [],
  bounce: false,
  themFly: false,
  blurb: "",
  feltMods: [],
  size: 8 as const,
};
const laid8 = setupBoard(spec8, () => 1);
assert(laid8.length === SIZE, "setupBoard default size 8");

console.log("powerCheck ok");
