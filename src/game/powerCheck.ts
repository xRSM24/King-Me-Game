/** Run with: node --experimental-strip-types src/game/powerCheck.ts */
import { sessionMailOk } from "./account.ts";
import { KEEP_SAVE_HEAD, keepSaveFormHtml, shouldOfferKeepSave } from "./keepSave.ts";
import { boardSize, cellFromPoint, emptyLaws, emptyMods, inBoard, isDark, SIZE } from "./types.ts";
import type { Piece } from "./types.ts";
import { LAW_DEFS, unusedLaws } from "./laws.ts";
import { getConfirmNotes } from "./audio.ts";
import { comboAfterHop, comboLog, comboName } from "./combo.ts";
import {
  FIRST_JUMP_DESC,
  FIRST_LANE_CENTER,
  FIRST_LANE_LEFT,
  FIRST_LANE_RIGHT,
  OPPOSITE_WINGS_DESC,
  STAR_ELSEWHERE,
  boardOpenLog,
  climbHintLine,
  hopStatus,
  laneDesc,
  oopsLabel,
  wipeAutoEndMs,
} from "./copy.ts";
import { getHoldMs, sceneMarkup } from "./getScenes.ts";
import {
  campsFromRows,
  legalMoves,
  modsFromSpec,
  setupBoard,
  spreadCrown,
  trapdoorHole,
  wouldCrown,
  type Board,
} from "./rules.ts";
import { boardSpec, climbNames, maplePathToKingRank, normalizeClimbNames, pickLily, pickSafeHoles, pickSpots, scaleRowsForSize } from "./setup.ts";
import { Rng } from "./rng.ts";
import {
  applyBurst,
  burstFromMods,
  endYouTurn,
  noteCapture,
  shouldGrantExtras,
  takeLilyOnBoard,
  type YouBurst,
} from "./tempo.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(sessionMailOk(null) === false, "no session is not news mail");
assert(sessionMailOk({ mailOk: true }) === true, "session mailOk true");
assert(sessionMailOk({}) === false, "missing mailOk is false");

assert(KEEP_SAVE_HEAD === "Keep your save? Enter your email!", "keep-save headline is locked");
assert(shouldOfferKeepSave(false, "run") === true, "unsigned climb end offers keep-save");
assert(shouldOfferKeepSave(true, "run") === false, "signed-in climb end does not ask again");
assert(shouldOfferKeepSave(false, "daily") === false, "daily end has no keep-save");
const html = keepSaveFormHtml({ idPrefix: "keep", showNotNow: true });
assert(html.includes(KEEP_SAVE_HEAD), "form stamps the headline");
assert(html.includes("type=\"checkbox\"") && html.includes("checked"), "news box starts checked");
assert(html.includes("Not now"), "end form can dismiss");
assert(!keepSaveFormHtml({ idPrefix: "acct", showNotNow: false }).includes("Not now"), "Save hops has no Not now");

function burst(p: Partial<YouBurst> = {}): YouBurst {
  return {
    lilyHops: 0,
    openingHops: 0,
    napPending: false,
    napUsed: false,
    ...p,
  };
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
assert(mods.lily == null, "lily defaults null");
assert(mods.lilyPending === false, "lilyPending defaults false");
assert(mods.lilyHops === 0, "lilyHops defaults 0");
assert(boardSize(mods) === 8, "boardSize reads 8");
assert(boardSize({ ...mods, size: 10 }) === 10, "boardSize reads 10");
assert(inBoard(9, 0, 10), "row 9 is on a 10-board");
assert(!inBoard(9, 0, 8), "row 9 is off an 8-board");
assert(!inBoard(8, 0), "inBoard without size still uses 8");

const felt = { left: 0, top: 0, width: 100, height: 100 };
const far10 = cellFromPoint(95, 95, felt, 10);
assert(far10?.r === 9 && far10?.c === 9, "10-board drag maps the far corner to 9,9");
const far8 = cellFromPoint(95, 95, felt, 8);
assert(far8?.r === 7 && far8?.c === 7, "8-board drag maps the far corner to 7,7");
assert(cellFromPoint(5, 5, felt, 10)?.r === 0, "10-board near corner is row 0");
assert(cellFromPoint(-1, 0, felt, 10) === null, "pointer left of the felt is off");

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

const open = blankSize(8);
const base = { ...emptyMods(), holes: [{ r: 3, c: 4 }] };
const lily = pickLily(new Rng(1), open, base);
assert(lily, "an empty 8-board gets a lily");
assert(isDark(lily!.r, lily!.c), "lily sits on dark");
assert(!(lily!.r === 3 && lily!.c === 4), "lily is not a hole");
base.lily = lily;
takeLilyOnBoard(base);
assert(base.lily == null && base.lilyPending, "taking the lily clears it and persists the pending extras");

const packed = blankSize(8);
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    if (isDark(r, c) && !(r === 7 && c === 0)) packed[r]![c] = { id: 1, side: "them", king: false };
  }
}
const fallback = pickLily(new Rng(2), packed, emptyMods());
assert(fallback && fallback.r === 7 && fallback.c === 0, "if mid is full, any empty dark");

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

