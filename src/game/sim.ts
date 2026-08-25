import { def, enemyPool, harvestLine, popLine, wearLine } from "./identities.ts";
import { floorTiles, generateDungeon, isWalkable, lineOfSight, roomAt } from "./dungeon.ts";
import { canStand, dist, slide } from "./physics.ts";
import { Rng } from "./rng.ts";
import { activeResonances, echoSet, hasRes } from "./resonances.ts";
import { hasPerk, type Meta } from "./meta.ts";
import type { Enemy, IdentityId, PlayPhase, Room, RunState, Shot } from "./types.ts";
import {
  DIR_LIST,
  DIRS,
  MAX_STITCH,
  PATH_END,
  VISION,
  dirFromDelta,
  key,
} from "./types.ts";
import { gunOf, makeShots, weaponLevel, weaponRate } from "./weapons.ts";

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

function grantXp(state: RunState, amount: number): void {
  const before = weaponLevel(state.runXp);
  state.runXp += amount;
  const after = weaponLevel(state.runXp);
  if (after > before) {
    log(state, `Gun leveled up! Lv ${after}. This run only.`);
    state.fx.push({
      kind: "banner",
      text: `Gun Lv ${after}`,
      sub: "This life only. Spark is what you keep.",
      color: "#ffe566",
    });
    state.fx.push({ kind: "sfx", name: "resonate" });
  } else {
    state.fx.push({
      kind: "text",
      x: state.player.x,
      y: state.player.y - 0.4,
      text: `+${amount} xp`,
      color: "#7ed957",
    });
  }
}

