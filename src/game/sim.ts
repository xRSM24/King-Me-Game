import { def, enemyPool, harvestLine, popLine, wearLine } from "./identities.ts";
import { floorTiles, generateDungeon, isWalkable, lineOfSight } from "./dungeon.ts";
import { canStand, dist, slide } from "./physics.ts";
import { Rng } from "./rng.ts";
import { activeResonances, echoSet, hasRes } from "./resonances.ts";
import { hasPerk, type Meta } from "./meta.ts";
import type { Enemy, IdentityId, PlayPhase, Room, RunState } from "./types.ts";
import {
  DIR_LIST,
  DIRS,
  LAST_FLOOR,
  MAX_STITCH,
  VISION,
  dirFromDelta,
  key,
} from "./types.ts";

let rng = new Rng(1);

export function setRng(r: Rng): void {
  rng = r;
}

function inPhase(state: RunState, ...phases: PlayPhase[]): boolean {
  return phases.includes(state.phase);
}

function log(state: RunState, msg: string): void {
  state.log.unshift(msg);
  if (state.log.length > 4) state.log.length = 4;
}

function fxBurst(state: RunState, x: number, y: number, color: string, n = 12): void {
  state.fx.push({ kind: "burst", x, y, color, n });
}

function top(state: RunState): IdentityId {
  return state.player.stack[0] ?? "vagabond";
}

function tileOf(x: number, y: number): { x: number; y: number } {
  return { x: Math.floor(x), y: Math.floor(y) };
}

function enemyNear(state: RunState, x: number, y: number, r: number, ignore?: Enemy): Enemy | undefined {
  let best: Enemy | undefined;
  let bestD = r;
  for (const e of state.enemies) {
    if (e === ignore) continue;
    const d = dist(e.x, e.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function occupiedTile(state: RunState, x: number, y: number, ignore?: Enemy): boolean {
  const pt = tileOf(state.player.x, state.player.y);
  if (pt.x === x && pt.y === y) return true;
  return state.enemies.some((e) => e !== ignore && Math.floor(e.x) === x && Math.floor(e.y) === y);
}

function refreshVision(state: RunState): void {
  const pt = tileOf(state.player.x, state.player.y);
  const { w, h } = state;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) state.vis[y]![x] = false;
  }
  for (let y = pt.y - VISION; y <= pt.y + VISION; y++) {
    for (let x = pt.x - VISION; x <= pt.x + VISION; x++) {
      if (y < 0 || x < 0 || y >= h || x >= w) continue;
      if (Math.abs(x - pt.x) + Math.abs(y - pt.y) > VISION) continue;
      if (lineOfSight(state.tiles, pt.x, pt.y, x, y)) {
        state.vis[y]![x] = true;
        state.seen[y]![x] = true;
      }
    }
  }
}

function uniqueDiscover(state: RunState): void {
  const before = new Set(state.discovered);
  for (const r of activeResonances(state)) {
    if (!before.has(r.id)) {
      state.discovered.push(r.id);
      state.fx.push({ kind: "banner", text: r.name, sub: r.desc, color: "#e8c36a" });
      state.fx.push({ kind: "sfx", name: "resonate" });
      log(state, `Combo! ${r.name}`);
    }
  }
}

function feedHollow(state: RunState, id: IdentityId, why: string): void {
  if (id === "hollow") return;
  state.grave.push(id);
  log(state, why);
}

function ignite(state: RunState, x: number, y: number, seconds = 2.4): void {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!isWalkable(state.tiles, tx, ty)) return;
  const k = key(tx, ty);
  state.fire[k] = Math.max(state.fire[k] ?? 0, seconds);
}

function meleeDamage(state: RunState): number {
  let d = def(top(state)).damage;
  if (hasRes(state, "honorless") && state.movedThisTurn) d += 2;
  return d;
}

function rangedDamage(state: RunState): number {
  let d = def(top(state)).ranged || 2;
  if (hasRes(state, "deathwind")) d += 2;
  return d;
}

function rangeBonus(state: RunState): number {
  return echoSet(state).has("archer") ? 1 : 0;
}

function pickupGold(state: RunState): void {
  const t = tileOf(state.player.x, state.player.y);
  const k = key(t.x, t.y);
  const g = state.goldMap[k];
  if (!g) return;
  state.gold += g;
  delete state.goldMap[k];
  log(state, `You pocket ${g} coins.`);
  state.fx.push({ kind: "sfx", name: "harvest" });
  state.fx.push({ kind: "text", x: state.player.x, y: state.player.y, text: `+${g}`, color: "#e8c36a" });
}

function aoeOnPop(state: RunState, x: number, y: number): void {
  if (!hasRes(state, "saintbones")) return;
  for (const e of [...state.enemies]) {
    if (dist(e.x, e.y, x, y) < 1.2) hurtEnemy(state, e, 2, false);
  }
}

