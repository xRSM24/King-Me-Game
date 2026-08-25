import { def, enemyPool, harvestLine, popLine, wearLine } from "./identities.ts";
import {
  floorTiles,
  generateDungeon,
  isWalkable,
  lineOfSight,
  nextStep,
  roomAt,
} from "./dungeon.ts";
import { Rng } from "./rng.ts";
import { activeResonances, echoSet, hasRes } from "./resonances.ts";
import { hasPerk, type Meta } from "./meta.ts";
import type { Enemy, IdentityId, PlayPhase, RunState, TileKind } from "./types.ts";
import {
  DIR_LIST,
  DIRS,
  FLOOR_NAMES,
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
  if (state.log.length > 8) state.log.length = 8;
}

function fxBurst(state: RunState, x: number, y: number, color: string, n = 12): void {
  state.fx.push({ kind: "burst", x, y, color, n });
}

function top(state: RunState): IdentityId {
  return state.player.stack[0] ?? "vagabond";
}

function enemyAt(state: RunState, x: number, y: number): Enemy | undefined {
  return state.enemies.find((e) => e.x === x && e.y === y);
}

function occupied(state: RunState, x: number, y: number, ignore?: Enemy): boolean {
  if (state.player.x === x && state.player.y === y) return true;
  return state.enemies.some((e) => e !== ignore && e.x === x && e.y === y);
}

function blockedFor(state: RunState, x: number, y: number, ignore?: Enemy): boolean {
  return !isWalkable(state.tiles, x, y) || occupied(state, x, y, ignore);
}

function refreshVision(state: RunState): void {
  const { player, w, h } = state;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      state.vis[y]![x] = false;
    }
  }
  for (let y = player.y - VISION; y <= player.y + VISION; y++) {
    for (let x = player.x - VISION; x <= player.x + VISION; x++) {
      if (y < 0 || x < 0 || y >= h || x >= w) continue;
      const md = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (md > VISION) continue;
      if (lineOfSight(state.tiles, player.x, player.y, x, y)) {
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
      state.fx.push({
        kind: "banner",
        text: r.name,
        sub: r.desc,
        color: "#e8c36a",
      });
      state.fx.push({ kind: "sfx", name: "resonate" });
      log(state, `Combo! ${r.name}: ${r.desc}`);
    }
  }
}

function feedHollow(state: RunState, id: IdentityId, why: string): void {
  if (id === "hollow") return;
  state.grave.push(id);
  log(state, why);
}

function ignite(state: RunState, x: number, y: number, turns = 4): void {
  if (!isWalkable(state.tiles, x, y)) return;
  const k = key(x, y);
  state.fire[k] = Math.max(state.fire[k] ?? 0, turns);
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

function spendTurn(state: RunState): void {
  if (state.phase === "dead" || state.phase === "won") return;
  state.turn += 1;
  if (state.braceCd > 0) state.braceCd -= 1;
  state.phase = "enemies";
  state.enemyIx = 0;
  state.enemyClock = 0;
  state.fireTicked = false;
}

function pickupGold(state: RunState): void {
  const k = key(state.player.x, state.player.y);
  const g = state.goldMap[k];
  if (g) {
    state.gold += g;
    delete state.goldMap[k];
    log(state, `You pocket ${g} coins.`);
    state.fx.push({ kind: "sfx", name: "harvest" });
    state.fx.push({
      kind: "text",
      x: state.player.x,
      y: state.player.y,
      text: `+${g}`,
      color: "#e8c36a",
    });
  }
}

function aoeOnPop(state: RunState, x: number, y: number): void {
  if (!hasRes(state, "saintbones")) return;
  for (const d of DIR_LIST) {
    const v = DIRS[d];
    const e = enemyAt(state, x + v.x, y + v.y);
    if (!e) continue;
    hurtEnemy(state, e, 2, false);
  }
}

export function takeHit(state: RunState, src = "a bonk"): void {
  if (state.phase === "dead" || state.phase === "won") return;
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
  e.flash = 1;
  state.fx.push({
    kind: "text",
    x: e.x,
    y: e.y,
    text: `-${dmg}`,
    color: "#f2e6c8",
  });
  fxBurst(state, e.x, e.y, def(e.id).color, 8);
  if (e.hp > 0) return false;
  killEnemy(state, e, canLoot);
  return true;
}

function killEnemy(state: RunState, e: Enemy, canLoot: boolean): void {
  state.enemies = state.enemies.filter((x) => x !== e);
  state.kills += 1;
  state.blood[key(e.x, e.y)] = (state.blood[key(e.x, e.y)] ?? 0) + 1;
  fxBurst(state, e.x, e.y, def(e.id).color, 18);
  if (e.id === "hollow") {
    state.pending = e;
    state.phase = "decision";
    log(state, "King Empty wobbles. He's wearing every outfit you skipped!");
    state.fx.push({ kind: "sfx", name: "win" });
    return;
  }
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
    state.fx.push({
      kind: "banner",
      text: `${def(id).name} Memory`,
      sub: def(id).echo,
      color: def(id).color,
    });
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
      silentFeed
        ? `The fire mailed ${def(e.id).name}'s costume to King Empty.`
        : harvestLine(e.id),
    );
  }
  state.fx.push({
    kind: "text",
    x: e.x,
    y: e.y,
    text: `+${g}g`,
    color: "#e8c36a",
  });
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
    feedHollow(
      state,
      lost,
      `The ${def(lost).name} costume slips off the bottom. King Empty yoinked it.`,
    );
  }
  log(state, wearLine(e.id));
  uniqueDiscover(state);
}

