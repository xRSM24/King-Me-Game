import type { Laws } from "./types.ts";

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
    desc: "Player pieces may jump backward too.",
    icon: "↩️",
  },
  {
    id: "flyingKings",
    name: "Super King",
    desc: "Player Kings slide as far as they want on an empty diagonal.",
    icon: "👑",
  },
  {
    id: "recruit",
    name: "Buddy Up",
    desc: "Each capture tries to seat a new player piece on your back row.",
    icon: "🤝",
  },
  {
    id: "lastRites",
    name: "Second Chance",
    desc: "Once per climb, if you lose everyone, a King pops back on.",
    icon: "💖",
  },
  {
    id: "openKing",
    name: "Start as King",
    desc: "Every board, one player piece starts as a King.",
    icon: "⭐",
  },
  {
    id: "extraMan",
    name: "Extra Piece",
    desc: "You start every board with one extra player piece.",
    icon: "➕",
  },
  {
    id: "freeJump",
    name: "Skip the Jump",
    desc: "You don't have to jump. The Enemy still does.",
    icon: "🎈",
  },
  {
    id: "hopCrown",
    name: "Hop Party",
    desc: "Every 4 captures this climb, a random player piece becomes a King.",
    icon: "🎉",
  },
];

export function unusedLaws(owned: Laws): LawDef[] {
  return LAW_DEFS.filter((d) => !owned[d.id]);
}