export function takeHit(state: RunState, src = "a bonk"): void {
  if (state.phase === "dead" || state.phase === "won") return;
  if (state.player.iFrames > 0) return;
  state.player.iFrames = 0.85;
  if (state.stitches > 0) {
    state.stitches -= 1;
    log(state, `Lucky Pin catches ${src}.`);
    state.fx.push({ kind: "sfx", name: "stitch" });
    fxBurst(state, state.player.x, state.player.y, "#e8c36a", 8);
    return;
  }
  const echoes = echoSet(state);
  if (echoes.has("rat") && rng.chance(0.2)) {
    log(state, "Squeak yanks you aside. Missed!");
    fxBurst(state, state.player.x, state.player.y, "#d48962", 6);
    return;
  }
  const face = top(state);
  if (echoes.has("priest") && state.player.stack.length > 1 && rng.chance(0.4)) {
    state.player.stack.shift();
    state.player.stack.push(face);
    log(state, `The ${def(face).name} costume slides to the bottom. Close one!`);
    uniqueDiscover(state);
    state.fx.push({ kind: "sfx", name: "stitch" });
    return;
  }
  const hadKnightEcho = echoes.has("knight");
  state.player.stack.shift();
  log(state, popLine(face));
  state.fx.push({ kind: "sfx", name: "pop" });
  state.fx.push({ kind: "shake", mag: 7 });
  state.fx.push({ kind: "flash", color: def(face).color });
  fxBurst(state, state.player.x, state.player.y, def(face).color, 16);
  aoeOnPop(state, state.player.x, state.player.y);

  if (state.player.stack.length === 0) {
    if (!state.knightOathUsed && hadKnightEcho) {
      state.knightOathUsed = true;
      state.player.stack = ["vagabond"];
      log(state, "Sir Boop takes the hit! Pip pops back in PJs.");
      state.fx.push({
        kind: "banner",
        text: "Boop Save!",
        sub: "Sir Boop yeeted you to safety.",
        color: "#ff7aa0",
      });
      uniqueDiscover(state);
      return;
    }
    state.phase = "dead";
    log(state, "FWOOMP! Every costume fell off. Pip got sent home.");
    state.fx.push({ kind: "sfx", name: "dead" });
    state.fx.push({ kind: "banner", text: "Sent Home!", color: "#ff7aa0" });
    return;
  }
  uniqueDiscover(state);
}

function hurtEnemy(state: RunState, e: Enemy, dmg: number, canLoot: boolean): boolean {
  e.hp -= dmg;
  e.flash = 0.2;
  state.fx.push({ kind: "text", x: e.x, y: e.y, text: `-${dmg}`, color: "#ff5a8a" });
  fxBurst(state, e.x, e.y, def(e.id).color, 8);
  if (e.hp > 0) return false;
  killEnemy(state, e, canLoot);
  return true;
}

function noteGoal(state: RunState): void {
  if (state.floor >= LAST_FLOOR) return;
  if (state.goalHave < state.goalNeed) {
    const left = state.goalNeed - state.goalHave;
    log(state, left === 1 ? "One more costume and the stairs pop open." : `${left} costumes left to open the stairs.`);
    return;
  }
  if (state.stairsOpen) return;
  state.stairsOpen = true;
  const x = state.exitX;
  const y = state.exitY;
  if (isWalkable(state.tiles, x, y) || state.tiles[y]?.[x] === "wall") {
    state.tiles[y]![x] = "stairs";
  }
  state.fx.push({
    kind: "banner",
    text: "Stairs popped open!",
    sub: "Keep going. King Empty is still far.",
    color: "#ff7aa0",
  });
  state.fx.push({ kind: "sfx", name: "stairs" });
  log(state, "The stairs pop out of the floor. Next closet!");
}

function killEnemy(state: RunState, e: Enemy, canLoot: boolean): void {
  state.enemies = state.enemies.filter((x) => x !== e);
  state.kills += 1;
  state.blood[key(Math.floor(e.x), Math.floor(e.y))] = 1;
  fxBurst(state, e.x, e.y, def(e.id).color, 18);
  if (e.id === "hollow") {
    state.pending = e;
    state.phase = "decision";
    log(state, "King Empty wobbles. He's wearing every outfit you skipped!");
    state.fx.push({ kind: "sfx", name: "win" });
    return;
  }
  state.goalHave += 1;
  noteGoal(state);
  if (!canLoot || state.phase === "decision") {
    harvestEnemy(state, e, true);
    return;
  }
  state.pending = e;
  state.phase = "decision";
  log(state, `${def(e.id).name} is down! Wear the costume, or snack the coins.`);
}

function harvestGoldFor(state: RunState, e: Enemy): number {
  let g = def(e.id).gold + (e.elite ? 3 : 0);
  if (echoSet(state).has("vagabond")) g += 1;
  if (echoSet(state).has("thief")) g += 2;
  if (hasRes(state, "packrat")) g *= 2;
  return g;
}

