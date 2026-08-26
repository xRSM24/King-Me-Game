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
    desc: "Your men may jump backward too. Boing!",
    icon: "↩️",
  },
  {
    id: "flyingKings",
    name: "Super King",
    desc: "Your kings slide as far as they want on an empty diagonal.",
    icon: "👑",
  },
  {
    id: "recruit",
    name: "Buddy Up",
    desc: "Each capture tries to seat a new friend on your back row.",
    icon: "🤝",
  },
  {
    id: "lastRites",
    name: "Second Chance",
    desc: "Once per run, if you lose everyone, a king pops back on.",
    icon: "💖",
  },
  {
    id: "openKing",
    name: "Start Crowned",
    desc: "Every board, one of your men already wears a crown.",
    icon: "⭐",
  },
  {
    id: "extraMan",
    name: "Extra Man",
    desc: "You start every board with one extra checker.",
    icon: "➕",
  },
  {
    id: "freeJump",
    name: "Skip the Jump",
    desc: "You don't have to jump. The Crown still does.",
    icon: "🎈",
  },
  {
    id: "hopCrown",
    name: "Hop Party",
    desc: "Every 4 captures this run, a random man of yours is crowned.",
    icon: "🎉",
  },
];

export function unusedLaws(owned: Laws): LawDef[] {
  return LAW_DEFS.filter((d) => !owned[d.id]);
}
