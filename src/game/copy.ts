/** Shared modifier copy. Keep numbers in lockstep with rules.ts. */

import { CHASE_HOPS, type FeltMod } from "./types.ts";

/** A normal King steps 1 diagonal square. Flying Kings may ride the empty diagonal (k = 1..7 in rules). */
export const SUPER_KING_DESC =
  "Your Kings may slide any empty squares on a diagonal. A normal King only steps 1 square.";

export const LONG_KING_DESC =
  "Enemy Kings may slide any empty squares on a diagonal. A normal King only steps 1 square.";

export const JUMP_BACK_YOU_DESC =
  "Your pieces may jump backward too (all 4 diagonals). Without this, a non-King only jumps toward the Enemy. Kings already jump every way. Quiet slides still go forward.";

export const JUMP_BACK_THEM_DESC =
  "Enemy pieces may jump backward too (all 4 diagonals). Without this, a non-King only jumps toward you. Kings already jump every way.";

export const JUMP_BACK_BOTH_DESC =
  "Everyone may jump backward (all 4 diagonals). Quiet slides still go forward 1 square. Kings already jump every way.";

export const OPEN_KING_YOU_DESC = "One of your pieces starts this board already a King (moves 1 square any diagonal).";

export const OPEN_KING_LAW_DESC =
  "Every board, one of your pieces starts already a King (moves 1 square any diagonal).";

export const EXTRA_YOU_DESC = "You start every board with 1 extra player piece.";

export const EXTRA_YOU_DAILY_DESC = "You sit 1 extra player piece on this board.";

export const EXTRA_THEM_DESC = "The Enemy sits 1 extra piece on this board.";

export const HOUSE_KING_DESC = "The Enemy starts with 1 extra King (a normal King: 1 square any diagonal).";

export const THIRD_OOPS_DESC = "You get 3 Oops take-backs today instead of 2.";

export const ONE_OOPS_DESC = "You get 1 Oops take-back today instead of 2.";

export const BUDDY_UP_DESC =
  "After each of your captures, if your back row (the edge you started from) has an empty dark square, a new player piece sits there.";

export const SECOND_CHANCE_DESC =
  "Once this climb, if you lose every piece, one King comes back on an empty square of the far row. It already hops every diagonal, including back toward home.";

export const HOP_PARTY_DESC =
  "Every 4 captures this climb, one random non-King player piece becomes a King.";

export const FAR_JUMP_DESC =
  "Once each turn, one regular piece (not a King) may jump farther: over an Enemy, skip the next square if it is empty, and land on the next dark square.";

export const DOUBLE_CROWN_DESC =
  "When one of your pieces becomes a King, a regular piece next to it becomes a King too.";

export const TRAPDOOR_DESC =
  "Once this board, after you capture, the square the Enemy sat on becomes a hole. Nobody may sit there. Jump over it onto the star past it.";

export const PICK_JUMP_BACK = "Your maples may jump all 4 diagonals.";
export const PICK_SUPER_KING = "Your Kings may slide any empty squares on a diagonal.";
export const PICK_BUDDY_UP = "After you capture, a new maple sits on your back row if a dark square is empty.";
export const PICK_SECOND_CHANCE = "Once this climb, if you lose every piece, one King comes back on the far row.";
export const PICK_STARTING_KING = "One of your maples starts every board already a King.";
export const PICK_EXTRA_PIECE = "You start every board with one extra maple.";
export const PICK_HOP_PARTY = "Every 4 captures this climb, one maple becomes a King.";
export const PICK_FAR_JUMP = "Once a turn, one regular maple may jump farther.";
export const PICK_DOUBLE_CROWN = "When you king, a neighbor maple becomes a King too.";
export const PICK_TRAPDOOR = "Once a board, the square you capture on becomes a hole.";
export const PICK_SCOUT = "One maple starts closer to the middle.";
export const PICK_WIDE_POND = "Boards are 10×10.";
export const PICK_NAP_TIME = "After you capture, the Enemy skips their next hop.";
export const PICK_BACK_2_BACK = "You hop twice before the Enemy answers.";

