export type IdentityId =
  | "vagabond"
  | "rat"
  | "guard"
  | "archer"
  | "thief"
  | "priest"
  | "pyromancer"
  | "knight"
  | "hollow";

export type TileKind = "wall" | "floor" | "stairs" | "shrine" | "shop";

export type Dir = "up" | "down" | "left" | "right";

export type RoomKind =
  | "start"
  | "combat"
  | "treasure"
  | "shrine"
  | "shop"
  | "elite"
  | "exit"
  | "boss";

export type Screen =
  | "title"
  | "how"
  | "codex"
  | "playing"
  | "pause"
  | "end";

export type PlayPhase =
  | "playing"
  | "decision"
  | "shop"
  | "shrine"
  | "enemies"
  | "dead"
  | "won";

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  kind: RoomKind;
  pathIndex: number;
}

export interface Player {
  x: number;
  y: number;
  facing: Dir;
  stack: IdentityId[];
  iFrames: number;
  vx: number;
  vy: number;
  gait: number;
  recoil: number;
  armed: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  id: IdentityId;
  hp: number;
  maxHp: number;
  facing: Dir;
  stun: number;
  flash: number;
  elite: boolean;
  atkCd: number;
  pathIndex: number;
  gait: number;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  color: string;
  r: number;
}

export type Fx =
  | { kind: "shake"; mag: number }
  | { kind: "burst"; x: number; y: number; color: string; n?: number }
  | { kind: "text"; x: number; y: number; text: string; color: string }
  | { kind: "banner"; text: string; sub?: string; color: string }
  | { kind: "sfx"; name: string }
  | { kind: "flash"; color: string }
  | { kind: "hitstop"; ms: number }
  | { kind: "floorTitle" };

export interface RunState {
  seed: number;
  floor: number;
  turn: number;
  phase: PlayPhase;
  tiles: TileKind[][];
  w: number;
  h: number;
  rooms: Room[];
  player: Player;
  enemies: Enemy[];
  goldMap: Record<string, number>;
  fire: Record<string, number>;
  seen: boolean[][];
  vis: boolean[][];
  blood: Record<string, number>;
  grave: IdentityId[];
  log: string[];
  fx: Fx[];
  pending: Enemy | null;
  maxStack: number;
  memories: IdentityId[];
  ash: Partial<Record<IdentityId, number>>;
  discovered: string[];
  worn: IdentityId[];
  kills: number;
  gold: number;
  stitches: number;
  priestBound: boolean;
  braceCd: number;
  scroungeUsed: boolean;
  knightOathUsed: boolean;
  interactLock: boolean;
  movedThisTurn: boolean;
  isDaily: boolean;
  shrineSpent: Record<string, boolean>;
  shopSpent: Record<string, boolean>;
  extraSlotBought: boolean;
  hollowMimic: IdentityId | null;
  hollowMimicTime: number;
  goalNeed: number;
  goalHave: number;
  exitX: number;
  exitY: number;
  stairsOpen: boolean;
  atkCd: number;
  powerCd: number;
  fireClock: number;
  moveTarget: { x: number; y: number } | null;
  shots: Shot[];
  runXp: number;
  spark: number;
  fireHeld: number;
  pathProgress: number;
}

export interface Meta {
  remembrance: number;
  seen: IdentityId[];
  resonances: string[];
  wins: number;
  bestFloor: number;
  bestGold: number;
  runs: number;
  perks: string[];
  usurper: boolean;
  mute: boolean;
  shake: boolean;
  spark: number;
}

export const DIRS: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const DIR_LIST: Dir[] = ["up", "down", "left", "right"];

export function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function dirFromDelta(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

export function opposite(d: Dir): Dir {
  if (d === "up") return "down";
  if (d === "down") return "up";
  if (d === "left") return "right";
  return "left";
}

export const PATH_NAMES = [
  "Snack Cellar",
  "Clank Bend",
  "Silly Gallery",
  "Sock Crossroads",
  "Chili Labs",
  "Bubble Baths",
  "Pew Attic",
  "King Empty's Fort",
];

export const FLOOR_NAMES = [
  "",
  ...PATH_NAMES,
];

export const TILE = 48;
export const MAX_STITCH = 3;
export const VISION = 11;
export const LAST_FLOOR = 8;
export const PATH_END = 7;
export const RUN_GOAL = "Follow the trail to King Empty";
