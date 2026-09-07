import type { Laws } from "./types.ts";
import {
  PICK_BACK_2_BACK,
  PICK_BUDDY_UP,
  PICK_DOUBLE_CROWN,
  PICK_EXTRA_PIECE,
  PICK_FAR_JUMP,
  PICK_HOP_PARTY,
  PICK_JUMP_BACK,
  PICK_NAP_TIME,
  PICK_SCOUT,
  PICK_SECOND_CHANCE,
  PICK_STARTING_KING,
  PICK_SUPER_KING,
  PICK_TRAPDOOR,
  PICK_WIDE_POND,
} from "./copy.ts";

export interface LawDef {
  id: keyof Laws;
  name: string;
  desc: string;
  icon: string;
  scene: string;
}

export const LAW_DEFS: LawDef[] = [
  {
    id: "backJump",
    name: "Jump Back",
    desc: PICK_JUMP_BACK,
    icon: "↩️",
    scene: "backJump",
  },
  {
    id: "flyingKings",
    name: "Super King",
    desc: PICK_SUPER_KING,
    icon: "👑",
    scene: "flyingKings",
  },
  {
    id: "recruit",
    name: "Buddy Up",
    desc: PICK_BUDDY_UP,
    icon: "🤝",
    scene: "recruit",
  },
  {
    id: "lastRites",
    name: "Second Chance",
    desc: PICK_SECOND_CHANCE,
    icon: "💖",
    scene: "lastRites",
  },
  {
    id: "openKing",
    name: "Starting King",
    desc: PICK_STARTING_KING,
    icon: "⭐",
    scene: "openKing",
  },
  {
    id: "extraMan",
    name: "Extra Piece",
    desc: PICK_EXTRA_PIECE,
    icon: "➕",
    scene: "extraMan",
  },
  {
    id: "hopCrown",
    name: "Hop Party",
    desc: PICK_HOP_PARTY,
    icon: "🎉",
    scene: "hopCrown",
  },
  {
    id: "farJump",
    name: "Far Jump",
    desc: PICK_FAR_JUMP,
    icon: "🦘",
    scene: "farJump",
  },
  {
    id: "doubleCrown",
    name: "Double Crown",
    desc: PICK_DOUBLE_CROWN,
    icon: "✨",
    scene: "doubleCrown",
  },
  {
    id: "trapdoor",
    name: "Trapdoor",
    desc: PICK_TRAPDOOR,
    icon: "🕳️",
    scene: "trapdoor",
  },
  {
    id: "scout",
    name: "Scout",
    desc: PICK_SCOUT,
    icon: "🔭",
    scene: "scout",
  },
  {
    id: "widePond",
    name: "Wide Pond",
    desc: PICK_WIDE_POND,
    icon: "🏞️",
    scene: "widePond",
  },
  {
    id: "napTime",
    name: "Nap Time",
    desc: PICK_NAP_TIME,
    icon: "😴",
    scene: "napTime",
  },
  {
    id: "back2Back",
    name: "Back 2 Back",
    desc: PICK_BACK_2_BACK,
    icon: "✌️",
    scene: "back2Back",
  },
];

export function unusedLaws(owned: Laws): LawDef[] {
  return LAW_DEFS.filter((d) => !owned[d.id]);
}
