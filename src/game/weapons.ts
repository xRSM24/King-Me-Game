import { def } from "./identities.ts";
import type { Dir, IdentityId, Shot } from "./types.ts";
import { DIRS } from "./types.ts";

/**
 * XP is split on purpose so you get stronger each death without ever going god-mode.
 *
 * - Run XP: levels the current costume gun this life only (cap 8). Dies with you.
 * - Spark: kept between runs, but each death grants less as Spark grows, and the
 *   gun bonus is an exponential curve that approaches +30% damage / +18% fire rate.
 * - Rooms never respawn, so you cannot farm a closet forever.
 * - Enemy HP and swarm size scale with trail depth faster than Spark can.
 */
export function sparkBonus(spark: number): { dmg: number; rate: number } {
  const s = Math.max(0, spark);
  return {
    dmg: 0.3 * (1 - Math.exp(-s / 85)),
    rate: 0.18 * (1 - Math.exp(-s / 110)),
  };
}

/** Spark granted on death. Shrinks as you already have a lot, so later deaths help less. */
export function sparkFromRun(runXp: number, currentSpark: number): number {
  const raw = 6 + runXp * 0.22;
  const fade = 90 / (90 + currentSpark);
  return Math.max(2, Math.round(raw * fade));
}

export function weaponLevel(runXp: number): number {
  return Math.min(8, Math.floor(Math.max(0, runXp) / 14));
}

export function xpIntoLevel(runXp: number): { have: number; need: number } {
  const lv = weaponLevel(runXp);
  if (lv >= 8) return { have: 14, need: 14 };
  const into = runXp - lv * 14;
  return { have: into, need: 14 };
}

export function weaponDmg(base: number, runXp: number, spark: number): number {
  const lv = weaponLevel(runXp);
  const run = 1 + 0.11 * lv;
  const perm = 1 + sparkBonus(spark).dmg;
  return Math.max(1, Math.round(base * run * perm));
}

export function weaponRate(base: number, runXp: number, spark: number): number {
  const lv = weaponLevel(runXp);
  const run = 1 + 0.04 * lv;
  const perm = 1 + sparkBonus(spark).rate;
  return base / (run * perm);
}

interface Gun {
  name: string;
  pattern: "forward" | "spread3" | "shotgun" | "bolt" | "diag" | "ring" | "twin" | "plus";
  dmg: number;
  rate: number;
  speed: number;
  life: number;
}

const GUNS: Record<IdentityId, Gun> = {
  vagabond: { name: "Pin Pop", pattern: "forward", dmg: 1, rate: 0.38, speed: 6.4, life: 0.9 },
  rat: { name: "Crumb Fan", pattern: "spread3", dmg: 1, rate: 0.3, speed: 6, life: 0.7 },
  guard: { name: "Pan Blast", pattern: "shotgun", dmg: 1, rate: 0.62, speed: 5.4, life: 0.55 },
  archer: { name: "Rubber Bolt", pattern: "bolt", dmg: 2, rate: 0.4, speed: 9.2, life: 1.05 },
  thief: { name: "Sneak X", pattern: "diag", dmg: 1, rate: 0.34, speed: 6.6, life: 0.75 },
  priest: { name: "Soap Ring", pattern: "ring", dmg: 1, rate: 0.7, speed: 5, life: 0.7 },
  pyromancer: { name: "Chili Stream", pattern: "twin", dmg: 2, rate: 0.28, speed: 5.8, life: 0.6 },
  knight: { name: "Boop Cross", pattern: "plus", dmg: 2, rate: 0.5, speed: 6.2, life: 0.7 },
  hollow: { name: "Empty Ring", pattern: "ring", dmg: 2, rate: 0.55, speed: 5.6, life: 0.75 },
};

export function gunOf(id: IdentityId): Gun {
  return GUNS[id];
}

function facingVec(facing: Dir): { x: number; y: number } {
  return DIRS[facing];
}

function shot(x: number, y: number, vx: number, vy: number, dmg: number, color: string, life: number, r = 0.14): Shot {
  return { x, y, vx, vy, dmg, life, color, r };
}

export function makeShots(
  id: IdentityId,
  x: number,
  y: number,
  facing: Dir,
  runXp: number,
  spark: number,
): Shot[] {
  const gun = gunOf(id);
  const dmg = weaponDmg(gun.dmg, runXp, spark);
  const color = def(id).color;
  const f = facingVec(facing);
  const spd = gun.speed;
  const life = gun.life;
  const out: Shot[] = [];
  const push = (vx: number, vy: number) => {
    const n = Math.hypot(vx, vy) || 1;
    out.push(shot(x + (vx / n) * 0.35, y + (vy / n) * 0.35, (vx / n) * spd, (vy / n) * spd, dmg, color, life));
  };

  switch (gun.pattern) {
    case "forward":
      push(f.x, f.y);
      break;
    case "spread3":
      push(f.x, f.y);
      push(f.x - f.y * 0.45, f.y + f.x * 0.45);
      push(f.x + f.y * 0.45, f.y - f.x * 0.45);
      break;
    case "shotgun":
      for (let i = -2; i <= 2; i++) {
        push(f.x - f.y * i * 0.28, f.y + f.x * i * 0.28);
      }
      break;
    case "bolt":
      out.push(shot(x + f.x * 0.4, y + f.y * 0.4, f.x * spd, f.y * spd, dmg, color, life, 0.18));
      break;
    case "diag":
      push(f.x - f.y * 0.7, f.y + f.x * 0.7);
      push(f.x + f.y * 0.7, f.y - f.x * 0.7);
      break;
    case "ring":
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        push(Math.cos(a), Math.sin(a));
      }
      break;
    case "twin":
      push(f.x - f.y * 0.18, f.y + f.x * 0.18);
      push(f.x + f.y * 0.18, f.y - f.x * 0.18);
      break;
    case "plus":
      push(1, 0);
      push(-1, 0);
      push(0, 1);
      push(0, -1);
      break;
  }
  return out;
}
