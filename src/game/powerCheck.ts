/** Run with: node --experimental-strip-types src/game/powerCheck.ts */
import { boardSize, emptyLaws, emptyMods, inBoard } from "./types.ts";
import { LAW_DEFS, unusedLaws } from "./laws.ts";

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

console.log("powerCheck ok");