const farLaw = { ...emptyLaws(), farJump: true };
const farBoard = blankSize(10);
farBoard[9]![0] = { id: 1, side: "you", king: false };
farBoard[8]![1] = { id: 2, side: "them", king: false };
const farMoves = legalMoves(farBoard, "you", farLaw, null, ten);
assert(
  farMoves.some((m) => m.far && m.to.r === 6 && m.to.c === 3),
  "Far Jump works from row 9 on a 10-board",
);

const crownBoard = blankSize(10);
crownBoard[8]![1] = { id: 3, side: "you", king: true };
crownBoard[9]![2] = { id: 4, side: "you", king: false };
const edgeSpread = spreadCrown(crownBoard, { r: 8, c: 1 }, "you");
assert(
  edgeSpread.pos?.r === 9 && edgeSpread.pos.c === 2 && edgeSpread.board[9]![2]?.king,
  "Double Crown reaches an in-bounds neighbor past row 7",
);

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

const take = { from: { r: 5, c: 2 }, to: { r: 3, c: 4 }, capture: { r: 4, c: 3 } };
assert(trapdoorHole(take)?.r === 4 && trapdoorHole(take)?.c === 3, "hole is where the Enemy sat");
assert(trapdoorHole({ from: { r: 5, c: 2 }, to: { r: 4, c: 3 } }) == null, "slides make no trapdoor");

assert(scaleRowsForSize([7, 6], 10).join(",") === "9,8", "bottom home rows shift on 10");
assert(scaleRowsForSize([0, 1, 2], 10).join(",") === "0,1,2", "top rows stay");
assert(scaleRowsForSize([7, 6], 8).join(",") === "7,6", "8-board rows unchanged");

const spec10 = boardSpec(1, 0, false, new Rng(99), 10);
assert(spec10.size === 10, "boardSpec stores size 10");
assert(spec10.youRows.every((r) => r <= 9), "you rows fit a 10-board");
const laid10 = setupBoard(spec10, () => 1);
assert(laid10.length === 10 && laid10[0]!.length === 10, "laid 10×10");
const m10 = modsFromSpec(spec10, { size: 10 });
assert(m10.size === 10, "mods keep size 10");
assert(m10.themKingRow === 9 || m10.youKingRow === 9, "one far edge is row 9");

let n = endYouTurn(burst({ openingHops: 2 }), {});
assert(n.next === "you" && n.burst.openingHops === 1, "Back 2 Back: first hop then you again");
n = endYouTurn(n.burst, {});
assert(n.next === "them" && n.burst.openingHops === 0, "Back 2 Back: second hop then Enemy");

let nap = noteCapture(burst(), true);
assert(nap.napPending, "capture arms Nap Time");
nap = noteCapture(nap, true);
assert(nap.napPending && !nap.napUsed, "second capture does not bank another nap");
n = endYouTurn(nap, {});
assert(n.next === "you" && n.burst.napUsed && !n.burst.napPending, "Enemy skips once, then you");
n = endYouTurn(n.burst, {});
assert(n.next === "them", "after the skip, Enemy plays");

const slide = noteCapture(burst(), false);
assert(!slide.napPending, "no nap law means no skip");

