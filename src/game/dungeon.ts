import { Rng } from "./rng.ts";
import type { Room, RoomKind, TileKind } from "./types.ts";
import { key } from "./types.ts";

export const MAP_W = 54;
export const MAP_H = 40;

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

function dist2(a: Room, b: Room): number {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  return dx * dx + dy * dy;
}

export function generateDungeon(rng: Rng, floor: number): Dungeon {
  for (let attempt = 0; attempt < 12; attempt++) {
    const d = tryGenerate(rng, floor);
    if (d) return d;
  }
  return tryGenerate(rng, floor) ?? fallback();
}

function fallback(): Dungeon {
  const tiles = emptyTiles(MAP_W, MAP_H);
  const r: Room = { x: 18, y: 14, w: 16, h: 12, cx: 26, cy: 20, kind: "start" };
  carveRoom(tiles, r);
  const exit: Room = { x: 36, y: 14, w: 10, h: 10, cx: 41, cy: 19, kind: "exit" };
  carveRoom(tiles, exit);
  carveLine(tiles, r.cx, r.cy, exit.cx, exit.cy);
  tiles[exit.cy]![exit.cx] = "stairs";
  return { tiles, rooms: [r, exit], w: MAP_W, h: MAP_H };
}

function tryGenerate(rng: Rng, floor: number): Dungeon | null {
  const tiles = emptyTiles(MAP_W, MAP_H);
  const slotW = 16;
  const slotH = 12;
  const ox = 3;
  const oy = 2;
  const slots: { sx: number; sy: number; x: number; y: number }[] = [];
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      slots.push({ sx, sy, x: ox + sx * slotW, y: oy + sy * slotH });
    }
  }

  const want = floor === 6 ? 6 : floor >= 3 ? 6 : 5;
  const chosen: typeof slots = [];
  const startSlot = slots[4]!;
  chosen.push(startSlot);

  const adjacent = (
    a: { sx: number; sy: number },
    b: { sx: number; sy: number },
  ) => Math.abs(a.sx - b.sx) + Math.abs(a.sy - b.sy) === 1;

  while (chosen.length < want) {
    const frontier = slots.filter(
      (s) => !chosen.includes(s) && chosen.some((c) => adjacent(c, s)),
    );
    if (frontier.length === 0) break;
    chosen.push(rng.pick(frontier));
  }
  if (chosen.length < 4) return null;

  const rooms: Room[] = chosen.map((s) => {
    const w = 8 + rng.int(3);
    const h = 6 + rng.int(3);
    const x = s.x + 1 + rng.int(2);
    const y = s.y + 1 + rng.int(2);
    return {
      x,
      y,
      w,
      h,
      cx: x + (w >> 1),
      cy: y + (h >> 1),
      kind: "combat",
    };
  });

  for (const r of rooms) carveRoom(tiles, r);

  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      if (!adjacent(chosen[i]!, chosen[j]!)) continue;
      carveLine(tiles, rooms[i]!.cx, rooms[i]!.cy, rooms[j]!.cx, rooms[j]!.cy);
    }
  }

  const start = rooms[0]!;
  let farthest = rooms[0]!;
  let best = -1;
  for (const r of rooms) {
    const d = dist2(start, r);
    if (d > best) {
      best = d;
      farthest = r;
    }
  }

  start.kind = "start";
  farthest.kind = floor === 6 ? "boss" : "exit";

  const rest = rooms.filter((r) => r !== start && r !== farthest);
  rng.shuffle(rest);

  const assign: RoomKind[] = [];
  if (floor === 3 || floor === 5) assign.push("shop");
  else if (rng.chance(0.45) && floor > 1) assign.push("shop");
  assign.push("shrine");
  if (rest.length > 3) assign.push("treasure");
  if (floor === 2 || floor === 4 || (floor >= 3 && rng.chance(0.5))) assign.push("elite");

  for (let i = 0; i < rest.length; i++) {
    rest[i]!.kind = assign[i] ?? "combat";
  }

  if (farthest.kind === "exit") {
    tiles[farthest.cy]![farthest.cx] = "stairs";
  }
  for (const r of rooms) {
    if (r.kind === "shrine") tiles[r.cy]![r.cx] = "shrine";
    if (r.kind === "shop") tiles[r.cy]![r.cx] = "shop";
  }

  return { tiles, rooms, w: MAP_W, h: MAP_H };
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
      err += dx;
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