function addAsh(state: RunState, id: IdentityId): void {
  if (id === "hollow") return;
  const n = (state.ash[id] ?? 0) + 1;
  state.ash[id] = n;
  if (n >= 3 && !state.memories.includes(id)) {
    state.memories.push(id);
    log(state, `Memory sticker! You keep ${def(id).name}'s trick without wearing it.`);
    state.fx.push({ kind: "banner", text: `${def(id).name} Memory`, sub: def(id).echo, color: def(id).color });
    uniqueDiscover(state);
  }
}

function harvestEnemy(state: RunState, e: Enemy, silentFeed: boolean): void {
  const g = harvestGoldFor(state, e);
  state.gold += g;
  addAsh(state, e.id);
  if (hasRes(state, "ashchoir") && state.stitches < MAX_STITCH) {
    state.stitches += 1;
    state.fx.push({ kind: "sfx", name: "stitch" });
  }
  if (e.id !== "hollow") {
    feedHollow(
      state,
      e.id,
      silentFeed ? `The fire mailed ${def(e.id).name}'s costume to King Empty.` : harvestLine(e.id),
    );
  }
  state.fx.push({ kind: "text", x: e.x, y: e.y, text: `+${g}`, color: "#e8c36a" });
}

function wearEnemy(state: RunState, e: Enemy): void {
  if (e.id === "hollow") {
    state.phase = "won";
    log(state, wearLine("hollow"));
    state.fx.push({
      kind: "banner",
      text: "King Costume!",
      sub: "Googly eyes look good on you.",
      color: "#c8b6ff",
    });
    state.fx.push({ kind: "sfx", name: "win" });
    return;
  }
  state.player.stack.unshift(e.id);
  if (!state.worn.includes(e.id)) state.worn.push(e.id);
  if (state.player.stack.length > effectiveMax(state)) {
    const lost = state.player.stack.pop()!;
    feedHollow(state, lost, `The ${def(lost).name} costume slips off the bottom. King Empty yoinked it.`);
  }
  log(state, wearLine(e.id));
  uniqueDiscover(state);
}

function effectiveMax(state: RunState): number {
  let m = state.maxStack;
  if (hasRes(state, "manyfaces")) m += 1;
  return m;
}

function spawnEnemy(state: RunState, x: number, y: number, id: IdentityId, elite = false): void {
  const d = def(id);
  let hp = d.hp + Math.floor(state.floor / 3);
  if (elite) hp += 3;
  if (id === "hollow") hp = 18 + state.grave.length * 2;
  state.enemies.push({
    x,
    y,
    id,
    hp,
    maxHp: hp,
    facing: "down",
    stun: 0,
    flash: 0,
    elite,
    atkCd: 0.4,
  });
}

function pickOpen(state: RunState, tiles: { x: number; y: number }[], avoid: number): { x: number; y: number } | null {
  const opts = tiles.filter((p) => {
    if (!isWalkable(state.tiles, p.x, p.y)) return false;
    if (occupiedTile(state, p.x, p.y)) return false;
    const t = state.tiles[p.y]![p.x];
    if (t === "stairs" || t === "shrine" || t === "shop") return false;
    const pt = tileOf(state.player.x, state.player.y);
    if (Math.abs(p.x - pt.x) + Math.abs(p.y - pt.y) < avoid) return false;
    return true;
  });
  if (!opts.length) return null;
  return rng.pick(opts);
}

function spawnInRoom(
  state: RunState,
  room: Room,
  id: IdentityId,
  elite = false,
  avoid = 2,
): boolean {
  const spots = floorTiles(room);
  let p = pickOpen(state, spots, avoid);
  if (!p) p = pickOpen(state, spots, 0);
  if (!p && isWalkable(state.tiles, room.cx, room.cy) && !occupiedTile(state, room.cx, room.cy)) {
    p = { x: room.cx, y: room.cy };
  }
  if (!p) return false;
  spawnEnemy(state, p.x + 0.5, p.y + 0.5, id, elite);
  return true;
}

function floorGoal(floor: number): number {
  if (floor >= LAST_FLOOR) return 1;
  if (floor === 1) return 1;
  return Math.min(6, 1 + Math.floor(floor * 0.7));
}

function populateFloor(state: RunState): void {
  const pool = enemyPool(state.floor);
  const start = state.rooms.find((r) => r.kind === "start");

  if (state.floor >= LAST_FLOOR) {
    const boss = state.rooms.find((r) => r.kind === "boss");
    if (boss) spawnEnemy(state, boss.cx + 0.5, boss.cy + 0.5, "hollow");
    return;
  }

  if (start) {
    spawnInRoom(state, start, state.floor === 1 ? "rat" : rng.pick(pool), false, 4);
  }
  if (state.floor === 1) return;

  for (const room of state.rooms) {
    if (room.kind === "start" || room.kind === "boss") continue;
    const spots = floorTiles(room);
    if (room.kind === "treasure") {
      const g = pickOpen(state, spots, 0);
      if (g) state.goldMap[key(g.x, g.y)] = rng.range(5, 9);
      continue;
    }
    if (room.kind === "shrine" || room.kind === "shop") continue;
    if (room.kind === "elite") {
      spawnInRoom(state, room, rng.chance(0.5) ? "knight" : "guard", true, 2);
      spawnInRoom(state, room, "rat", false, 1);
      continue;
    }
    const n =
      room.kind === "exit"
        ? Math.max(1, Math.ceil(state.floor / 5))
        : state.floor <= 2
          ? 1
          : Math.min(3, 1 + Math.floor((state.floor - 1) / 4));
    for (let i = 0; i < n; i++) spawnInRoom(state, room, rng.pick(pool), false, 1);
  }

  const need = Math.max(state.goalNeed, 1);
  let guards = 0;
  const dens = state.rooms.filter((r) => r.kind === "combat" || r.kind === "exit" || r.kind === "start");
  while (state.enemies.length < need && dens.length && guards++ < 24) {
    spawnInRoom(state, rng.pick(dens), rng.pick(pool), false, 0);
  }
}

