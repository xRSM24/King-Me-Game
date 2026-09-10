import { LAW_DEFS } from "./laws.ts";
import { CLIMB_SKILL } from "./setup.ts";
import type { Laws } from "./types.ts";

export const ENDLESS_KIT_CAP = 3;

function isPickPoolId(id: keyof Laws): boolean {
  return LAW_DEFS.some((d) => d.id === id);
}

export function ownedLawIds(laws: Laws): (keyof Laws)[] {
  return LAW_DEFS.map((d) => d.id).filter((id) => laws[id]);
}

export function endlessTake(laws: Laws, id: keyof Laws): { laws: Laws; needsDrop: boolean } | null {
  if (!isPickPoolId(id)) return null;
  if (!(id in laws) || laws[id]) return null;
  const n = ownedLawIds(laws).length;
  if (n < ENDLESS_KIT_CAP) return { laws: { ...laws, [id]: true }, needsDrop: false };
  if (n === ENDLESS_KIT_CAP) return { laws, needsDrop: true };
  return null;
}

export function endlessSwap(laws: Laws, takeId: keyof Laws, dropId: keyof Laws): Laws | null {
  if (!isPickPoolId(takeId) || !isPickPoolId(dropId)) return null;
  if (takeId === dropId) return null;
  if (!laws[dropId] || laws[takeId]) return null;
  if (ownedLawIds(laws).length !== ENDLESS_KIT_CAP) return null;
  return { ...laws, [dropId]: false, [takeId]: true };
}

export function endlessSpecIndex(round: number): number {
  const n = Math.max(1, Math.floor(round));
  if (n <= 1) return 0;
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  if (n <= 10) return 3;
  if (n <= 16) return 4;
  return 5;
}

export function endlessLily(round: number): boolean {
  return round >= 4;
}

export function endlessSkill(round: number): number {
  return CLIMB_SKILL[endlessSpecIndex(round)] ?? 0.95;
}

export function endlessPinRounds(clears: number, kind: "home" | "lose" | "giveup"): number | null {
  if (kind === "home") return null;
  if (!Number.isInteger(clears) || clears < 1) return null;
  return Math.min(999, clears);
}
