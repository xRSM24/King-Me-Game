import { drawSoul } from "./character.ts";
import { def } from "./identities.ts";
import { hasPerk, type Meta } from "./meta.ts";
import { goalLabel } from "./sim.ts";
import type { RunState } from "./types.ts";
import { PATH_END, RUN_GOAL, TILE } from "./types.ts";
import { gunOf, sparkBonus, weaponLevel, xpIntoLevel } from "./weapons.ts";

export interface Cam {
  x: number;
  y: number;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  x: number,
  y: number,
  time: number,
): void {
  const t = state.tiles[y]![x]!;
  const px = x * TILE;
  const py = y * TILE;
  const vis = state.vis[y]![x];
  const seen = state.seen[y]![x];
  if (!seen) {
    ctx.fillStyle = "#7ed0f5";
    ctx.fillRect(px, py, TILE, TILE);
    return;
  }

  if (t === "wall") {
    ctx.fillStyle = vis ? "#b07cff" : "#8a5ad0";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = vis ? "#f4c6ff" : "#c090e0";
    ctx.fillRect(px, py, TILE, 12);
    if (vis && (x + y) % 3 === 0) {
      ctx.fillStyle = "#ffe566";
      ctx.beginPath();
      ctx.arc(px + TILE / 2, py + 22, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = vis ? "#3b2152" : "rgba(59,33,82,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
    return;
  }

  const alt = (x + y) % 2 === 0;
  ctx.fillStyle = vis ? (alt ? "#ffe9a8" : "#ffd27a") : "#e8c878";
  ctx.fillRect(px, py, TILE, TILE);
  if (vis) {
    ctx.strokeStyle = "rgba(59,33,82,0.12)";
    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
    const deco = (x * 13 + y * 29) % 8;
    if (deco === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(px + 14, py + 16, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (deco === 3) {
      ctx.fillStyle = "#7ed957";
      ctx.beginPath();
      ctx.arc(px + 34, py + 32, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const blood = state.blood[`${x},${y}`];
  if (blood) {
    ctx.fillStyle = vis ? "rgba(255,122,160,0.7)" : "rgba(255,122,160,0.25)";
    ctx.beginPath();
    ctx.arc(px + 18, py + 22, 3 + blood, 0, Math.PI * 2);
    ctx.arc(px + 30, py + 28, 2 + blood, 0, Math.PI * 2);
    ctx.fill();
  }

  if (t === "stairs") {
    const pulse = 0.7 + Math.sin(time / 120) * 0.3;
    ctx.fillStyle = vis ? `rgba(61,204,106,${pulse})` : "#2a8a4a";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3b2152";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    if (vis) {
      ctx.fillStyle = "#3b2152";
      ctx.font = "800 9px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NEXT", px + TILE / 2, py + 44);
    }
  }
  if (t === "shrine") {
    ctx.fillStyle = vis ? "#9ae8ff" : "#5aa8c8";
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2, py + 8);
    ctx.lineTo(px + TILE - 10, py + TILE - 10);
    ctx.lineTo(px + 10, py + TILE - 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3b2152";
    ctx.stroke();
    ctx.fillStyle = "#ffe566";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + 24, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t === "shop") {
    ctx.fillStyle = vis ? "#ffb0e0" : "#c070a0";
    roundRect(ctx, px + 8, py + 10, TILE - 16, TILE - 18, 10);
    ctx.fill();
    ctx.strokeStyle = "#3b2152";
    ctx.stroke();
    ctx.fillStyle = "#3b2152";
    ctx.font = "800 14px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$", px + TILE / 2, py + 32);
  }

  const gold = state.goldMap[`${x},${y}`];
  if (gold && vis) {
    const gx = px + TILE * 0.5;
    const gy = py + TILE * 0.62;
    ctx.fillStyle = "#ffe566";
    ctx.strokeStyle = "#3b2152";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e89a00";
    ctx.font = "800 10px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$", gx, gy + 3);
  }

  const fire = state.fire[`${x},${y}`];
  if (fire && vis) {
    const flick = 0.6 + Math.sin(time / 70 + x + y) * 0.4;
    ctx.fillStyle = `rgba(232,80,30,${0.35 * flick})`;
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = `rgba(255,180,60,${0.7 * flick})`;
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 36);
    ctx.quadraticCurveTo(px + 10, py + 16, px + 24, py + 8);
    ctx.quadraticCurveTo(px + 36, py + 18, px + 32, py + 36);
    ctx.fill();
  }
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  meta: Meta,
  viewW: number,
): void {
  const mw = 148;
  const mh = 108;
  const x0 = viewW - mw - 16;
  const y0 = 16;
  ctx.fillStyle = "#fffdf6";
  roundRect(ctx, x0, y0, mw, mh, 16);
  ctx.fill();
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 3;
  ctx.stroke();
  const sx = (mw - 16) / state.w;
  const sy = (mh - 16) / state.h;
  const revealAll = hasPerk(meta, "maps");
  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      if (!revealAll && !state.seen[y]![x]) continue;
      const t = state.tiles[y]![x];
      if (t === "wall") continue;
      let col = state.vis[y]![x] ? "#ffd27a" : "#e8c070";
      if (t === "stairs") col = "#3dcc6a";
      if (t === "shrine") col = "#9ae8ff";
      if (t === "shop") col = "#d07cff";
      ctx.fillStyle = col;
      ctx.fillRect(x0 + 8 + x * sx, y0 + 8 + y * sy, Math.max(1.2, sx), Math.max(1.2, sy));
    }
  }
  const boss = state.rooms.find((r) => r.kind === "boss");
  if (boss) {
    ctx.fillStyle = "#c8b6ff";
    ctx.beginPath();
    ctx.arc(x0 + 8 + boss.cx * sx, y0 + 8 + boss.cy * sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3b2152";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = def(state.player.stack[0] ?? "vagabond").color;
  ctx.beginPath();
  ctx.arc(
    x0 + 8 + state.player.x * sx,
    y0 + 8 + state.player.y * sy,
    4,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const e of state.enemies) {
    if (!revealAll && !state.seen[Math.floor(e.y)]?.[Math.floor(e.x)]) continue;
    ctx.fillStyle = e.id === "hollow" ? "#c8b6ff" : def(e.id).color;
    ctx.fillRect(x0 + 8 + e.x * sx, y0 + 8 + e.y * sy, 3.5, 3.5);
  }
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  cam: Cam,
  viewW: number,
  viewH: number,
  time: number,
  meta: Meta,
  flash: { color: string; a: number } | null,
): void {
  ctx.save();
  ctx.fillStyle = "#7ed0f5";
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.translate(-cam.x, -cam.y);

  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const x1 = Math.min(state.w, Math.ceil((cam.x + viewW) / TILE) + 1);
  const y1 = Math.min(state.h, Math.ceil((cam.y + viewH) / TILE) + 1);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) drawTile(ctx, state, x, y, time);
  }

  for (const e of state.enemies) {
    const etx = Math.floor(e.x);
    const ety = Math.floor(e.y);
    if (!state.vis[ety]?.[etx]) continue;
    const cx = e.x * TILE;
    const cy = e.y * TILE + 4;
    if (e.id === "hollow") {
      const faces = state.grave.slice(-5);
      faces.forEach((id, i) => {
        drawSoul(ctx, id, cx + 2 + i, cy + 10 - i * 7, TILE * 0.55, time, { ghost: true });
      });
      ctx.save();
      if (e.flash > 0) ctx.globalCompositeOperation = "lighter";
      drawSoul(ctx, "hollow", cx, cy - 8, TILE * 0.95, time, { elite: true, facing: e.facing });
      ctx.restore();
      const ratio = e.hp / e.maxHp;
      ctx.fillStyle = "#3b2152";
      ctx.fillRect(cx - 22, cy - 42, 44, 6);
      ctx.fillStyle = "#c8b6ff";
      ctx.fillRect(cx - 22, cy - 42, 44 * ratio, 6);
    } else {
      ctx.save();
      if (e.flash > 0) ctx.filter = "brightness(2)";
      drawSoul(ctx, e.id, cx, cy, TILE * 0.88, time, { elite: e.elite, facing: e.facing });
      ctx.restore();
      if (e.hp < e.maxHp || e.elite) {
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = "#3b2152";
        ctx.fillRect(cx - 14, cy - 28, 28, 5);
        ctx.fillStyle = def(e.id).color;
        ctx.fillRect(cx - 14, cy - 28, 28 * ratio, 5);
      }
    }
  }

  const p = state.player;
  const pcx = p.x * TILE;
  const pcy = p.y * TILE + 4;
  const stack = p.stack;
  const ghost = p.iFrames > 0 && Math.sin(time / 40) > 0;
  for (let i = stack.length - 1; i >= 1; i--) {
    drawSoul(ctx, stack[i]!, pcx + i * 2, pcy + i * 3, TILE * 0.72 - i, time, {
      ghost: true,
      facing: p.facing,
    });
  }
  if (stack[0]) {
    drawSoul(ctx, stack[0], pcx, pcy, TILE * 0.92, time, {
      player: true,
      facing: p.facing,
      ghost,
    });
  }

  for (const s of state.shots) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x * TILE, s.y * TILE, Math.max(5, s.r * TILE * 2.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3b2152";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(pcx, pcy, 8, pcx, pcy, TILE * 3.2);
  const rgb = hexToRgb(def(stack[0] ?? "vagabond").color);
  glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.16)`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(pcx - TILE * 3.2, pcy - TILE * 3.2, TILE * 6.4, TILE * 6.4);

  ctx.restore();

  const vignette = ctx.createRadialGradient(
    viewW / 2,
    viewH / 2,
    Math.min(viewW, viewH) * 0.45,
    viewW / 2,
    viewH / 2,
    Math.max(viewW, viewH) * 0.72,
  );
  vignette.addColorStop(0, "rgba(126,208,245,0)");
  vignette.addColorStop(1, "rgba(80,140,200,0.2)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewW, viewH);

  if (flash && flash.a > 0) {
    const rgb = hexToRgb(flash.color);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${flash.a * 0.22})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  drawMinimap(ctx, state, meta, viewW);

  ctx.textAlign = "left";
  ctx.strokeStyle = "#fff6c8";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.font = "800 18px Fredoka, Nunito, sans-serif";
  ctx.fillStyle = "#ff5a8a";
  const goal = `${RUN_GOAL}  ·  ${state.pathProgress + 1} / ${PATH_END + 1}`;
  ctx.strokeText(goal, 18, 28);
  ctx.fillText(goal, 18, 28);

  ctx.font = "800 16px Fredoka, Nunito, sans-serif";
  ctx.fillStyle = "#3b2152";
  const floorGoal = goalLabel(state);
  ctx.strokeText(floorGoal, 18, 52);
  ctx.fillText(floorGoal, 18, 52);

  ctx.fillStyle = "#e89a00";
  ctx.strokeText(`${state.gold} coins`, 18, 76);
  ctx.fillText(`${state.gold} coins`, 18, 76);
  ctx.fillStyle = "#ff7aa0";
  const pins = `${state.stitches} pin${state.stitches === 1 ? "" : "s"}`;
  ctx.strokeText(pins, 130, 76);
  ctx.fillText(pins, 130, 76);

  const lv = weaponLevel(state.runXp);
  const xp = xpIntoLevel(state.runXp);
  const gun = gunOf(stack[0] ?? "vagabond");
  const perm = sparkBonus(state.spark);
  const mx = viewW - 164;
  ctx.fillStyle = "#3b2152";
  ctx.strokeText(`${gun.name} Lv ${lv}`, mx, 142);
  ctx.fillText(`${gun.name} Lv ${lv}`, mx, 142);
  ctx.fillStyle = "#fff6c8";
  roundRect(ctx, mx, 150, 148, 10, 5);
  ctx.fill();
  ctx.fillStyle = "#7ed957";
  roundRect(ctx, mx, 150, Math.max(4, 148 * (xp.have / xp.need)), 10, 5);
  ctx.fill();
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 2;
  roundRect(ctx, mx, 150, 148, 10, 5);
  ctx.stroke();

  const face = def(stack[0] ?? "vagabond");
  ctx.textAlign = "center";
  ctx.fillStyle = face.color;
  ctx.font = "800 16px Fredoka, Nunito, sans-serif";
  const power = `Hold WASD to run · hold Space to ${gun.name}${state.spark ? ` · Spark +${Math.round(perm.dmg * 100)}%` : ""}`;
  ctx.strokeText(power, viewW / 2, viewH - 22);
  ctx.fillText(power, viewW / 2, viewH - 22);
}

export function drawTitleBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
): void {
  ctx.fillStyle = "#7ed0f5";
  ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.82;
  const sunY = h * 0.16;
  ctx.fillStyle = "#ffe566";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "#ffe566";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time / 900;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * 58, sunY + Math.sin(a) * 58);
    ctx.lineTo(sunX + Math.cos(a) * 78, sunY + Math.sin(a) * 78);
    ctx.stroke();
  }

  ctx.fillStyle = "#7ed957";
  ctx.beginPath();
  ctx.ellipse(w * 0.2, h + 40, w * 0.55, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9be86a";
  ctx.beginPath();
  ctx.ellipse(w * 0.75, h + 20, w * 0.5, h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 180 + time * 0.018) % (w + 160)) - 80;
    const y = 40 + (i % 3) * 36;
    cloud(ctx, x, y, 28 + (i % 3) * 6);
  }

  ctx.fillStyle = "#ffe566";
  for (let i = 0; i < 10; i++) {
    const x = ((i * 97 + time * 0.04) % (w + 40)) - 20;
    const y = 18 + ((i * 73) % Math.floor(h * 0.35));
    star(ctx, x, y, 3 + (i % 3));
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.9, y + 6, r * 0.75, 0, Math.PI * 2);
  ctx.arc(x - r * 0.8, y + 8, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const b = a + Math.PI / 5;
    const cmd = i === 0 ? ctx.moveTo.bind(ctx) : ctx.lineTo.bind(ctx);
    cmd(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
}