function newGrid<T>(w: number, h: number, v: T): T[][] {
  const g: T[][] = [];
  for (let y = 0; y < h; y++) {
    const row: T[] = [];
    for (let x = 0; x < w; x++) row.push(v);
    g.push(row);
  }
  return g;
}

function revealStart(state: RunState): void {
  const room = state.rooms.find((r) => r.kind === "start");
  if (!room) return;
  for (let y = room.y - 2; y < room.y + room.h + 2; y++) {
    for (let x = room.x - 2; x < room.x + room.w + 2; x++) {
      if (state.seen[y] && state.seen[y]![x] !== undefined) state.seen[y]![x] = true;
    }
  }
}

function floorStartBonuses(state: RunState): void {
  state.priestBound = false;
  state.scroungeUsed = false;
  if (hasRes(state, "bulwark")) state.stitches = Math.max(state.stitches, 2);
  else if (echoSet(state).has("guard") && state.stitches < 1) state.stitches = 1;
}

export function createRun(seed: number, meta: Meta, isDaily: boolean): RunState {
  rng = new Rng(seed);
  const maxStack = hasPerk(meta, "stack5") ? 4 : 3;
  const state: RunState = {
    seed,
    floor: 1,
    turn: 0,
    phase: "playing",
    tiles: [],
    w: 0,
    h: 0,
    rooms: [],
    player: { x: 0, y: 0, facing: "down", stack: ["vagabond"], iFrames: 0 },
    enemies: [],
    goldMap: {},
    fire: {},
    seen: [],
    vis: [],
    blood: {},
    grave: [],
    log: ["Goal: reach King Empty's Fort. You will get sent home a lot. That's the point."],
    fx: [],
    pending: null,
    maxStack,
    memories: [],
    ash: {},
    discovered: [],
    worn: ["vagabond"],
    kills: 0,
    gold: hasPerk(meta, "gold") ? 4 : 0,
    stitches: hasPerk(meta, "stitch") ? 1 : 0,
    priestBound: false,
    braceCd: 0,
    scroungeUsed: false,
    knightOathUsed: false,
    interactLock: false,
    movedThisTurn: false,
    isDaily,
    shrineSpent: {},
    shopSpent: {},
    extraSlotBought: false,
    hollowMimic: null,
    hollowMimicTime: 0,
    goalNeed: 1,
    goalHave: 0,
    exitX: 0,
    exitY: 0,
    stairsOpen: false,
    atkCd: 0,
    powerCd: 0,
    fireClock: 0,
    moveTarget: null,
  };
  loadFloor(state, meta);
  state.fx.push({
    kind: "banner",
    text: "Goal: King Empty",
    sub: "Ten closets down. Stickers help the next try.",
    color: "#ff5a8a",
  });
  return state;
}

export function loadFloor(state: RunState, _meta?: Meta): void {
  const dung = generateDungeon(rng, state.floor);
  state.tiles = dung.tiles;
  state.rooms = dung.rooms;
  state.w = dung.w;
  state.h = dung.h;
  state.enemies = [];
  state.goldMap = {};
  state.fire = {};
  state.blood = {};
  state.seen = newGrid(state.w, state.h, false);
  state.vis = newGrid(state.w, state.h, false);
  state.shrineSpent = {};
  state.shopSpent = {};
  state.interactLock = false;
  state.moveTarget = null;
  state.goalNeed = floorGoal(state.floor);
  state.goalHave = 0;
  state.stairsOpen = false;
  const exit = dung.rooms.find((r) => r.kind === "exit" || r.kind === "boss") ?? dung.rooms[dung.rooms.length - 1]!;
  state.exitX = exit.cx;
  state.exitY = exit.cy;
  const start = dung.rooms.find((r) => r.kind === "start") ?? dung.rooms[0]!;
  state.player.x = start.cx + 0.5;
  state.player.y = start.cy + 0.5;
  populateFloor(state);
  floorStartBonuses(state);
  revealStart(state);
  refreshVision(state);
  state.fx.push({ kind: "floorTitle" });
  state.fx.push({ kind: "sfx", name: "stairs" });
  if (state.floor >= LAST_FLOOR) {
    log(state, "King Empty's Fort. This is the goal.");
  } else {
    log(state, `Closet ${state.floor} — boop ${state.goalNeed} costume${state.goalNeed === 1 ? "" : "s"} to open the stairs.`);
  }
}

