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
    name: "Pip",
    title: "Pajama Ghost",
    color: "#ffe566",
    glow: "#6ec8ff",
    damage: 1,
    ranged: 0,
    hp: 2,
    gold: 2,
    active: "Pin Pop — hold Space. One pin the way you face.",
    echo: "Snack harvests give +1 coin.",
    blurb: "A round little ghost in stripey PJs. The costumes go ON Pip. That's the whole trick.",
    unlockFloor: 1,
    playable: true,
  },
  rat: {
    id: "rat",
    name: "Squeak",
    title: "Snack Bandit",
    color: "#ff9a62",
    glow: "#ff6b3a",
    damage: 1,
    ranged: 0,
    hp: 1,
    gold: 1,
    active: "Crumb Fan — hold Space. Three snack crumbs in a spread.",
    echo: "20% chance a bonk misses you completely. Sneaky.",
    blurb: "A hoodie with ears. Smells like cheese. Zoomy.",
    unlockFloor: 1,
    playable: true,
  },
  guard: {
    id: "guard",
    name: "Sir Clank",
    title: "Saucepan Knight",
    color: "#8ec4ff",
    glow: "#4a7ab8",
    damage: 2,
    ranged: 0,
    hp: 3,
    gold: 3,
    active: "Pan Blast — hold Space. A close shotgun of saucepan sparks.",
    echo: "Start each floor with a Lucky Pin if you have none.",
    blurb: "Helmet: a saucepan. Job: stand there. Personality: saucepan.",
    unlockFloor: 1,
    playable: true,
  },
  archer: {
    id: "archer",
    name: "Twang",
    title: "Rubber-Band Kid",
    color: "#7ed957",
    glow: "#3d8a2a",
    damage: 1,
    ranged: 2,
    hp: 2,
    gold: 3,
    active: "Rubber Bolt — hold Space. One fast bolt, extra sting.",
    echo: "Pew shots fly one tile farther.",
    blurb: "Never lets you hug them. You shouldn't either. Pew pew.",
    unlockFloor: 2,
    playable: true,
  },
  thief: {
    id: "thief",
    name: "Nib",
    title: "Pocket Inspector",
    color: "#d07cff",
    glow: "#7a38a8",
    damage: 1,
    ranged: 0,
    hp: 2,
    gold: 4,
    active: "Sneak X — hold Space. Two diagonal shots. Sneaky angles.",
    echo: "Bonks drop +2 coins.",
    blurb: "A raccoon mask and zero indoor voice. Yours now.",
    unlockFloor: 3,
    playable: true,
  },
  priest: {
    id: "priest",
    name: "Bubbles",
    title: "Soap Wizard",
    color: "#9ae8ff",
    glow: "#4aa0c8",
    damage: 1,
    ranged: 0,
    hp: 3,
    gold: 3,
    active: "Soap Ring — hold Space. Bubbles fly in every direction.",
    echo: "When a costume flies off, 40% chance it just falls to the bottom of the pile.",
    blurb: "Casts Bless. Also casts Bubbles. Same spell, honestly.",
    unlockFloor: 4,
    playable: true,
  },
  pyromancer: {
    id: "pyromancer",
    name: "Chili",
    title: "Too Spicy",
    color: "#ff8a3a",
    glow: "#d44500",
    damage: 2,
    ranged: 0,
    hp: 3,
    gold: 4,
    active: "Chili Stream — hold Space. Twin spicy jets. Fast and hot.",
    echo: "Your bonks leave a spicy tile behind.",
    blurb: "A pepper with legs. Do not lick.",
    unlockFloor: 5,
    playable: true,
  },
  knight: {
    id: "knight",
    name: "Sir Boop",
    title: "Cardboard Champion",
    color: "#ff7aa0",
    glow: "#c04068",
    damage: 3,
    ranged: 0,
    hp: 4,
    gold: 5,
    active: "Boop Cross — hold Space. Four shots, plus-sign style.",
    echo: "Once per run, a knockout sends you home as Pip instead of ending the pile.",
    blurb: "A taped-on visor, a cardboard sword, and a very serious BOOP.",
    unlockFloor: 5,
    playable: true,
  },
  hollow: {
    id: "hollow",
    name: "King Empty",
    title: "Boss of the Lost Hats",
    color: "#c8b6ff",
    glow: "#7a5ad0",
    damage: 2,
    ranged: 0,
    hp: 8,
    gold: 0,
    active: "Empty Ring — hold Space. A ring of leftover hats.",
    echo: "King Empty is the leftover pile.",
    blurb: "A giant empty raincoat with googly eyes. It's made of outfits you skipped.",
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
      return "Pin Pop";
    case "rat":
      return "Crumb Fan";
    case "guard":
      return "Pan Blast";
    case "archer":
      return "Rubber Bolt";
    case "thief":
      return "Sneak X";
    case "priest":
      return "Soap Ring";
    case "pyromancer":
      return "Chili Stream";
    case "knight":
      return "Boop Cross";
    case "hollow":
      return "Empty Ring";
  }
}

export function wearLine(id: IdentityId): string {
  switch (id) {
    case "rat":
      return "You yank on the Squeak hoodie. The ears flop. Perfect.";
    case "guard":
      return "Saucepan: ON. You are legally Sir Clank now.";
    case "archer":
      return "Twang's hood smells like acorns. Pew pew unlocked.";
    case "thief":
      return "The raccoon mask sticks. You immediately want snacks.";
    case "priest":
      return "Bubbles puts a halo on you. It squeaks.";
    case "pyromancer":
      return "You are Chili. Everything is spicy. Including feelings.";
    case "knight":
      return "Cardboard visor SLAM. Sir Boop reporting for duty.";
    case "hollow":
      return "You wear King Empty like a giant raincoat. Googly eyes included.";
    default:
      return `You put on the ${IDENTITIES[id].name} costume.`;
  }
}

export function harvestLine(id: IdentityId): string {
  return `You take ${IDENTITIES[id].name}'s snacks. King Empty keeps the costume.`;
}

export function popLine(id: IdentityId): string {
  return `The ${IDENTITIES[id].name} costume goes FWOOMP off the pile.`;
}

export function enemyPool(path: number): IdentityId[] {
  const pool: IdentityId[] = ["rat", "rat", "rat", "vagabond"];
  if (path >= 1) pool.push("guard", "rat");
  if (path >= 2) pool.push("archer", "guard");
  if (path >= 3) pool.push("thief", "archer");
  if (path >= 4) pool.push("thief", "priest");
  if (path >= 5) pool.push("pyromancer", "thief", "priest");
  if (path >= 6) pool.push("knight", "pyromancer", "priest", "knight");
  return pool;
}