n = endYouTurn(burst({ openingHops: 2 }), { tookLily: true });
assert(n.next === "you" && n.burst.lilyHops === 2 && n.burst.openingHops === 1, "lily grant after landing; leftover opening");
n = endYouTurn(n.burst, {});
assert(n.burst.lilyHops === 1 && n.burst.openingHops === 1, "first lily extra");
n = endYouTurn(n.burst, {});
assert(n.burst.lilyHops === 0 && n.next === "you" && n.burst.openingHops === 1, "then leftover Back 2 Back");
n = endYouTurn(n.burst, {});
assert(n.next === "them" && n.burst.openingHops === 0, "then Enemy");

const continued = { ...emptyMods(), lily: null, lilyPending: true, lilyHops: 0 };
const tookLily = continued.lilyPending;
const ended = endYouTurn(burstFromMods(continued), { tookLily });
applyBurst(continued, ended.burst);
continued.lilyPending = false;
assert(continued.lilyHops === 2, "Continue mid-combo grants two lily extras");
assert(continued.lilyPending === false, "Continue mid-combo clears lilyPending");
assert(ended.next === "you", "Continue mid-combo stays on you for extras");
assert(!shouldGrantExtras(0), "last capture wins before granting extras");
assert(shouldGrantExtras(1), "extras remain available while an Enemy remains");

for (const d of LAW_DEFS) {
  const html = sceneMarkup(d.scene, d.name);
  assert(html.includes("YOU GOT"), `${d.id} stamps YOU GOT`);
  assert(html.includes(d.id === "back2Back" ? "BACK 2 BACK" : d.name.toUpperCase()) || html.includes(d.name), `${d.id} shows the name`);
}
assert(sceneMarkup("missing", "Trapdoor").includes("YOU GOT TRAPDOOR"), "unknown scene still stamps");
assert(!sceneMarkup("back2Back", "Back 2 Back").includes('class="star"'), "back2Back has no jump star");
assert(getHoldMs(false) === 900, "get overlay is a short beat");
assert(getHoldMs(true) === 450, "motion off get is a flash");
const getNotes = getConfirmNotes();
assert(getNotes.length === 2, "get confirm is two notes");
assert(getNotes.every((n) => n.type === "sine"), "get confirm is sine");
assert(getNotes.every((n) => n.gain < 0.04), "get confirm stays quiet");
assert(getNotes.every((n) => n.freq < 1000), "get confirm is not a fanfare climb");
assert((getNotes[1]?.wait ?? 0) > 0, "get confirm staggers the fifth");

assert(comboAfterHop(0, true, false) === 1, "first capture of a hop is Got one");
assert(comboName(comboAfterHop(0, true, false)) === "Got one!", "first take yells Got one");
assert(comboAfterHop(1, true, true) === 2, "a chained jump is Double hop");
assert(comboName(comboAfterHop(1, true, true)) === "Double hop!", "same-turn second take yells Double hop");
assert(comboAfterHop(1, true, false) === 1, "a new hop after the Enemy is not a combo");
assert(comboName(comboAfterHop(1, true, false)) === "Got one!", "Enemy-in-between take yells Got one");
assert(comboAfterHop(2, false, false) === 0, "a quiet slide breaks the combo");

const rightThem = pickSpots(new Rng(1), [0, 1], 6, [], new Set(), "right", 8);
assert(rightThem.length === 6, "right file still seats six Enemies");
assert(
  rightThem.every((p) => p.c >= 4),
  "right file does not spill onto columns 1–4",
);
const leftYou = pickSpots(new Rng(2), [6, 7], 5, [], new Set(), "left", 8);
assert(leftYou.length === 5, "left file still seats five maples");
assert(
  leftYou.every((p) => p.c < 4),
  "left file does not spill onto columns 5–8",
);