function descend(state: RunState): void {
  if (state.floor >= LAST_FLOOR) return;
  state.floor += 1;
  loadFloor(state);
}

function afterMove(state: RunState, fromX: number, fromY: number): void {
  pickupGold(state);
  if (hasRes(state, "cinderstep")) ignite(state, fromX, fromY, 1.6);
  const t = tileOf(state.player.x, state.player.y);
  const kind = state.tiles[t.y]![t.x];
  const k = key(t.x, t.y);
  if (kind === "stairs" && state.stairsOpen) {
    descend(state);
    return;
  }
  if (state.interactLock) {
    const from = tileOf(fromX, fromY);
    if (from.x !== t.x || from.y !== t.y) state.interactLock = false;
    return;
  }
  if (kind === "shrine" && !state.shrineSpent[k]) {
    state.phase = "shrine";
    state.interactLock = true;
    return;
  }
  if (kind === "shop" && !state.shopSpent[k]) {
    state.phase = "shop";
    state.interactLock = true;
  }
}

function knock(state: RunState, e: Enemy, fromX: number, fromY: number, force: number): void {
  const d = dist(e.x, e.y, fromX, fromY) || 1;
  const dx = ((e.x - fromX) / d) * force;
  const dy = ((e.y - fromY) / d) * force;
  const n = slide(state.tiles, e.x, e.y, dx, dy, 0.3);
  e.x = n.x;
  e.y = n.y;
}

function attackMelee(state: RunState, e: Enemy): void {
  const dmg = meleeDamage(state);
  state.fx.push({ kind: "sfx", name: "hit" });
  state.fx.push({ kind: "hitstop", ms: 40 });
  state.fx.push({ kind: "shake", mag: 3 });
  if (echoSet(state).has("pyromancer") || top(state) === "pyromancer") ignite(state, e.x, e.y, 1.8);
  const dead = hurtEnemy(state, e, dmg, true);
  if (!dead) knock(state, e, state.player.x, state.player.y, 0.55);
}

function enemySpeed(e: Enemy): number {
  if (e.id === "hollow") return 1.55;
  if (e.id === "rat") return 2.6;
  if (e.id === "thief") return 2.9;
  if (e.id === "guard" || e.id === "knight") return 1.7;
  return 2.15;
}

function rayHit(state: RunState, x0: number, y0: number, dx: number, dy: number, range: number): Enemy | undefined {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const steps = Math.ceil(range / 0.18);
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ux * i * 0.18;
    const y = y0 + uy * i * 0.18;
    if (!canStand(state.tiles, x, y, 0.12)) return undefined;
    const e = enemyNear(state, x, y, 0.42);
    if (e) return e;
  }
  return undefined;
}

function shootLine(state: RunState): boolean {
  const range = 3.4 + rangeBonus(state);
  const v = DIRS[state.player.facing];
  const e = rayHit(state, state.player.x, state.player.y, v.x, v.y, range);
  if (!e) {
    log(state, "Pew! It hits a wall. Rude wall.");
    return true;
  }
  const dmg = rangedDamage(state);
  state.fx.push({ kind: "sfx", name: "hit" });
  state.fx.push({ kind: "hitstop", ms: 40 });
  if (hasRes(state, "deathwind")) {
    state.gold += 1;
    state.fx.push({ kind: "text", x: e.x, y: e.y, text: "+1", color: "#e8c36a" });
  }
  hurtEnemy(state, e, dmg, true);
  return true;
}

function dash(state: RunState): boolean {
  const v = DIRS[state.player.facing];
  let x = state.player.x;
  let y = state.player.y;
  let moved = false;
  for (let i = 0; i < 12; i++) {
    const n = slide(state.tiles, x, y, v.x * 0.16, v.y * 0.16, 0.28);
    if (n.x === x && n.y === y) break;
    x = n.x;
    y = n.y;
    moved = true;
  }
  if (!moved) {
    log(state, "No zoom room!");
    return false;
  }
  const fx = state.player.x;
  const fy = state.player.y;
  state.player.x = x;
  state.player.y = y;
  state.movedThisTurn = true;
  fxBurst(state, x, y, "#d48962", 8);
  afterMove(state, fx, fy);
  refreshVision(state);
  return true;
}

function flip(state: RunState): boolean {
  const v = DIRS[state.player.facing];
  const lookX = state.player.x + v.x * 0.9;
  const lookY = state.player.y + v.y * 0.9;
  const e = enemyNear(state, lookX, lookY, 1.15);
  if (!e) {
    log(state, "Nobody to swap with.");
    return false;
  }
  const px = state.player.x;
  const py = state.player.y;
  state.player.x = e.x;
  state.player.y = e.y;
  e.x = px;
  e.y = py;
  e.facing = state.player.facing;
  log(state, "SWAP! They're wearing your old spot.");
  refreshVision(state);
  return true;
}