export const SCOUT_DESC = "One of your regular pieces starts closer to the middle.";

export const CHASE_START = `Only Kings left. Jump within ${CHASE_HOPS} turns or whoever has more pieces wins.`;
export const CHASE_END_MORE = "Too long a chase. Most pieces win.";
export const CHASE_END_TIE = "Too long a chase. Nobody jumped.";
export const CHASE_HOLD_OOPS = "Too long a chase. Oops that hop — or that's the game.";

export function chaseShouldResolve(quiet: number, armed: boolean): boolean {
  return armed && quiet >= CHASE_HOPS;
}

export function chaseHint(quiet: number): string {
  const left = Math.max(0, CHASE_HOPS - quiet);
  if (left <= 0) return CHASE_END_MORE;
  if (left === 1) return "Last turn with no jump — then most pieces win.";
  return `${left} turns with no jump, or most pieces win.`;
}
export const JUMP_HOW =
  "A gold star shows a jump you can make. Land on it to hop over that Enemy and capture them, or slide onto a spot the other way.";

export const STAR_ELSEWHERE = "This maple only has spots. Another maple has the star.";

export type HopCue = {
  coachOn: boolean;
  thinking: boolean;
  canOops: boolean;
  wiped: boolean;
  chaseOver: boolean;
  locked: boolean;
  yourTurn: boolean;
  selected: boolean;
  anyJump: boolean;
  selectedJump: boolean;
  overHole: boolean;
};

/** HUD line for your hop. Status follows the selected maple, not every star on the felt. */
export function hopStatus(c: HopCue): string {
  if (c.coachOn) return JUMP_HOW;
  if (c.thinking) return c.canOops ? "Enemy… Oops still works." : "The Enemy is hopping…";
  if (c.chaseOver) return c.canOops ? CHASE_HOLD_OOPS : CHASE_END_MORE;
  if (c.wiped) return c.canOops ? "You're out. Tap Oops to undo — or that's the game." : "You're out.";
  if (c.locked) return "Keep capturing, slide onto a spot, or Skip jump.";
  if (c.selected && c.anyJump && !c.selectedJump) return STAR_ELSEWHERE;
  if (c.anyJump) {
    return c.selected
      ? "Land on the star to capture. Slide onto a spot to go another way."
      : "A jump is ready — land on the star to capture, or slide onto a spot.";
  }
  if (c.selected) {
    return c.overHole ? "Jump over the pit onto the star — or drop onto the pit." : "Slide onto a spot.";
  }
  if (c.yourTurn) {
    return c.canOops
      ? "Slide onto a spot, or jump an Enemy — or Oops that hop."
      : "Slide onto a spot, or jump an Enemy.";
  }
  return "Wait.";
}

export function boardOpenLog(_name: string, _blurb: string): string | null {
  return null;
}

/** How to Play. A gold star is a landing marker, not a thing you take. Stars (capital S) are the boost from captures. */
export const HOW_RULES: { title: string; body: string }[] = [
  {
    title: "Slide or jump.",
    body: "Slide 1 square onto a cream spot. When you can jump an Enemy, a gold star appears on the square you would land on. Land on that star to hop over them and capture. You can slide onto a spot instead. A black pit cannot be sat on — land on the star past it to jump over. Tap the piece, then the square, if you like.",
  },
  {
    title: "Jumps are a choice.",
    body: "You never have to jump. After you capture, you may jump again, slide onto a spot, or tap Skip jump. Reach the far row to become a King. A King steps 1 square on any diagonal.",
  },
  {
    title: "Six boards to the Crown.",
    body: "New climb is a new path. Continue is the same climb you paused. Endless keeps going if you keep winning. You hold three treats, then swap one after each later board.",
  },
  {
    title: "Name and Stars.",
    body: "Type a name on the title if you want it on today's Daily list and the Endless list. Captures become Stars — a little boost for the next First Hop, even if you lose.",
  },
];

