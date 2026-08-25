import type { IdentityId } from "./types.ts";

export interface IdentityDef {
  id: IdentityId;
  name: string;
  title: string;
  color: string;
  glow: string;
  damage: number;
  ranged: number;
  hp: number;
  gold: number;
  active: string;
  echo: string;
  blurb: string;
  unlockFloor: number;
  playable: boolean;
}

export const IDENTITIES: Record<IdentityId, IdentityDef> = {
  vagabond: {
    id: "vagabond",
    name: "Vagabond",
    title: "The First Face",
    color: "#c4b39a",
    glow: "#7a6a52",
    damage: 1,
    ranged: 0,
    hp: 2,
    gold: 2,
    active: "Scrounge — once a floor, wait to pocket 1 gold.",
    echo: "Harvests yield +1 gold.",
    blurb: "A nobody with a knife. Everyone starts here. Most end here too.",
    unlockFloor: 1,
    playable: true,
  },
  rat: {
    id: "rat",
    name: "Rat",
    title: "Filth With a Pulse",
    color: "#d48962",
    glow: "#7a3e28",
    damage: 1,
    ranged: 0,
    hp: 1,
    gold: 1,
    active: "Skitter — dash two tiles. Slip through enemies.",
    echo: "20% chance a hit misses the stack entirely.",
    blurb: "It fits through anything. Including you.",
    unlockFloor: 1,
    playable: true,
  },
  guard: {
    id: "guard",
    name: "Guard",
    title: "Paid to Stand Still",
    color: "#8aa4c4",
    glow: "#3d5270",
    damage: 2,
    ranged: 0,
    hp: 3,
    gold: 3,
    active: "Brace — weave a stitch. Cooldown 5 turns.",
    echo: "Begin each floor with a stitch if you have none.",
    blurb: "Helmet, pike, a wage. The stack likes people who don't flinch.",
    unlockFloor: 1,
    playable: true,
  },
  archer: {
    id: "archer",
    name: "Archer",
    title: "Keep Your Distance",
    color: "#7db86c",
    glow: "#355a30",
    damage: 1,
    ranged: 2,
    hp: 2,
    gold: 3,
    active: "Loose — fire in the facing line, range 3.",
    echo: "Ranged shots reach one tile farther.",
    blurb: "Never lets you close. You shouldn't either.",
    unlockFloor: 2,
    playable: true,
  },
  thief: {
    id: "thief",
    name: "Thief",
    title: "Wanted: Your Face",
    color: "#c48ad6",
    glow: "#5a3870",
    damage: 1,
    ranged: 0,
    hp: 2,
    gold: 4,
    active: "Flip — swap with the enemy you face.",
    echo: "Kills drop +2 gold.",
    blurb: "Takes the coin, then the name, then the bones underneath.",
    unlockFloor: 3,
    playable: true,
  },
  priest: {
    id: "priest",
    name: "Priest",
    title: "The Thread Will Hold",
    color: "#ead58a",
    glow: "#7a6a30",
    damage: 1,
    ranged: 0,
    hp: 3,
    gold: 3,
    active: "Bind — weave a stitch. Once per floor.",
    echo: "When a soul is torn away, 40% chance it falls to the bottom instead.",
    blurb: "Swears the stitches are a sacrament. The stitches disagree.",
    unlockFloor: 4,
    playable: true,
  },
  pyromancer: {
    id: "pyromancer",
    name: "Pyromancer",
    title: "The Lab Accident",
    color: "#e8833a",
    glow: "#7a3a12",
    damage: 2,
    ranged: 0,
    hp: 3,
    gold: 4,
    active: "Cinder — ignite three tiles in a line.",
    echo: "Melee hits leave fire on the target's tile.",
    blurb: "It learned to walk. It did not learn to stop.",
    unlockFloor: 5,
    playable: true,
  },
  knight: {
    id: "knight",
    name: "Knight",
    title: "Honor Is a Story",
    color: "#e06070",
    glow: "#6a2030",
    damage: 3,
    ranged: 0,
    hp: 4,
    gold: 5,
    active: "Cleave — strike every adjacent enemy.",
    echo: "Once per run, a fatal blow leaves you as a Vagabond instead.",
    blurb: "They tell the story before they fall. Then you wear the story.",
    unlockFloor: 5,
    playable: true,
  },
  hollow: {
    id: "hollow",
    name: "The Hollow",
    title: "The First Wearer",
    color: "#c8b6ff",
    glow: "#4a387a",
    damage: 2,
    ranged: 0,
    hp: 8,
    gold: 0,
    active: "It wears whatever you refused.",
    echo: "There is no echo. It is the echo.",
    blurb: "Every face you sold is still in the room. It learned them from you.",
    unlockFloor: 6,
    playable: false,
  },
};

export const PLAYABLE: IdentityId[] = [
  "vagabond",
  "rat",
  "guard",
  "archer",
  "thief",
  "priest",
  "pyromancer",
  "knight",
];

export function def(id: IdentityId): IdentityDef {
  return IDENTITIES[id];
}

export function powerName(id: IdentityId): string {
  switch (id) {
    case "vagabond":
      return "Scrounge";
    case "rat":
      return "Skitter";
    case "guard":
      return "Brace";
    case "archer":
      return "Loose";
    case "thief":
      return "Flip";
    case "priest":
      return "Bind";
    case "pyromancer":
      return "Cinder";
    case "knight":
      return "Cleave";
    case "hollow":
      return "Remember";
  }
}

export function wearLine(id: IdentityId): string {
  const n = IDENTITIES[id].name;
  switch (id) {
    case "rat":
      return "You pull the Rat over your bones. It fits.";
    case "guard":
      return "The Guard's helm drops over your eyes. The pike is already in your hand.";
    case "archer":
      return "You nock a stolen life. The bowstring tastes like someone else's patience.";
    case "thief":
      return "The Thief's grin settles on your mouth. You don't remember agreeing.";
    case "priest":
      return "Gold thread cinches around the stack. The Priest starts praying in your throat.";
    case "pyromancer":
      return "Heat climbs the stack. You learn a new way to be a problem.";
    case "knight":
      return "Plate slams shut. Honor is heavy. You can put it down later.";
    case "hollow":
      return "You wear the first wearer. The stack finally has a bottom.";
    default:
      return `You wear the ${n}.`;
  }
}

export function harvestLine(id: IdentityId): string {
  const n = IDENTITIES[id].name;
  return `You strip the ${n} for coin. Somewhere below, something keeps the face.`;
}

export function popLine(id: IdentityId): string {
  return `The ${IDENTITIES[id].name} is torn off the stack.`;
}

export function enemyPool(floor: number): IdentityId[] {
  const pool: IdentityId[] = ["rat", "rat", "vagabond"];
  if (floor >= 1) pool.push("rat", "guard");
  if (floor >= 2) pool.push("guard", "archer", "rat");
  if (floor >= 3) pool.push("archer", "thief", "guard");
  if (floor >= 4) pool.push("thief", "priest", "archer");
  if (floor >= 5) pool.push("pyromancer", "knight", "priest", "thief");
  return pool;
}