function effectiveMax(state: RunState): number {
  let m = state.maxStack;
  if (hasRes(state, "manyfaces")) m += 1;
  return m;
}

function spawnEnemy(
  state: RunState,
  x: number,
  y: number,
  id: IdentityId,
  elite = false,
): void {
  const d = def(id);
  let hp = d.hp + Math.floor((state.floor - 1) / 2);
  if (elite) hp += 3;
  if (id === "hollow") hp = 8 + state.grave.length;
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
  });
}

function pickOpen(state: RunState, tiles: { x: number; y: number }[], avoid: number): { x: number; y: number } | null {
  const opts = tiles.filter((p) => {
    if (!isWalkable(state.tiles, p.x, p.y)) return false;
    if (occupied(state, p.x, p.y)) return false;
    const t = state.tiles[p.y]![p.x];
    if (t === "stairs" || t === "shrine" || t === "shop") return false;
    const md = Math.abs(p.x - state.player.x) + Math.abs(p.y - state.player.y);
    if (md < avoid) return false;
    return true;
  });
  if (!opts.length) return null;
  return rng.pick(opts);
}

function populateFloor(state: RunState): void {
  const pool = enemyPool(state.floor);
  for (const room of state.rooms) {
    if (room.kind === "start") {
      const spots = floorTiles(room);
      const p = pickOpen(state, spots, 2);
      if (p) spawnEnemy(state, p.x, p.y, "rat");
      continue;
    }
    const spots = floorTiles(room);
    if (room.kind === "boss") {
      spawnEnemy(state, room.cx, room.cy, "hollow");
      continue;
    }
    if (room.kind === "treasure") {
      const g = pickOpen(state, spots, 0);
      if (g) state.goldMap[key(g.x, g.y)] = rng.range(5, 9);
      const r = pickOpen(state, spots, 2);
      if (r && rng.chance(0.6)) spawnEnemy(state, r.x, r.y, "rat");
      continue;
    }
    if (room.kind === "elite") {
      const p = pickOpen(state, spots, 3);
      if (p) spawnEnemy(state, p.x, p.y, rng.chance(0.5) ? "knight" : "guard", true);
      const p2 = pickOpen(state, spots, 2);
      if (p2) spawnEnemy(state, p2.x, p2.y, "rat");
      continue;
    }
    const n =
      room.kind === "exit"
        ? rng.range(1, 2)
        : state.floor === 1
          ? 1
          : 1 + Math.floor(state.floor / 2) + rng.int(2);
    const count = Math.min(n, 4);
    for (let i = 0; i < count; i++) {
      const p = pickOpen(state, spots, room.kind === "exit" ? 2 : 2);
      if (!p) break;
      spawnEnemy(state, p.x, p.y, rng.pick(pool));
    }
    if (room.kind === "combat" && rng.chance(0.25)) {
      const g = pickOpen(state, spots, 0);
      if (g) state.goldMap[key(g.x, g.y)] = rng.range(2, 5);
    }
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
  const maxStack = hasPerk(meta, "stack5") ? 5 : 4;
  const state: RunState = {
    seed,
    floor: 1,
    turn: 0,
    phase: "playing",
    tiles: [],
    w: 0,
    h: 0,
    rooms: [],
    player: { x: 0, y: 0, facing: "down", stack: ["vagabond"] },
    enemies: [],
    goldMap: {},
    fire: {},
    seen: [],
    vis: [],
    blood: {},
    grave: [],
    log: ["Pip wakes up in stripey PJs. King Empty is already collecting hats."],
    fx: [],
    pending: null,
    maxStack,
    memories: [],
    ash: {},
    discovered: [],
    worn: ["vagabond"],
    kills: 0,
    gold: hasPerk(meta, "gold") ? 4 : 0,
    stitches: hasPerk(meta, "stitch") ? 2 : 1,
    priestBound: false,
    braceCd: 0,
    scroungeUsed: false,
    knightOathUsed: false,
    interactLock: false,
    enemyIx: 0,
    enemyClock: 0,
    fireTicked: false,
    movedThisTurn: false,
    isDaily,
    shrineSpent: {},
    shopSpent: {},
    extraSlotBought: false,
    hollowMimic: null,
    hollowMimicTurns: 0,
  };
  loadFloor(state, meta);
  log(state, "Lucky Pin stuck on. Bump costumes. Wear them, or snack them.");
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
  const start = dung.rooms.find((r) => r.kind === "start") ?? dung.rooms[0]!;
  state.player.x = start.cx;
  state.player.y = start.cy;
  populateFloor(state);
  floorStartBonuses(state);
  revealStart(state);
  refreshVision(state);
  state.fx.push({ kind: "floorTitle" });
  state.fx.push({ kind: "sfx", name: "stairs" });
  log(state, `Floor ${state.floor} — ${FLOOR_NAMES[state.floor] ?? "Below"}.`);
}

function descend(state: RunState): void {
  if (state.floor >= LAST_FLOOR) {
    log(state, "No more stairs. King Empty's fort is this way.");
    return;
  }
  state.floor += 1;
  loadFloor(state);
}

function afterMove(state: RunState, fromX: number, fromY: number): void {
  pickupGold(state);
  if (hasRes(state, "cinderstep")) ignite(state, fromX, fromY, 3);
  const t = state.tiles[state.player.y]![state.player.x];
  const k = key(state.player.x, state.player.y);
  if (t === "stairs") {
    descend(state);
    return;
  }
  if (state.interactLock) return;
  if (t === "shrine" && !state.shrineSpent[k]) {
    state.phase = "shrine";
    state.interactLock = true;
    return;
  }
  if (t === "shop" && !state.shopSpent[k]) {
    state.phase = "shop";
    state.interactLock = true;
  }
}

function attackMelee(state: RunState, e: Enemy): void {
  const dmg = meleeDamage(state);
  state.fx.push({ kind: "sfx", name: "hit" });
  state.fx.push({ kind: "hitstop", ms: 50 });
  state.fx.push({ kind: "shake", mag: 4 });
  if (echoSet(state).has("pyromancer") || top(state) === "pyromancer") {
    ignite(state, e.x, e.y, 3);
  }
  const dead = hurtEnemy(state, e, dmg, true);
  if (!dead && top(state) === "guard") {
    const v = DIRS[state.player.facing];
    const nx = e.x + v.x;
    const ny = e.y + v.y;
    if (isWalkable(state.tiles, nx, ny) && !occupied(state, nx, ny)) {
      e.x = nx;
      e.y = ny;
      log(state, "BONK — they hop back.");
    } else {
      e.stun = 1;
      log(state, "BONK — they hit the wall. Clonk.");
    }
  }
}

export function tryMove(state: RunState, dx: number, dy: number): boolean {
  if (state.phase !== "playing") return false;
  if (dx === 0 && dy === 0) return false;
  state.player.facing = dirFromDelta(dx, dy);
  const floorBefore = state.floor;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  const e = enemyAt(state, nx, ny);
  state.movedThisTurn = true;
  if (e) {
    attackMelee(state, e);
    if (inPhase(state, "decision")) return true;
    spendTurn(state);
    return true;
  }
  if (!isWalkable(state.tiles, nx, ny)) return false;
  const fx = state.player.x;
  const fy = state.player.y;
  state.player.x = nx;
  state.player.y = ny;
  const k = key(nx, ny);
  if (state.tiles[fy]![fx] === "shrine" || state.tiles[fy]![fx] === "shop") {
    if (k !== key(fx, fy)) state.interactLock = false;
  }
  state.fx.push({ kind: "sfx", name: "move" });
  afterMove(state, fx, fy);
  refreshVision(state);
  if (state.floor !== floorBefore) return true;
  if (state.phase === "playing") spendTurn(state);
  return true;
}

export function waitTurn(state: RunState): boolean {
  if (state.phase !== "playing") return false;
  state.movedThisTurn = false;
  if (top(state) === "vagabond" && !state.scroungeUsed) {
    state.scroungeUsed = true;
    state.gold += 1;
    log(state, "You find a coin in the PJs.");
    state.fx.push({ kind: "sfx", name: "harvest" });
  } else {
    log(state, "You wait. Pip hums a snack song.");
  }
  spendTurn(state);
  return true;
}

function shootLine(state: RunState): boolean {
  const range = 3 + rangeBonus(state);
  const v = DIRS[state.player.facing];
  let x = state.player.x;
  let y = state.player.y;
  for (let i = 0; i < range; i++) {
    x += v.x;
    y += v.y;
    if (!isWalkable(state.tiles, x, y) && !enemyAt(state, x, y)) return true;
    const e = enemyAt(state, x, y);
    if (e) {
      const dmg = rangedDamage(state);
      state.fx.push({ kind: "sfx", name: "hit" });
      state.fx.push({ kind: "hitstop", ms: 40 });
      if (hasRes(state, "deathwind")) {
        state.gold += 1;
        state.fx.push({
          kind: "text",
          x: e.x,
          y: e.y,
          text: "+1g",
          color: "#e8c36a",
        });
      }
      hurtEnemy(state, e, dmg, true);
      return true;
    }
  }
  log(state, "Pew! It hits a wall. Rude wall.");
  return true;
}

function dash(state: RunState): boolean {
  const floorBefore = state.floor;
  const v = DIRS[state.player.facing];
  let last: { x: number; y: number } | null = null;
  let x = state.player.x;
  let y = state.player.y;
  for (let i = 0; i < 2; i++) {
    x += v.x;
    y += v.y;
    if (!isWalkable(state.tiles, x, y)) break;
    if (!occupied(state, x, y)) last = { x, y };
  }
  if (!last) {
    log(state, "No zoom room!");
    return false;
  }
  const fx = state.player.x;
  const fy = state.player.y;
  state.player.x = last.x;
  state.player.y = last.y;
  state.movedThisTurn = true;
  fxBurst(state, last.x, last.y, "#d48962", 8);
  afterMove(state, fx, fy);
  refreshVision(state);
  return state.floor === floorBefore;
}

function flip(state: RunState): boolean {
  const v = DIRS[state.player.facing];
  const e = enemyAt(state, state.player.x + v.x, state.player.y + v.y);
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
  const hits: Enemy[] = [];
  for (const d of DIR_LIST) {
    const v = DIRS[d];
    const e = enemyAt(state, state.player.x + v.x, state.player.y + v.y);
    if (e) hits.push(e);
  }
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
    ignite(state, x, y, 5);
    const e = enemyAt(state, x, y);
    if (e) hurtEnemy(state, e, 1, true);
  }
  state.fx.push({ kind: "sfx", name: "fire" });
  log(state, "Hot Foot! The floor is spicy now.");
  return true;
}

