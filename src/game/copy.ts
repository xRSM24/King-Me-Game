/** Shared modifier copy. Keep numbers in lockstep with rules.ts. */

import { CHASE_HOPS } from "./types.ts";

/** A normal King steps 1 diagonal square. Flying Kings may ride the empty diagonal (k = 1..7 on an 8-board). */
export const SUPER_KING_DESC =
  "Your Kings may slide any number of empty squares on a diagonal — up to 7. A normal King only steps 1 square.";

export const LONG_KING_DESC =
  "Enemy Kings may slide any number of empty squares on a diagonal — up to 7. A normal King only steps 1 square.";

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
export const PICK_SUPER_KING = "Your Kings may slide up to 7 empty squares on a diagonal.";
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

export const CHASE_START = `Only Kings left. Jump in ${CHASE_HOPS} hops or whoever has more pieces wins.`;
export const CHASE_END_MORE = "Too long a chase. Most pieces win.";
export const CHASE_END_TIE = "Too long a chase. Nobody jumped.";

export function chaseHint(quiet: number): string {
  const left = Math.max(0, CHASE_HOPS - quiet);
  if (left <= 0) return CHASE_END_MORE;
  if (left === 1) return "Last hop with no jump — then most pieces win.";
  return `Jump in ${left} hops or most pieces win.`;
}
export const JUMP_HOW =
  "A star means a jump over an Enemy. You do not have to take it — slide a pip the other way if you want.";

export const STAR_ELSEWHERE = "This maple only has pips. Another maple has the star.";

export type HopCue = {
  coachOn: boolean;
  thinking: boolean;
  canOops: boolean;
  wiped: boolean;
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
  if (c.wiped) return c.canOops ? "You're out. Tap Oops to undo — or that's the game." : "You're out.";
  if (c.locked) return "Keep capturing, slide a pip, or Skip jump.";
  if (c.selected && c.anyJump && !c.selectedJump) return STAR_ELSEWHERE;
  if (c.anyJump) {
    return c.selected
      ? "The star is the jump. Slide a pip if you want to go another way."
      : "A jump is ready — you do not have to take it.";
  }
  if (c.selected) {
    return c.overHole ? "Jump over the pit onto the star — or drop onto the pit." : "Slide onto a pip.";
  }
  if (c.yourTurn) {
    return c.canOops ? "Slide a pip, or jump an Enemy — or Oops that hop." : "Slide a pip, or jump an Enemy.";
  }
  return "Wait.";
}

export function boardOpenLog(_name: string, _blurb: string): string | null {
  return null;
}

export function climbHintLine(dailyName: string): string {
  return `New climb is yours. Daily is ${dailyName}.`;
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
  "One of your pieces can jump an Enemy right away. Capture on that star if you want, or slide a pip. You do not have to take them.";

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
