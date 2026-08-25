import { Rng } from "./rng.ts";
import type { Room, RoomKind, TileKind } from "./types.ts";
import { PATH_END, key } from "./types.ts";

export const MAP_W = 96;
export const MAP_H = 52;

export interface Dungeon {
  tiles: TileKind[][];
  rooms: Room[];
  w: number;
  h: number;
}

function emptyTiles(w: number, h: number): TileKind[][] {
  const tiles: TileKind[][] = [];
  for (let y = 0; y < h; y++) {
    const row: TileKind[] = [];
    for (let x = 0; x < w; x++) row.push("wall");
    tiles.push(row);
  }
  return tiles;
}

function carveRoom(tiles: TileKind[][], r: Room): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (tiles[y] && tiles[y]![x] !== undefined) tiles[y]![x] = "floor";
    }
  }
}

function stampFloor(tiles: TileKind[][], x: number, y: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tiles[ty] && tiles[ty]![tx] !== undefined) tiles[ty]![tx] = "floor";
    }
  }
}

function carveLine(tiles: TileKind[][], x0: number, y0: number, x1: number, y1: number): void {
  let x = x0;
  let y = y0;
  while (x !== x1) {
    stampFloor(tiles, x, y);
    x += x < x1 ? 1 : -1;
  }
  while (y !== y1) {
    stampFloor(tiles, x, y);
    y += y < y1 ? 1 : -1;
  }
  stampFloor(tiles, x, y);
}

function roomAtPos(x: number, y: number, w: number, h: number, kind: RoomKind, pathIndex: number): Room {
  return { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), kind, pathIndex };
}

function fallback(): Dungeon {
  const tiles = emptyTiles(MAP_W, MAP_H);
  const start = roomAtPos(8, 20, 12, 10, "start", 0);
  const mid = roomAtPos(40, 20, 12, 10, "combat", 3);
  const boss = roomAtPos(72, 18, 14, 12, "boss", PATH_END);
  for (const r of [start, mid, boss]) carveRoom(tiles, r);
  carveLine(tiles, start.cx, start.cy, mid.cx, mid.cy);
  carveLine(tiles, mid.cx, mid.cy, boss.cx, boss.cy);
  return { tiles, rooms: [start, mid, boss], w: MAP_W, h: MAP_H };
}

function tryTrail(rng: Rng): Dungeon | null {
  const tiles = emptyTiles(MAP_W, MAP_H);
  const spots: { x: number; y: number }[] = [
    { x: 4, y: 20 },
    { x: 18, y: 8 },
    { x: 18, y: 32 },
    { x: 34, y: 20 },
    { x: 50, y: 8 },
    { x: 50, y: 32 },
    { x: 66, y: 20 },
    { x: 80, y: 18 },
  ];
  if (spots.length !== PATH_END + 1) return null;

  const rooms: Room[] = spots.map((s, i) => {
    const w = i === 0 ? 12 : i === PATH_END ? 14 : 11 + rng.int(3);
    const h = i === 0 ? 10 : i === PATH_END ? 12 : 9 + rng.int(3);
    const kind: RoomKind = i === 0 ? "start" : i === PATH_END ? "boss" : "combat";
    return roomAtPos(s.x + rng.int(2), s.y + rng.int(2), w, h, kind, i);
  });

  for (const r of rooms) {
    if (r.x + r.w >= MAP_W - 1 || r.y + r.h >= MAP_H - 1) return null;
    carveRoom(tiles, r);
  }

  const main = [0, 1, 2, 3, 4, 5, 6, PATH_END];
  for (let i = 1; i < main.length; i++) {
    const a = rooms[main[i - 1]!]!;
    const b = rooms[main[i]!]!;
    carveLine(tiles, a.cx, a.cy, b.cx, b.cy);
  }

  const sideKind = (i: number): RoomKind => {
    if (i === 2) return "treasure";
    if (i === 3) return rng.chance(0.5) ? "shop" : "shrine";
    if (i === 5) return "shrine";
    return "treasure";
  };
  for (const i of [2, 3, 5]) {
    const hub = rooms[i]!;
    const north = hub.y > 20;
    const sy = north ? Math.max(2, hub.y - 12) : Math.min(MAP_H - 14, hub.y + hub.h + 1);
    const side = roomAtPos(hub.x + 1, sy, 9, 8, sideKind(i), i);
    if (side.y + side.h >= MAP_H - 1 || side.y < 1) continue;
    carveRoom(tiles, side);
    carveLine(tiles, hub.cx, hub.cy, side.cx, side.cy);
    rooms.push(side);
    if (side.kind === "shrine") tiles[side.cy]![side.cx] = "shrine";
    if (side.kind === "shop") tiles[side.cy]![side.cx] = "shop";
  }

  return { tiles, rooms, w: MAP_W, h: MAP_H };
}

export function generateDungeon(rng: Rng, _floor = 1): Dungeon {
  for (let attempt = 0; attempt < 8; attempt++) {
    const d = tryTrail(rng);
    if (d) return d;
  }
  return fallback();
}

export function isWalkable(tiles: TileKind[][], x: number, y: number): boolean {
  const t = tiles[y]?.[x];
  return t === "floor" || t === "stairs" || t === "shrine" || t === "shop";
}

export function roomAt(rooms: Room[], x: number, y: number): Room | null {
  for (const r of rooms) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

export function floorTiles(r: Room): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) out.push({ x, y });
  }
  return out;
}

export function bresenham(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    pts.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dy;
      y += sy;
    }
  }
  return pts;
}

export function lineOfSight(
  tiles: TileKind[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const pts = bresenham(x0, y0, x1, y1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i]!;
    if (p.x === x0 && p.y === y0) continue;
    if (!isWalkable(tiles, p.x, p.y)) return false;
  }
  return true;
}

export function nextStep(
  blocked: (x: number, y: number) => boolean,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number } | null {
  if (x0 === x1 && y0 === y1) return null;
  const q: { x: number; y: number }[] = [{ x: x0, y: y0 }];
  const came = new Map<string, string | null>();
  came.set(key(x0, y0), null);
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  let found = false;
  let guard = 0;
  while (q.length && guard++ < 400) {
    const cur = q.shift()!;
    if (cur.x === x1 && cur.y === y1) {
      found = true;
      break;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      const k = key(nx, ny);
      if (came.has(k)) continue;
      if ((nx !== x1 || ny !== y1) && blocked(nx, ny)) continue;
      came.set(k, key(cur.x, cur.y));
      q.push({ x: nx, y: ny });
    }
  }
  if (!found) {
    const opts = dirs
      .map(([dx, dy]) => ({ x: x0 + dx!, y: y0 + dy! }))
      .filter((p) => !blocked(p.x, p.y));
    if (!opts.length) return null;
    opts.sort(
      (a, b) =>
        Math.abs(a.x - x1) + Math.abs(a.y - y1) - (Math.abs(b.x - x1) + Math.abs(b.y - y1)),
    );
    return opts[0]!;
  }
  const path: { x: number; y: number }[] = [];
  let ck: string | null = key(x1, y1);
  while (ck) {
    const [xs, ys] = ck.split(",");
    path.push({ x: Number(xs), y: Number(ys) });
    ck = came.get(ck) ?? null;
  }
  path.reverse();
  return path[1] ?? null;
}