export function usePower(state: RunState): boolean {
  if (state.phase !== "playing") return false;
  state.movedThisTurn = false;
  const id = top(state);
  let ok = false;
  switch (id) {
    case "vagabond":
      return waitTurn(state);
    case "rat":
      ok = dash(state);
      break;
    case "guard":
      if (state.braceCd > 0) {
        log(state, `Brace is recharging. ${state.braceCd} turns.`);
        return false;
      }
      if (state.stitches >= MAX_STITCH) {
        log(state, "Too many Lucky Pins. They'll fall off.");
        return false;
      }
      state.stitches += 1;
      state.braceCd = 5;
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
        log(state, "Bubbles already popped this floor.");
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
      return waitTurn(state);
  }
  if (!ok) return false;
  if (inPhase(state, "decision", "shrine", "shop")) {
    return true;
  }
  spendTurn(state);
  return true;
}

export function chooseWear(state: RunState): void {
  if (state.phase !== "decision" || !state.pending) return;
  const e = state.pending;
  state.pending = null;
  state.fx.push({ kind: "sfx", name: "wear" });
  state.fx.push({
    kind: "banner",
    text: def(e.id).name,
    sub: def(e.id).title,
    color: def(e.id).color,
  });
  fxBurst(state, state.player.x, state.player.y, def(e.id).color, 20);
  wearEnemy(state, e);
  if (inPhase(state, "won")) return;
  state.movedThisTurn = false;
  spendTurn(state);
}