function cleave(state: RunState): boolean {
  const hits = state.enemies.filter((e) => dist(e.x, e.y, state.player.x, state.player.y) < 1.25);
  if (!hits.length) {
    log(state, "Boop Storm hits... the air. The air is fine.");
    return false;
  }
  state.fx.push({ kind: "sfx", name: "hit" });
  state.fx.push({ kind: "shake", mag: 5 });
  const dmg = meleeDamage(state);
  for (const e of hits) hurtEnemy(state, e, dmg, true);
  return true;
}

function cinder(state: RunState): boolean {
  const v = DIRS[state.player.facing];
  let x = state.player.x;
  let y = state.player.y;
  for (let i = 0; i < 3; i++) {
    x += v.x;
    y += v.y;
    ignite(state, x, y, 3);
    const e = enemyNear(state, x, y, 0.55);
    if (e) hurtEnemy(state, e, 1, true);
  }
  state.fx.push({ kind: "sfx", name: "fire" });
  log(state, "Hot Foot! The floor is spicy now.");
  return true;
}

function pocketLint(state: RunState): boolean {
  if (state.scroungeUsed) {
    log(state, "Pockets already empty this closet.");
    return false;
  }
  state.scroungeUsed = true;
  state.gold += 1;
  log(state, "You find a coin in the PJs.");
  state.fx.push({ kind: "sfx", name: "harvest" });
  return true;
}

export function usePower(state: RunState): boolean {
  if (state.phase !== "playing") return false;
  if (state.powerCd > 0) return false;
  const id = top(state);
  let ok = false;
  switch (id) {
    case "vagabond":
      ok = pocketLint(state);
      break;
    case "rat":
      ok = dash(state);
      break;
    case "guard":
      if (state.braceCd > 0) {
        log(state, "Brace is still cooling off.");
        return false;
      }
      if (state.stitches >= MAX_STITCH) {
        log(state, "Too many Lucky Pins. They'll fall off.");
        return false;
      }
      state.stitches += 1;
      state.braceCd = 6;
      log(state, "CLANK. Lucky Pin slapped on.");
      state.fx.push({ kind: "sfx", name: "stitch" });
      ok = true;
      break;
    case "archer":
      ok = shootLine(state);
      break;
    case "thief":
      ok = flip(state);
      break;
    case "priest":
      if (state.priestBound) {
        log(state, "Bubbles already popped this closet.");
        return false;
      }
      if (state.stitches >= MAX_STITCH) {
        log(state, "Already covered in pins.");
        return false;
      }
      state.stitches += 1;
      state.priestBound = true;
      log(state, "Bubbles! Extra Lucky Pin.");
      state.fx.push({ kind: "sfx", name: "stitch" });
      ok = true;
      break;
    case "pyromancer":
      ok = cinder(state);
      break;
    case "knight":
      ok = cleave(state);
      break;
    default:
      ok = pocketLint(state);
  }
  if (!ok) return false;
  state.powerCd = 0.45;
  return true;
}

export function chooseWear(state: RunState): void {
  if (state.phase !== "decision" || !state.pending) return;
  const e = state.pending;
  state.pending = null;
  state.fx.push({ kind: "sfx", name: "wear" });
  state.fx.push({ kind: "banner", text: def(e.id).name, sub: def(e.id).title, color: def(e.id).color });
  fxBurst(state, state.player.x, state.player.y, def(e.id).color, 20);
  wearEnemy(state, e);
  if (inPhase(state, "won")) return;
  state.phase = "playing";
  state.player.iFrames = 0.5;
}

export function chooseHarvest(state: RunState): void {
  if (state.phase !== "decision" || !state.pending) return;
  const e = state.pending;
  state.pending = null;
  if (e.id === "hollow") {
    state.phase = "won";
    log(state, "You send King Empty home. Pip keeps the pile. Snack victory!");
    state.fx.push({ kind: "banner", text: "King Sent Home!", sub: "Pip keeps the pile.", color: "#e8c36a" });
    state.fx.push({ kind: "sfx", name: "win" });
    return;
  }
  harvestEnemy(state, e, false);
  state.fx.push({ kind: "sfx", name: "harvest" });
  state.phase = "playing";
  state.player.iFrames = 0.5;
}

export function shrinePick(state: RunState, choice: number): void {
  if (state.phase !== "shrine") return;
  const t = tileOf(state.player.x, state.player.y);
  const k = key(t.x, t.y);
  if (choice === 1) {
    state.player.stack.reverse();
    log(state, "WHOOSH. Pile flipped upside down.");
    uniqueDiscover(state);
    state.fx.push({ kind: "sfx", name: "wear" });
  } else if (choice === 2) {
    if (state.player.stack.length <= 1) log(state, "Nope — that's Pip's last costume.");
    else {
      const lost = state.player.stack.shift()!;
      state.gold += 6;
      feedHollow(state, lost, `You traded the ${def(lost).name} costume. King Empty yoinked it.`);
      uniqueDiscover(state);
      state.fx.push({ kind: "sfx", name: "harvest" });
    }
  } else if (choice === 3) {
    if (state.stitches >= MAX_STITCH) log(state, "Already covered in Lucky Pins.");
    else {
      state.stitches += 1;
      log(state, "Fizz! Extra Lucky Pin.");
      state.fx.push({ kind: "sfx", name: "stitch" });
    }
  }
  state.shrineSpent[k] = true;
  state.phase = "playing";
}

