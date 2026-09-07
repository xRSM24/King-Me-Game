/** Run with: node --experimental-strip-types src/game/powerCheck.ts */
import { boardSize, emptyLaws, emptyMods, inBoard } from "./types.ts";

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

console.log("powerCheck ok");