export function chooseHarvest(state: RunState): void {
  if (state.phase !== "decision" || !state.pending) return;
  const e = state.pending;
  state.pending = null;
  if (e.id === "hollow") {
    state.phase = "won";
    log(state, "You send King Empty home. Pip keeps the pile. Snack victory!");
    state.fx.push({
      kind: "banner",
      text: "King Sent Home!",
      sub: "Pip keeps the pile.",
      color: "#e8c36a",
    });
    state.fx.push({ kind: "sfx", name: "win" });
    return;
  }
  harvestEnemy(state, e, false);
  state.fx.push({ kind: "sfx", name: "harvest" });
  state.movedThisTurn = false;
  spendTurn(state);
}

export function shrinePick(state: RunState, choice: number): void {
  if (state.phase !== "shrine") return;
  const k = key(state.player.x, state.player.y);
  if (choice === 1) {
    state.player.stack.reverse();
    log(state, "WHOOSH. Pile flipped upside down.");
    uniqueDiscover(state);
    state.fx.push({ kind: "sfx", name: "wear" });
  } else if (choice === 2) {
    if (state.player.stack.length <= 1) {
      log(state, "Nope — that's Pip's last costume.");
    } else {
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
  spendTurn(state);
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
    };
    wearEnemy(state, fake);
    log(state, `Mystery box! You're ${def(id).name} now.`);
    state.fx.push({ kind: "sfx", name: "wear" });
    state.fx.push({
      kind: "banner",
      text: def(id).name,
      sub: "Bought, not booped.",
      color: def(id).color,
    });
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
  state.shopSpent[key(state.player.x, state.player.y)] = true;
  state.phase = "playing";
  spendTurn(state);
}

function cardinalLine(
  state: RunState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  range: number,
): boolean {
  if (x0 !== x1 && y0 !== y1) return false;
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  const dist = Math.abs(x1 - x0) + Math.abs(y1 - y0);
  if (dist < 2 || dist > range) return false;
  let x = x0;
  let y = y0;
  for (let i = 0; i < dist - 1; i++) {
    x += dx;
    y += dy;
    if (!isWalkable(state.tiles, x, y)) return false;
    if (occupied(state, x, y)) return false;
  }
  return true;
}

function tickFire(state: RunState): void {
  const next: Record<string, number> = {};
  const spots = Object.keys(state.fire);
  for (const k of spots) {
    const n = (state.fire[k] ?? 0) - 1;
    if (n > 0) next[k] = n;
    const [xs, ys] = k.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (state.player.x === x && state.player.y === y) {
      log(state, "Spicy! The pile is on fire.");
      takeHit(state, "the fire");
      state.fx.push({ kind: "sfx", name: "fire" });
    }
    const e = enemyAt(state, x, y);
    if (e && e.id !== "hollow") {
      hurtEnemy(state, e, 1, false);
    }
  }
  state.fire = next;
}

function actEnemy(state: RunState, e: Enemy): void {
  if (state.phase === "dead" || state.phase === "won") return;
  if (e.stun > 0) {
    e.stun -= 1;
    return;
  }
  e.flash = Math.max(0, e.flash - 0.5);
  const px = state.player.x;
  const py = state.player.y;
  const md = Math.abs(e.x - px) + Math.abs(e.y - py);

  if (e.id === "hollow") {
    if (state.hollowMimicTurns > 0) state.hollowMimicTurns -= 1;
    if (state.hollowMimicTurns <= 0 && state.grave.length && rng.chance(0.35)) {
      state.hollowMimic = rng.pick(state.grave);
      state.hollowMimicTurns = 3;
      log(state, `King Empty tries on your ${def(state.hollowMimic).name}!`);
      state.fx.push({
        kind: "banner",
        text: `King Empty: ${def(state.hollowMimic).name}`,
        color: "#c8b6ff",
      });
    }
  }

  const mimic = e.id === "hollow" ? state.hollowMimic : null;
  const archerish = e.id === "archer" || mimic === "archer";
  const range = 3 + (mimic === "archer" ? 1 : 0);

  if (archerish && cardinalLine(state, e.x, e.y, px, py, range)) {
    e.facing = dirFromDelta(px - e.x, py - e.y);
    log(state, `${def(e.id).name} pews you!`);
    takeHit(state, "an arrow");
    state.fx.push({ kind: "sfx", name: "hit" });
    return;
  }

  if (md === 1) {
    e.facing = dirFromDelta(px - e.x, py - e.y);
    if ((e.id === "thief" || mimic === "thief") && rng.chance(0.35) && state.gold > 0) {
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
    let hits = def(e.id).damage;
    if (e.id === "hollow") {
      const u = new Set(state.grave).size;
      hits = 1 + Math.min(5, Math.ceil(u / 2));
    }
    if (e.elite) hits += 1;
    log(state, `${def(e.id).name} bonks you!`);
    for (let i = 0; i < hits; i++) {
      takeHit(state, "a strike");
      if (inPhase(state, "dead")) break;
    }
    state.fx.push({ kind: "sfx", name: "hit" });
    state.fx.push({ kind: "shake", mag: 6 });
    return;
  }

  const sees = md <= 10 && lineOfSight(state.tiles, e.x, e.y, px, py);
  if (sees) {
    const step = nextStep(
      (x, y) => blockedFor(state, x, y, e),
      e.x,
      e.y,
      px,
      py,
    );
    if (step && !(step.x === px && step.y === py)) {
      e.facing = dirFromDelta(step.x - e.x, step.y - e.y);
      e.x = step.x;
      e.y = step.y;
      return;
    }
  }
  if (rng.chance(0.2)) {
    const d = rng.pick(DIR_LIST);
    const v = DIRS[d];
    const nx = e.x + v.x;
    const ny = e.y + v.y;
    if (!blockedFor(state, nx, ny, e)) {
      e.facing = d;
      e.x = nx;
      e.y = ny;
    }
  }
}

export function stepEnemies(state: RunState, dt: number): void {
  if (state.phase !== "enemies") return;
  if (!state.fireTicked) {
    state.fireTicked = true;
    tickFire(state);
    if (state.phase !== "enemies") return;
  }
  if (state.enemies.length === 0) {
    state.phase = "playing";
    return;
  }
  state.enemyClock += dt;
  const pace = 0.055;
  while (state.phase === "enemies" && state.enemyClock >= pace) {
    state.enemyClock -= pace;
    const e = state.enemies[state.enemyIx];
    if (e) actEnemy(state, e);
    state.enemyIx += 1;
    if (state.enemyIx >= state.enemies.length) {
      state.phase = "playing";
      state.enemyIx = 0;
      refreshVision(state);
      break;
    }
  }
}

export function clickStep(state: RunState, tx: number, ty: number): boolean {
  if (state.phase !== "playing") return false;
  if (tx === state.player.x && ty === state.player.y) return waitTurn(state);
  const step = nextStep(
    (x, y) => !isWalkable(state.tiles, x, y) && !enemyAt(state, x, y),
    state.player.x,
    state.player.y,
    tx,
    ty,
  );
  if (!step) return false;
  return tryMove(state, step.x - state.player.x, step.y - state.player.y);
}

export { refreshVision, effectiveMax, harvestGoldFor };

export function hollowDamagePreview(state: RunState): number {
  const u = new Set(state.grave).size;
  return 1 + Math.min(5, Math.ceil(u / 2));
}

export function tileAt(tiles: TileKind[][], x: number, y: number): TileKind | undefined {
  return tiles[y]?.[x];
}

export { roomAt };
