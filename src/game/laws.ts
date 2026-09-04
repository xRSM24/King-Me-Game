import type { Laws } from "./types.ts";
import {
  BUDDY_UP_DESC,
  DOUBLE_CROWN_DESC,
  EXTRA_YOU_DESC,
  FAR_JUMP_DESC,
  HOP_PARTY_DESC,
  JUMP_BACK_YOU_DESC,
  OPEN_KING_LAW_DESC,
  SCOUT_DESC,
  SECOND_CHANCE_DESC,
  SUPER_KING_DESC,
  TRAPDOOR_DESC,
} from "./copy.ts";

export interface LawDef {
  id: keyof Laws;
  name: string;
  desc: string;
  icon: string;
}

export const LAW_DEFS: LawDef[] = [
  {
    id: "backJump",
    name: "Jump Back",
    desc: JUMP_BACK_YOU_DESC,
    icon: "↩️",
  },
  {
    id: "flyingKings",
    name: "Super King",
    desc: SUPER_KING_DESC,
    icon: "👑",
  },
  {
    id: "recruit",
    name: "Buddy Up",
    desc: BUDDY_UP_DESC,
    icon: "🤝",
  },
  {
    id: "lastRites",
    name: "Second Chance",
    desc: SECOND_CHANCE_DESC,
    icon: "💖",
  },
  {
    id: "openKing",
    name: "Start as King",
    desc: OPEN_KING_LAW_DESC,
    icon: "⭐",
  },
  {
    id: "extraMan",
    name: "Extra Piece",
    desc: EXTRA_YOU_DESC,
    icon: "➕",
  },
  {
    id: "hopCrown",
    name: "Hop Party",
    desc: HOP_PARTY_DESC,
    icon: "🎉",
  },
  {
    id: "farJump",
    name: "Far Jump",
    desc: FAR_JUMP_DESC,
    icon: "🦘",
  },
  {
    id: "doubleCrown",
    name: "Double Crown",
    desc: DOUBLE_CROWN_DESC,
    icon: "✨",
  },
  {
    id: "trapdoor",
    name: "Trapdoor",
    desc: TRAPDOOR_DESC,
    icon: "🕳️",
  },
  {
    id: "scout",
    name: "Scout",
    desc: SCOUT_DESC,
    icon: "🔭",
  },
];

export function unusedLaws(owned: Laws): LawDef[] {
  return LAW_DEFS.filter((d) => !owned[d.id]);
}