export function climbHintLine(dailyName: string): string {
  return `New climb is yours. Daily is ${dailyName}.`;
}

export function climbLoseBlurb(chaseOver: boolean): string {
  return chaseOver
    ? "Too long a chase. Most pieces win. Stars from this try make the next First Hop a little kinder."
    : "Your last player piece hopped off the board. Stars from this try make the next First Hop a little kinder.";
}

export function pauseLead(mode: "run" | "daily" | "endless"): string {
  if (mode === "daily") return "This board isn't saved. The climb still waits on Home.";
  if (mode === "endless") {
    return "This run isn't the climb. Go home and Endless waits on this phone. The climb still waits on Home too.";
  }
  return "Nobody hops until you come back. Go home and this climb waits on this device. Sign in and it can wait on another phone too.";
}

export function captureCount(n: number): string {
  return n === 1 ? "1 capture" : `${n} captures`;
}

export function roundCount(n: number): string {
  return n === 1 ? "1 round" : `${n} rounds`;
}

/** Old climbs stored File / pip cards. First Hop no longer shows extra felt cards. */
export function sanitizeFeltCopy(mod: FeltMod): FeltMod {
  const title =
    mod.title === "Left File" ? "Left side" : mod.title === "Right File" ? "Right side" : mod.title;
  const desc = mod.desc
    .replace(/slide a pip/gi, "slide onto a spot")
    .replace(/\bpips\b/gi, "spots")
    .replace(/\bpip\b/gi, "spot");
  return { ...mod, title, desc };
}

export function climbFeltMods(boardIndex: number, boardName: string, mods: FeltMod[]): FeltMod[] {
  if (boardIndex === 0 && boardName === "First Hop") return [];
  return mods.map(sanitizeFeltCopy);
}

export function oopsLabel(oopsLeft: number, ready: boolean): string {
  if (oopsLeft <= 0) return "Oops used";
  if (!ready) return "Oops";
  return `Oops ×${oopsLeft}`;
}

/** Null means wait for Oops or That's the game — do not steal the take-back. */
export function wipeAutoEndMs(canUndo: boolean): number | null {
  return canUndo ? null : 700;
}

export const FIRST_JUMP_DESC =
  "One of your pieces can jump an Enemy right away. Capture on that star if you want, or slide onto a spot. You do not have to take them.";

export const RACE_DESC =
  "Everyone starts closer to the middle. You still sit on the bottom, the Enemy on top. Men walk toward the far edge from their camp and only become King there — never in the rows they started on.";

export const CLOSE_QUARTERS_DESC =
  "Everyone starts 1 row closer to the middle than a normal setup. Less room to hide.";

export const STAGGER_DESC = "Pieces sit on 3 rows each, not a flat 2-row back rank.";

export const HOLE_ONE_DESC = "1 pit. Nobody may land on it. Jump over it onto the star past it.";

export function holesDesc(n: number): string {
  return `${n} pits. Nobody may land on them. Jump over a pit onto the star past it.`;
}

export function enemyKingsDesc(n: number): string {
  if (n === 1) return "The Enemy starts with 1 King. A normal King steps 1 square on any diagonal.";
  return `The Enemy starts with ${n} Kings. A normal King steps 1 square on any diagonal.`;
}

export function laneDesc(lane: "left" | "right" | "center"): string {
  if (lane === "left") return "Both sides start on the left side of the board.";
  if (lane === "right") return "Both sides start on the right side of the board.";
  return "Both sides start in the middle of the board.";
}

export const OPPOSITE_WINGS_DESC =
  "You start on one half of the board, the Enemy on the other half.";

export const FIRST_LANE_LEFT = "The opening star sits on the left side of the board. A New climb can move it.";
export const FIRST_LANE_RIGHT = "The opening star sits on the right side of the board. A New climb can move it.";
export const FIRST_LANE_CENTER = "The opening star sits in the middle of the board. A New climb can move it.";