export function shopPick(state: RunState, choice: number): void {
  if (state.phase !== "shop") return;
  if (choice === 0) {
    leaveShop(state);
    return;
  }
  if (choice === 1) {
    if (state.gold < 7) {
      log(state, "Need more coins!");
      return;
    }
    if (state.stitches >= MAX_STITCH) {
      log(state, "Already covered in Lucky Pins.");
      return;
    }
    state.gold -= 7;
    state.stitches += 1;
    log(state, "Bought a Lucky Pin. Stick.");
    state.fx.push({ kind: "sfx", name: "stitch" });
  } else if (choice === 2) {
    if (state.gold < 12) {
      log(state, "Need more coins!");
      return;
    }
    state.gold -= 12;
    const id = rng.pick(enemyPool(Math.min(LAST_FLOOR, state.floor + 1)).filter((x) => x !== "hollow"));
    const fake: Enemy = {
      x: state.player.x,
      y: state.player.y,
      id,
      hp: 0,
      maxHp: 0,
      facing: "down",
      stun: 0,
      flash: 0,
      elite: false,
      atkCd: 0,
    };
    wearEnemy(state, fake);
    log(state, `Mystery box! You're ${def(id).name} now.`);
    state.fx.push({ kind: "sfx", name: "wear" });
    state.fx.push({ kind: "banner", text: def(id).name, sub: "Bought, not booped.", color: def(id).color });
  } else if (choice === 3) {
    if (state.extraSlotBought) {
      log(state, "The pile is already extra-roomy.");
      return;
    }
    if (state.gold < 14) {
      log(state, "Need more coins!");
      return;
    }
    state.gold -= 14;
    state.maxStack += 1;
    state.extraSlotBought = true;
    log(state, "Bigger pile unlocked. More hats!");
    state.fx.push({ kind: "sfx", name: "resonate" });
  }
}

export function leaveShop(state: RunState): void {
  if (state.phase !== "shop") return;
  const t = tileOf(state.player.x, state.player.y);
  state.shopSpent[key(t.x, t.y)] = true;
  state.phase = "playing";
}

function tickFire(state: RunState, dt: number): void {
  state.fireClock += dt;
  const pulse = state.fireClock >= 0.45;
  if (pulse) state.fireClock = 0;
  const next: Record<string, number> = {};
  for (const k of Object.keys(state.fire)) {
    const n = (state.fire[k] ?? 0) - dt;
    if (n > 0) next[k] = n;
    if (!pulse) continue;
    const [xs, ys] = k.split(",");
    const x = Number(xs) + 0.5;
    const y = Number(ys) + 0.5;
    if (dist(state.player.x, state.player.y, x, y) < 0.55) {
      log(state, "Spicy! The pile is on fire.");
      takeHit(state, "the fire");
      state.fx.push({ kind: "sfx", name: "fire" });
    }
    const e = enemyNear(state, x, y, 0.5);
    if (e && e.id !== "hollow") hurtEnemy(state, e, 1, false);
  }
  state.fire = next;
}

