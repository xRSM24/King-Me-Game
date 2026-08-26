import type { Laws } from "./types.ts";

export interface LawDef {
  id: keyof Laws;
  name: string;
  desc: string;
}

export const LAW_DEFS: LawDef[] = [
  {
    id: "backJump",
    name: "Backbite",
    desc: "Your men may jump backward, like little kings who forgot the rest.",
  },
  {
    id: "flyingKings",
    name: "Long Crown",
    desc: "Your kings slide any distance along an empty diagonal.",
  },
  {
    id: "recruit",
    name: "Press Gang",
    desc: "Each capture tries to seat a new man on your back row.",
  },
  {
    id: "lastRites",
    name: "Last Rites",
    desc: "Once per run, wiping out saves one man as a king on your back row.",
  },
  {
    id: "openKing",
    name: "Borrowed Crown",
    desc: "Each board, your first man starts already crowned.",
  },
  {
    id: "extraMan",
    name: "Spare Checker",
    desc: "You start every board with one extra man.",
  },
  {
    id: "freeJump",
    name: "Mercy Rule",
    desc: "Jumps are optional for you. The Black Crown still has to hop.",
  },
  {
    id: "hopCrown",
    name: "Hop Fever",
    desc: "Every 4 captures this run, a random man of yours is crowned.",
  },
];

export function unusedLaws(owned: Laws): LawDef[] {
  return LAW_DEFS.filter((d) => !owned[d.id]);
}