const wall = blankSize(8);
wall[7]![0] = { id: 1, side: "you", king: false };
const isolated = {
  ...emptyMods(),
  youKingRow: 0,
  youHome: [6, 7],
  themKingRow: 7,
  themHome: [0, 1],
  holes: [
    { r: 6, c: 1 },
    { r: 5, c: 0 },
    { r: 5, c: 2 },
    { r: 4, c: 1 },
    { r: 3, c: 0 },
    { r: 3, c: 2 },
    { r: 2, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 2 },
  ],
};
assert(
  !maplePathToKingRank(wall, isolated, { r: 7, c: 0 }),
  "a maple boxed from row 0 has no path",
);
const safe = pickSafeHoles(new Rng(3), 8, wall, emptyLaws(), { ...isolated, holes: [] });
assert(
  maplePathToKingRank(wall, { ...isolated, holes: safe }, { r: 7, c: 0 }),
  "pickSafeHoles will not wall the maple off row 0",
);

const idleHop = {
  coachOn: false,
  thinking: false,
  canOops: false,
  wiped: false,
  locked: false,
  yourTurn: true,
  selected: false,
  anyJump: false,
  selectedJump: false,
  overHole: false,
};
assert(
  hopStatus({ ...idleHop, anyJump: true }) === "A jump is ready — you do not have to take it.",
  "unselected HUD names a ready jump",
);
assert(
  hopStatus({ ...idleHop, selected: true, anyJump: true, selectedJump: true }) ===
    "The star is the jump. Slide a pip if you want to go another way.",
  "selected jumper HUD names the star on this maple",
);
assert(
  hopStatus({ ...idleHop, selected: true, anyJump: true, selectedJump: false }) === STAR_ELSEWHERE,
  "selected non-jumper HUD points at the other maple's star",
);
assert(
  hopStatus({ ...idleHop, selected: true }) === "Slide onto a pip.",
  "selected maple with only pips does not invent a star",
);

for (const line of [
  laneDesc("left"),
  laneDesc("right"),
  laneDesc("center"),
  FIRST_LANE_LEFT,
  FIRST_LANE_RIGHT,
  FIRST_LANE_CENTER,
  OPPOSITE_WINGS_DESC,
]) {
  assert(!/\bfiles?\b|\bcolumns?\b/i.test(line), `lane copy skips chess jargon: ${line}`);
}
assert(laneDesc("center").toLowerCase().includes("middle"), "center lane says middle");
assert(laneDesc("left").toLowerCase().includes("left"), "left lane says left");
assert(laneDesc("right").toLowerCase().includes("right"), "right lane says right");

assert(boardOpenLog("First Hop", FIRST_JUMP_DESC) === null, "board flavor stays off the play log");
assert(!climbHintLine("Pond Rush").includes("randomly seeded"), "title hint is not a seed lecture");
assert(!climbHintLine("Pond Rush").includes("Each new game begins"), "title hint is not three sentences");
assert(climbHintLine("Pond Rush").includes("Pond Rush"), "title hint still names today's daily");

assert(oopsLabel(1, false) === "Oops", "waiting Oops does not look counted-out");
assert(oopsLabel(1, true) === "Oops ×1", "ready Oops shows remaining takes");
assert(oopsLabel(0, false) === "Oops used", "spent Oops says used");

assert(wipeAutoEndMs(true) === null, "Oops still up: do not auto-end the wipe");
assert(wipeAutoEndMs(false) === 700, "no Oops left: a short beat then the end screen");

assert(comboLog(1, false) === "Got one!", "first take logs Got one");
assert(comboLog(2, false) === "Double hop!", "double take logs the yell only");
assert(!comboLog(2, false).includes("x2"), "combo log does not repeat the count");
assert(comboLog(4, true) === "Far jump!", "far jump log stays Far jump");

assert(climbNames(1)[0] === "First Hop", "board 1 is just First Hop");
assert(
  normalizeClimbNames(["First Hop · Hidden", "Velvet Forge"])[0] === "First Hop",
  "old First Hop · flavor saves display as First Hop",
);
for (let seed = 1; seed <= 80; seed++) {
  const names = climbNames(seed);
  assert(names[0] === "First Hop", `seed ${seed} First Hop has no suffix`);
  assert(
    names.every((n) => !/\bHidden\b|\bFoggy\b|\bMisty\b/.test(n)),
    `seed ${seed} climb names do not sound like fog rules: ${names.join(", ")}`,
  );
}

console.log("powerCheck ok");