function actEnemy(state: RunState, e: Enemy, dt: number): void {
  if (state.phase === "dead" || state.phase === "won" || state.phase === "decision") return;
  e.flash = Math.max(0, e.flash - dt * 4);
  e.atkCd = Math.max(0, e.atkCd - dt);
  if (e.stun > 0) {
    e.stun = Math.max(0, e.stun - dt);
    return;
  }

  const px = state.player.x;
  const py = state.player.y;
  const d = dist(e.x, e.y, px, py);
  const et = tileOf(e.x, e.y);
  const pt = tileOf(px, py);

  if (e.id === "hollow") {
    state.hollowMimicTime = Math.max(0, state.hollowMimicTime - dt);
    if (state.hollowMimicTime <= 0 && state.grave.length && rng.chance(0.008)) {
      state.hollowMimic = rng.pick(state.grave);
      state.hollowMimicTime = 4;
      log(state, `King Empty tries on your ${def(state.hollowMimic).name}!`);
      state.fx.push({ kind: "banner", text: `King Empty: ${def(state.hollowMimic).name}`, color: "#c8b6ff" });
    }
  }

  const mimic = e.id === "hollow" ? state.hollowMimic : null;
  const archerish = e.id === "archer" || mimic === "archer";
  if (archerish && d < 4.2 && d > 1.1 && e.atkCd <= 0) {
    const sees = lineOfSight(state.tiles, et.x, et.y, pt.x, pt.y);
    const cardinal = Math.abs(e.x - px) < 0.35 || Math.abs(e.y - py) < 0.35;
    if (sees && cardinal) {
      e.facing = dirFromDelta(px - e.x, py - e.y);
      e.atkCd = 1.5;
      log(state, `${def(e.id).name} pews you!`);
      takeHit(state, "a pew");
      state.fx.push({ kind: "sfx", name: "hit" });
      return;
    }
  }

  if (d < 0.62 && e.atkCd <= 0) {
    e.facing = dirFromDelta(px - e.x, py - e.y);
    e.atkCd = e.id === "hollow" ? 1.15 : 1.05;
    if ((e.id === "thief" || mimic === "thief") && rng.chance(0.28) && state.gold > 0) {
      state.gold -= 1;
      const tx = e.x;
      const ty = e.y;
      e.x = px;
      e.y = py;
      state.player.x = tx;
      state.player.y = ty;
      log(state, "Nib yoinks a coin and your spot!");
      refreshVision(state);
      return;
    }
    log(state, `${def(e.id).name} bonks you!`);
    takeHit(state, "a strike");
    state.fx.push({ kind: "sfx", name: "hit" });
    state.fx.push({ kind: "shake", mag: 5 });
    const knockD = dist(px, py, e.x, e.y) || 1;
    const n = slide(state.tiles, px, py, ((px - e.x) / knockD) * 0.35, ((py - e.y) / knockD) * 0.35, 0.28);
    state.player.x = n.x;
    state.player.y = n.y;
    return;
  }

  const sees = d < 9 && lineOfSight(state.tiles, et.x, et.y, pt.x, pt.y);
  let vx = 0;
  let vy = 0;
  if (sees) {
    vx = (px - e.x) / (d || 1);
    vy = (py - e.y) / (d || 1);
    e.facing = dirFromDelta(vx, vy);
  } else if (rng.chance(0.02)) {
    const dir = rng.pick(DIR_LIST);
    const v = DIRS[dir];
    vx = v.x;
    vy = v.y;
    e.facing = dir;
  }
  if (vx === 0 && vy === 0) return;
  const spd = enemySpeed(e) * dt;
  const n = slide(state.tiles, e.x, e.y, vx * spd, vy * spd, 0.3);
  const other = enemyNear(state, n.x, n.y, 0.55, e);
  if (other) return;
  e.x = n.x;
  e.y = n.y;
}

export function setMoveTarget(state: RunState, x: number, y: number): void {
  if (!isWalkable(state.tiles, Math.floor(x), Math.floor(y))) return;
  state.moveTarget = { x, y };
}

export function tickWorld(state: RunState, dt: number, ax: number, ay: number): void {
  if (state.phase !== "playing") return;
  state.turn += dt;
  if (state.player.iFrames > 0) state.player.iFrames = Math.max(0, state.player.iFrames - dt);
  if (state.atkCd > 0) state.atkCd = Math.max(0, state.atkCd - dt);
  if (state.powerCd > 0) state.powerCd = Math.max(0, state.powerCd - dt);
  if (state.braceCd > 0) state.braceCd = Math.max(0, state.braceCd - dt);

  if (ax !== 0 || ay !== 0) state.moveTarget = null;
  if (ax === 0 && ay === 0 && state.moveTarget) {
    const dx = state.moveTarget.x - state.player.x;
    const dy = state.moveTarget.y - state.player.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.12) state.moveTarget = null;
    else {
      ax = dx / d;
      ay = dy / d;
    }
  }

  const fromX = state.player.x;
  const fromY = state.player.y;
  if (ax !== 0 || ay !== 0) {
    state.player.facing = dirFromDelta(ax, ay);
    state.movedThisTurn = true;
    const n = slide(state.tiles, state.player.x, state.player.y, ax * 4.4 * dt, ay * 4.4 * dt, 0.28);
    state.player.x = n.x;
    state.player.y = n.y;
    afterMove(state, fromX, fromY);
    if (state.phase !== "playing") return;
    refreshVision(state);
  } else {
    state.movedThisTurn = false;
  }

  if (state.atkCd <= 0) {
    const foe = enemyNear(state, state.player.x, state.player.y, 0.66);
    if (foe) {
      attackMelee(state, foe);
      state.atkCd = 0.38;
      if (state.phase !== "playing") return;
    }
  }

  tickFire(state, dt);
  if (state.phase !== "playing") return;
  for (const e of [...state.enemies]) {
    if (!state.enemies.includes(e)) continue;
    actEnemy(state, e, dt);
    if (state.phase !== "playing") return;
  }
}

export { refreshVision, effectiveMax, harvestGoldFor };

export function goalLabel(state: RunState): string {
  if (state.floor >= LAST_FLOOR) return "Goal: boop King Empty";
  if (state.stairsOpen) return "Goal: take the stairs";
  const left = Math.max(0, state.goalNeed - state.goalHave);
  return left === 1 ? "Goal: boop 1 more costume" : `Goal: boop ${left} more costumes`;
}