function killEnemy(state: RunState, e: Enemy, canLoot: boolean): void {
  state.enemies = state.enemies.filter((x) => x !== e);
  state.kills += 1;
  state.blood[key(Math.floor(e.x), Math.floor(e.y))] = 1;
  fxBurst(state, e.x, e.y, def(e.id).color, 18);
  grantXp(state, 3 + e.pathIndex);
  if (e.id === "hollow") {
    state.pending = e;
    state.phase = "decision";
    log(state, "King Empty wobbles. He's wearing every outfit you skipped!");
    state.fx.push({ kind: "sfx", name: "win" });
    return;
  }
  state.goalHave += 1;
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

function spawnEnemy(state: RunState, x: number, y: number, id: IdentityId, elite = false, pathIndex = 0): void {
  const d = def(id);
  let hp: number;
  if (id === "hollow") hp = 22 + state.grave.length * 2 + pathIndex * 2;
  else hp = Math.max(1, Math.round(d.hp * (1 + pathIndex * 0.42) + (elite ? 3 : 0)));
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
    pathIndex,
    gait: 0,
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
  spawnEnemy(state, p.x + 0.5, p.y + 0.5, id, elite, room.pathIndex);
  return true;
}

function swarmCount(pathIndex: number): number {
  if (pathIndex <= 0) return 1;
  return Math.min(9, 2 + pathIndex);
}

function populateTrail(state: RunState): void {
  for (const room of state.rooms) {
    if (room.kind === "treasure") {
      const g = pickOpen(state, floorTiles(room), 0);
      if (g) state.goldMap[key(g.x, g.y)] = rng.range(5, 9);
      continue;
    }
    if (room.kind === "shrine" || room.kind === "shop") continue;
    if (room.kind === "start" || room.pathIndex === 0) {
      spawnInRoom(state, room, "rat", false, 6);
      continue;
    }
    if (room.kind === "boss") {
      spawnEnemy(state, room.cx + 0.5, room.cy + 0.5, "hollow", false, room.pathIndex);
      for (const id of ["archer", "guard", "pyromancer"] as IdentityId[]) {
        spawnInRoom(state, room, id, false, 2);
      }
      continue;
    }
    const n = swarmCount(room.pathIndex);
    const pool = enemyPool(room.pathIndex);
    const elite = room.pathIndex >= 5;
    for (let i = 0; i < n; i++) spawnInRoom(state, room, rng.pick(pool), elite && i === 0, 1);
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
    player: { x: 0, y: 0, facing: "down", stack: ["vagabond"], iFrames: 0, vx: 0, vy: 0, gait: 0, recoil: 0, armed: false },
    enemies: [],
    goldMap: {},
    fire: {},
    seen: [],
    vis: [],
    blood: {},
    grave: [],
    log: ["Goal: follow the trail to King Empty. Guns auto-fire. Spark from getting sent home makes the next gun a little stronger."],
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
    goalNeed: PATH_END,
    goalHave: 0,
    exitX: 0,
    exitY: 0,
    stairsOpen: false,
    atkCd: 0,
    powerCd: 0,
    fireClock: 0,
    moveTarget: null,
    shots: [],
    runXp: 0,
    spark: meta.spark ?? 0,
    fireHeld: 0,
    pathProgress: 0,
  };
  loadTrail(state, meta);
  state.fx.push({
    kind: "banner",
    text: "Goal: King Empty",
    sub: "Follow the trail. Guns auto-fire. Getting sent home leaves Spark.",
    color: "#ff5a8a",
  });
  return state;
}

export function loadTrail(state: RunState, _meta?: Meta): void {
  const dung = generateDungeon(rng, 1);
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
  state.shots = [];
  state.goalNeed = PATH_END;
  state.goalHave = 0;
  state.stairsOpen = false;
  const exit = dung.rooms.find((r) => r.kind === "boss") ?? dung.rooms[dung.rooms.length - 1]!;
  state.exitX = exit.cx;
  state.exitY = exit.cy;
  const start = dung.rooms.find((r) => r.kind === "start") ?? dung.rooms[0]!;
  state.player.x = start.cx + 0.5;
  state.player.y = start.cy + 0.5;
  populateTrail(state);
  floorStartBonuses(state);
  revealStart(state);
  refreshVision(state);
  state.fx.push({ kind: "floorTitle" });
  state.fx.push({ kind: "sfx", name: "stairs" });
  log(state, "Snack Cellar. One rat across the room. Start running and the pin fires on its own.");
}

function afterMove(state: RunState, fromX: number, fromY: number): void {
  pickupGold(state);
  if (hasRes(state, "cinderstep")) ignite(state, fromX, fromY, 1.6);
  const t = tileOf(state.player.x, state.player.y);
  const room = roomAt(state.rooms, t.x, t.y);
  if (room && room.pathIndex > state.pathProgress) {
    state.pathProgress = room.pathIndex;
    state.floor = room.pathIndex + 1;
    if (room.kind === "boss") {
      log(state, "King Empty's Fort. This is the goal.");
      state.fx.push({
        kind: "banner",
        text: "King Empty",
        sub: "The trail ends here.",
        color: "#c8b6ff",
      });
    } else {
      log(state, `Deeper on the trail — room ${room.pathIndex + 1} of ${PATH_END + 1}.`);
    }
  }
  const kind = state.tiles[t.y]![t.x];
  const k = key(t.x, t.y);
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

function enemySpeed(e: Enemy): number {
  const boost = 1 + e.pathIndex * 0.07;
  let base = 2.15;
  if (e.id === "hollow") base = 1.55;
  else if (e.id === "rat") base = 2.6;
  else if (e.id === "thief") base = 2.9;
  else if (e.id === "guard" || e.id === "knight") base = 1.7;
  return base * boost;
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
    const id = rng.pick(enemyPool(Math.min(PATH_END, state.pathProgress + 1)).filter((x) => x !== "hollow"));
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
      pathIndex: Math.max(0, state.pathProgress),
      gait: 0,
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
    e.atkCd = e.id === "hollow" ? 1.15 : Math.max(0.7, 1.05 - e.pathIndex * 0.04);
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
  e.gait += dt * 10;
}

function aimFoe(state: RunState): Enemy | undefined {
  let best: Enemy | undefined;
  let bestD = 8.2;
  const pt = tileOf(state.player.x, state.player.y);
  for (const e of state.enemies) {
    const d = dist(e.x, e.y, state.player.x, state.player.y);
    if (d >= bestD) continue;
    if (!lineOfSight(state.tiles, pt.x, pt.y, Math.floor(e.x), Math.floor(e.y))) continue;
    best = e;
    bestD = d;
  }
  return best;
}

function tryFire(state: RunState): void {
  if (!state.player.armed || state.atkCd > 0) return;
  const id = top(state);
  const gun = gunOf(id);
  const foe = aimFoe(state);
  let aimx = DIRS[state.player.facing].x;
  let aimy = DIRS[state.player.facing].y;
  if (foe) {
    aimx = foe.x - state.player.x;
    aimy = foe.y - state.player.y;
    state.player.facing = dirFromDelta(aimx, aimy);
  }
  state.atkCd = weaponRate(gun.rate, state.runXp, state.spark);
  const shots = makeShots(id, state.player.x, state.player.y, aimx, aimy, state.runXp, state.spark);
  state.shots.push(...shots);
  state.player.recoil = 1;
  const v = DIRS[state.player.facing];
  fxBurst(state, state.player.x + v.x * 0.35, state.player.y + v.y * 0.35, def(id).color, 6);
  state.fx.push({ kind: "sfx", name: "pew" });
}

function tickShots(state: RunState, dt: number): void {
  const next: Shot[] = [];
  for (const s of state.shots) {
    if (state.phase !== "playing") {
      next.push(s);
      continue;
    }
    s.life -= dt;
    if (s.life <= 0) continue;
    const nx = s.x + s.vx * dt;
    const ny = s.y + s.vy * dt;
    if (nx < 0 || ny < 0 || nx >= state.w || ny >= state.h) continue;
    if (!canStand(state.tiles, nx, ny, s.r)) continue;
    s.x = nx;
    s.y = ny;
    const e = enemyNear(state, s.x, s.y, 0.4 + s.r);
    if (e) {
      if (hasRes(state, "deathwind")) {
        state.gold += 1;
        state.fx.push({ kind: "text", x: e.x, y: e.y, text: "+1", color: "#e8c36a" });
      }
      if (echoSet(state).has("pyromancer") || top(state) === "pyromancer") ignite(state, e.x, e.y, 1.2);
      hurtEnemy(state, e, s.dmg, true);
      continue;
    }
    next.push(s);
  }
  state.shots = next;
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
  state.player.recoil = Math.max(0, state.player.recoil - dt * 7);

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
  if (!state.player.armed && (Math.hypot(ax, ay) > 0.2 || state.turn > 1.5)) {
    state.player.armed = true;
  }

  const accel = 22;
  const maxSpd = 4.8;
  const friction = 14;
  if (ax !== 0 || ay !== 0) {
    state.player.vx += ax * accel * dt;
    state.player.vy += ay * accel * dt;
    const sp = Math.hypot(state.player.vx, state.player.vy);
    if (sp > maxSpd) {
      state.player.vx = (state.player.vx / sp) * maxSpd;
      state.player.vy = (state.player.vy / sp) * maxSpd;
    }
    state.player.facing = dirFromDelta(ax, ay);
  } else {
    const damp = Math.exp(-friction * dt);
    state.player.vx *= damp;
    state.player.vy *= damp;
    if (Math.hypot(state.player.vx, state.player.vy) < 0.12) {
      state.player.vx = 0;
      state.player.vy = 0;
    }
  }

  const fromX = state.player.x;
  const fromY = state.player.y;
  const spd = Math.hypot(state.player.vx, state.player.vy);
  if (spd > 0) {
    state.player.gait += dt * (7 + spd * 2.2);
    const n = slide(state.tiles, state.player.x, state.player.y, state.player.vx * dt, state.player.vy * dt, 0.28);
    if (Math.abs(n.x - state.player.x) < 0.0001) state.player.vx = 0;
    if (Math.abs(n.y - state.player.y) < 0.0001) state.player.vy = 0;
    state.player.x = n.x;
    state.player.y = n.y;
    state.movedThisTurn = true;
    if (n.x !== fromX || n.y !== fromY) {
      afterMove(state, fromX, fromY);
      if (state.phase !== "playing") return;
      refreshVision(state);
      if (rng.chance(Math.min(0.35, spd * 0.08))) {
        fxBurst(state, fromX, fromY + 0.22, "#ffe9a8", 3);
      }
    }
  } else {
    state.movedThisTurn = false;
  }

  tryFire(state);
  tickShots(state, dt);
  if (state.phase !== "playing") return;

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
  if (state.pathProgress >= PATH_END) return "Goal: boop King Empty";
  return `Goal: follow the trail · room ${state.pathProgress + 1} / ${PATH_END + 1}`;
}
