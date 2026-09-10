import { LAW_DEFS } from "./laws.ts";
import { boardSpec } from "./setup.ts";
import { Rng } from "./rng.ts";
import { emptyLaws, emptyMods, type Laws } from "./types.ts";
import { ENDLESS_KEY, clearEndless, hasEndless, loadEndless, saveEndless, type EndlessSave } from "./endlessSave.ts";
import { hasClimb, loadClimb, saveClimb, clearClimb, type ClimbSave } from "./save.ts";
import {
  ENDLESS_KIT_CAP,
  endlessLily,
  endlessPinRounds,
  endlessSkill,
  endlessSpecIndex,
  endlessSwap,
  endlessTake,
  ownedLawIds,
} from "./endless.ts";

if (typeof localStorage === "undefined") {
  const bag: Record<string, string> = {};
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k) => bag[k] ?? null,
    setItem: (k, v) => {
      bag[k] = String(v);
    },
    removeItem: (k) => {
      delete bag[k];
    },
    clear: () => {
      for (const k of Object.keys(bag)) delete bag[k];
    },
    key: () => null,
    get length() {
      return Object.keys(bag).length;
    },
  } as Storage;
}

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(ENDLESS_KIT_CAP === 3, "kit cap is 3");
assert(ownedLawIds(emptyLaws()).length === 0, "fresh kit empty");
assert(endlessTake(emptyLaws(), "freeJump") === null, "freeJump not in pick pool");

const first = LAW_DEFS[0]!.id;
const second = LAW_DEFS[1]!.id;
const third = LAW_DEFS[2]!.id;
const fourth = LAW_DEFS[3]!.id;

let laws: Laws = emptyLaws();
const t1 = endlessTake(laws, first);
assert(t1 && !t1.needsDrop && t1.laws[first], "first take fills");
laws = t1!.laws;
const t2 = endlessTake(laws, second);
assert(t2 && !t2.needsDrop, "second take fills");
laws = t2!.laws;
const t3 = endlessTake(laws, third);
assert(t3 && !t3.needsDrop && ownedLawIds(t3.laws).length === 3, "third take fills to 3");
laws = t3!.laws;
const t4 = endlessTake(laws, fourth);
assert(t4 && t4.needsDrop && !t4.laws[fourth] && ownedLawIds(t4.laws).length === 3, "fourth take does not apply");
const swapped = endlessSwap(laws, fourth, first);
assert(swapped && swapped[fourth] && !swapped[first] && ownedLawIds(swapped).length === 3, "swap drops one");
assert(endlessSwap(laws, fourth, fourth) === null, "cannot drop the take id");
assert(endlessTake(laws, first) === null, "cannot take an owned power");
assert(endlessSwap(laws, "freeJump", first) === null, "swap cannot take freeJump");
assert(endlessSwap(laws, fourth, "freeJump") === null, "swap cannot drop freeJump");

assert(endlessSpecIndex(1) === 0, "r1 First Hop");
assert(endlessSpecIndex(3) === 1, "r3 early");
assert(endlessSpecIndex(4) === 2, "r4 board 3");
assert(endlessSpecIndex(7) === 3, "r7");
assert(endlessSpecIndex(11) === 4, "r11");
assert(endlessSpecIndex(17) === 5, "r17 crown band");
assert(endlessLily(1) === false && endlessLily(3) === false && endlessLily(4) === true, "lily from round 4");
assert(endlessSkill(1) === 0.1, "r1 skill");
assert(endlessSkill(17) === 0.95, "r17 skill not 1");

assert(endlessPinRounds(0, "lose") === null, "no pin at 0 clears");
assert(endlessPinRounds(4, "home") === null, "home does not pin");
assert(endlessPinRounds(4, "lose") === 4, "lose pins clears");
assert(endlessPinRounds(4, "giveup") === 4, "give up pins clears");
assert(endlessPinRounds(12, "lose") === 12, "pin the clear count");

const pondOn = { ...emptyLaws(), widePond: true };
const spec10 = boardSpec(endlessSpecIndex(5), 0, false, new Rng(1), pondOn.widePond ? 10 : 8);
assert((spec10.size ?? 8) === 10, "Wide Pond next board is 10");
const spec8 = boardSpec(endlessSpecIndex(5), 0, false, new Rng(1), 8);
assert((spec8.size ?? 8) === 8, "drop Wide Pond next board is 8");

function tinyBoard() {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

const climbStub: ClimbSave = {
  v: 1,
  runSeed: 9,
  pathNames: ["First Hop"],
  board: tinyBoard(),
  laws: emptyLaws(),
  mods: emptyMods(),
  blurb: "climb",
  feltMods: [],
  hops: 1,
  moves: 1,
  combo: 0,
  boardIndex: 0,
  turn: "you",
  lock: null,
  lastRitesUsed: false,
  oopsLeft: 1,
  snapshot: null,
  snapshotMods: null,
  snapshotHops: 0,
  snapshotMoves: 0,
  snapshotLastRites: false,
  skippedJump: false,
  quiet: 0,
  snapshotQuiet: 0,
  idSeq: 1,
  log: ["climb-log"],
  offers: [],
  screen: "playing",
};

const endlessStub: EndlessSave = {
  ...climbStub,
  blurb: "endless",
  log: ["endless-log"],
  endlessRound: 4,
  clears: 3,
  pendingTake: "backJump",
};

if (typeof localStorage !== "undefined") {
  clearClimb();
  clearEndless();
  saveClimb(climbStub);
  saveEndless(endlessStub);
  assert(hasClimb() && hasEndless(), "both waits can exist");
  assert(loadClimb()?.blurb === "climb", "climb wait intact");
  assert(loadEndless()?.endlessRound === 4 && loadEndless()?.pendingTake === "backJump", "endless wait has round + drop");
  localStorage.setItem(ENDLESS_KEY, JSON.stringify({ ...endlessStub, pendingTake: "toString" }));
  assert(loadEndless()?.pendingTake === null, "inherited pendingTake rejected");
  clearEndless();
  assert(hasClimb() && !hasEndless(), "clear endless leaves climb");
  assert(ENDLESS_KEY === "jumpgrave-endless-v1", "endless key");
}

console.log("endlessCheck ok");
