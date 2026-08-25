import { isWalkable } from "./dungeon.ts";
import type { TileKind } from "./types.ts";

export const BODY_R = 0.28;

export function tileBlocked(tiles: TileKind[][], x: number, y: number): boolean {
  return !isWalkable(tiles, Math.floor(x), Math.floor(y));
}

export function canStand(tiles: TileKind[][], x: number, y: number, r = BODY_R): boolean {
  return (
    !tileBlocked(tiles, x - r, y - r) &&
    !tileBlocked(tiles, x + r, y - r) &&
    !tileBlocked(tiles, x - r, y + r) &&
    !tileBlocked(tiles, x + r, y + r)
  );
}

export function slide(
  tiles: TileKind[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  r = BODY_R,
): { x: number; y: number } {
  const nx = x + dx;
  const ny = y + dy;
  if (canStand(tiles, nx, ny, r)) return { x: nx, y: ny };
  if (dx !== 0 && canStand(tiles, nx, y, r)) return { x: nx, y };
  if (dy !== 0 && canStand(tiles, x, ny, r)) return { x, y: ny };
  return { x, y };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
