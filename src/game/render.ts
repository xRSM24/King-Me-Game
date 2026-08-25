import { def } from "./identities.ts";
import { hasPerk, type Meta } from "./meta.ts";
import { hollowDamagePreview } from "./sim.ts";
import type { IdentityId, RunState } from "./types.ts";
import { FLOOR_NAMES, TILE } from "./types.ts";

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

function shade(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function drawSoul(
  ctx: CanvasRenderingContext2D,
  id: IdentityId,
  x: number,
  y: number,
  s: number,
  time: number,
  opts?: { ghost?: boolean; elite?: boolean },
): void {
  const d = def(id);
  const bob = Math.sin(time / 280 + x * 0.01) * (opts?.ghost ? 0.6 : 1.6);
  ctx.save();
  ctx.translate(x, y + bob);
  if (opts?.ghost) ctx.globalAlpha *= 0.55;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.42, s * 0.32, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.4);
  body.addColorStop(0, shade(d.color, 40));
  body.addColorStop(0.45, d.color);
  body.addColorStop(1, d.glow);
  ctx.fillStyle = body;
  roundRect(ctx, -s * 0.28, -s * 0.18, s * 0.56, s * 0.58, s * 0.16);
  ctx.fill();
  ctx.strokeStyle = shade(d.color, 70);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = shade(d.color, 20);
  ctx.beginPath();
  ctx.arc(0, -s * 0.28, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(d.color, 80);
  ctx.stroke();

  ctx.fillStyle = "#140c1c";
  ctx.beginPath();
  ctx.arc(-s * 0.07, -s * 0.3, s * 0.045, 0, Math.PI * 2);
  ctx.arc(s * 0.07, -s * 0.3, s * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.arc(-s * 0.055, -s * 0.31, s * 0.018, 0, Math.PI * 2);
  ctx.arc(s * 0.085, -s * 0.31, s * 0.018, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = shade(d.color, -30);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.2);
  ctx.quadraticCurveTo(0, -s * 0.14, s * 0.06, -s * 0.2);
  ctx.stroke();

  drawAccents(ctx, id, s, time);
  if (opts?.elite) {
    ctx.strokeStyle = "#e8c36a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAccents(
  ctx: CanvasRenderingContext2D,
  id: IdentityId,
  s: number,
  time: number,
): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (id) {
    case "rat": {
      ctx.fillStyle = shade(def(id).color, -20);
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.42, s * 0.08, s * 0.12, -0.5, 0, Math.PI * 2);
      ctx.ellipse(s * 0.2, -s * 0.42, s * 0.08, s * 0.12, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def(id).color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.2);
      ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.42, -s * 0.05);
      ctx.stroke();
      break;
    }
    case "guard": {
      ctx.fillStyle = "#c5d2e4";
      roundRect(ctx, -s * 0.2, -s * 0.5, s * 0.4, s * 0.22, 3);
      ctx.fill();
      ctx.fillStyle = "#2a3548";
      roundRect(ctx, -s * 0.16, -s * 0.36, s * 0.32, s * 0.08, 2);
      ctx.fill();
      ctx.strokeStyle = "#c5d2e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.28, -s * 0.05);
      ctx.lineTo(s * 0.28, s * 0.38);
      ctx.moveTo(s * 0.2, s * 0.05);
      ctx.lineTo(s * 0.36, s * 0.05);
      ctx.stroke();
      break;
    }
    case "archer": {
      ctx.strokeStyle = "#cde3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-s * 0.05, 0, s * 0.32, -1.2, 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.3);
      ctx.lineTo(-s * 0.05, s * 0.3);
      ctx.stroke();
      break;
    }
    case "thief": {
      ctx.fillStyle = "#3a2048";
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.22);
      ctx.quadraticCurveTo(0, -s * 0.58, s * 0.24, -s * 0.22);
      ctx.quadraticCurveTo(0, -s * 0.32, -s * 0.24, -s * 0.22);
      ctx.fill();
      break;
    }
    case "priest": {
      ctx.strokeStyle = "#f4e7b0";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8 + Math.sin(time / 200) * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.52, s * 0.16, s * 0.07, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#f4e7b0";
      roundRect(ctx, -s * 0.04, -s * 0.08, s * 0.08, s * 0.28, 2);
      ctx.fill();
      break;
    }
    case "pyromancer": {
      const flick = 0.8 + Math.sin(time / 80) * 0.2;
      ctx.fillStyle = `rgba(255,160,60,${0.7 * flick})`;
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.4);
      ctx.quadraticCurveTo(-s * 0.18, -s * 0.7, 0, -s * 0.82);
      ctx.quadraticCurveTo(s * 0.18, -s * 0.7, s * 0.08, -s * 0.4);
      ctx.fill();
      ctx.fillStyle = "#fff2c0";
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.45);
      ctx.quadraticCurveTo(0, -s * 0.7, s * 0.04, -s * 0.45);
      ctx.fill();
      break;
    }
    case "knight": {
      ctx.fillStyle = "#f0d0d4";
      roundRect(ctx, -s * 0.18, -s * 0.48, s * 0.36, s * 0.2, 3);
      ctx.fill();
      ctx.fillStyle = "#2a1018";
      roundRect(ctx, -s * 0.14, -s * 0.38, s * 0.28, s * 0.07, 2);
      ctx.fill();
      ctx.fillStyle = "#e8c36a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.52);
      ctx.lineTo(s * 0.06, -s * 0.4);
      ctx.lineTo(-s * 0.06, -s * 0.4);
      ctx.fill();
      break;
    }
    case "hollow": {
      ctx.fillStyle = "#100818";
      ctx.beginPath();
      ctx.arc(0, -s * 0.28, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c8b6ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -s * 0.28, s * 0.18 + Math.sin(time / 180) * 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default: {
      ctx.strokeStyle = shade(def(id).color, 40);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.05);
      ctx.lineTo(s * 0.34, -s * 0.1);
      ctx.stroke();
    }
  }
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
    ctx.fillStyle = "#07050c";
    ctx.fillRect(px, py, TILE, TILE);
    return;
  }

  if (t === "wall") {
    ctx.fillStyle = vis ? "#1c1528" : "#120e18";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = vis ? "#2a203c" : "#1a1524";
    ctx.fillRect(px, py, TILE, 8);
    ctx.strokeStyle = vis ? "rgba(232,195,106,0.12)" : "rgba(232,195,106,0.04)";
    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
    if (vis && ((x * 13 + y * 7) % 9 === 0)) {
      ctx.strokeStyle = "rgba(232,195,106,0.18)";
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 14);
      ctx.lineTo(px + TILE - 10, py + 22);
      ctx.stroke();
    }
    return;
  }

  const alt = (x + y) % 2 === 0;
  ctx.fillStyle = vis ? (alt ? "#1a1424" : "#16101f") : "#100c16";
  ctx.fillRect(px, py, TILE, TILE);
  if (vis) {
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
  }

  const blood = state.blood[`${x},${y}`];
  if (blood) {
    ctx.fillStyle = vis ? "rgba(120,24,40,0.35)" : "rgba(80,16,28,0.2)";
    ctx.beginPath();
    ctx.ellipse(px + TILE * 0.5, py + TILE * 0.55, 10 + blood * 3, 7 + blood * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (t === "stairs") {
    ctx.fillStyle = vis ? "#e8c36a" : "#6a5428";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + 10 + i * 2, py + 12 + i * 7, TILE - 20 - i * 4, 5);
    }
  }
  if (t === "shrine") {
    ctx.fillStyle = vis ? "#ead58a" : "#5a5028";
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2, py + 8);
    ctx.lineTo(px + TILE - 12, py + TILE - 12);
    ctx.lineTo(px + 12, py + TILE - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#100818";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (t === "shop") {
    ctx.fillStyle = vis ? "#c48ad6" : "#4a3058";
    roundRect(ctx, px + 10, py + 12, TILE - 20, TILE - 22, 6);
    ctx.fill();
    ctx.fillStyle = "#e8c36a";
    ctx.font = "700 16px Palatino Linotype, serif";
    ctx.textAlign = "center";
    ctx.fillText("G", px + TILE / 2, py + 32);
  }

  const gold = state.goldMap[`${x},${y}`];
  if (gold && vis) {
    ctx.fillStyle = "#e8c36a";
    ctx.beginPath();
    ctx.arc(px + TILE * 0.4, py + TILE * 0.6, 5, 0, Math.PI * 2);
    ctx.arc(px + TILE * 0.56, py + TILE * 0.55, 4, 0, Math.PI * 2);
    ctx.fill();
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

  if (!vis) {
    ctx.fillStyle = "rgba(7,5,12,0.55)";
    ctx.fillRect(px, py, TILE, TILE);
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
  ctx.fillStyle = "rgba(10,8,16,0.72)";
  roundRect(ctx, x0, y0, mw, mh, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,195,106,0.35)";
  ctx.stroke();
  const sx = (mw - 16) / state.w;
  const sy = (mh - 16) / state.h;
  const revealAll = hasPerk(meta, "maps");
  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      if (!revealAll && !state.seen[y]![x]) continue;
      const t = state.tiles[y]![x];
      if (t === "wall") continue;
      let col = state.vis[y]![x] ? "#5a4868" : "#2a2238";
      if (t === "stairs") col = "#e8c36a";
      if (t === "shrine") col = "#ead58a";
      if (t === "shop") col = "#c48ad6";
      ctx.fillStyle = col;
      ctx.fillRect(x0 + 8 + x * sx, y0 + 8 + y * sy, Math.max(1.2, sx), Math.max(1.2, sy));
    }
  }
  ctx.fillStyle = def(state.player.stack[0] ?? "vagabond").color;
  ctx.beginPath();
  ctx.arc(
    x0 + 8 + (state.player.x + 0.5) * sx,
    y0 + 8 + (state.player.y + 0.5) * sy,
    3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const hollow = state.enemies.find((e) => e.id === "hollow");
  if (hollow && (revealAll || state.seen[hollow.y]![hollow.x])) {
    ctx.fillStyle = "#c8b6ff";
    ctx.fillRect(x0 + 8 + hollow.x * sx, y0 + 8 + hollow.y * sy, 4, 4);
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
  ctx.fillStyle = "#07050c";
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
    if (!state.vis[e.y]![e.x]) continue;
    const cx = e.x * TILE + TILE / 2;
    const cy = e.y * TILE + TILE / 2 + 4;
    if (e.id === "hollow") {
      const faces = state.grave.slice(-5);
      faces.forEach((id, i) => {
        drawSoul(ctx, id, cx + 2 + i, cy + 10 - i * 7, TILE * 0.55, time, { ghost: true });
      });
      ctx.save();
      if (e.flash > 0) ctx.globalCompositeOperation = "lighter";
      drawSoul(ctx, "hollow", cx, cy - 8, TILE * 0.95, time, { elite: true });
      ctx.restore();
      const ratio = e.hp / e.maxHp;
      ctx.fillStyle = "#100818";
      ctx.fillRect(cx - 22, cy - 42, 44, 5);
      ctx.fillStyle = "#c8b6ff";
      ctx.fillRect(cx - 22, cy - 42, 44 * ratio, 5);
    } else {
      ctx.save();
      if (e.flash > 0) {
        ctx.filter = "brightness(2)";
      }
      drawSoul(ctx, e.id, cx, cy, TILE * 0.72, time, { elite: e.elite });
      ctx.restore();
      if (e.hp < e.maxHp || e.elite) {
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = "#100818";
        ctx.fillRect(cx - 14, cy - 28, 28, 4);
        ctx.fillStyle = def(e.id).color;
        ctx.fillRect(cx - 14, cy - 28, 28 * ratio, 4);
      }
    }
  }

  const p = state.player;
  const pcx = p.x * TILE + TILE / 2;
  const pcy = p.y * TILE + TILE / 2 + 4;
  const stack = p.stack;
  for (let i = stack.length - 1; i >= 1; i--) {
    drawSoul(ctx, stack[i]!, pcx + i * 2, pcy + i * 3, TILE * 0.7 - i, time, { ghost: true });
  }
  if (stack[0]) drawSoul(ctx, stack[0], pcx, pcy, TILE * 0.78, time);

  const g = ctx.createRadialGradient(pcx, pcy, 20, pcx, pcy, TILE * 5.5);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(7,5,12,0.15)");
  g.addColorStop(1, "rgba(7,5,12,0.72)");
  ctx.fillStyle = g;
  ctx.fillRect(cam.x - 20, cam.y - 20, viewW + 40, viewH + 40);

  ctx.restore();

  if (flash && flash.a > 0) {
    const rgb = hexToRgb(flash.color);
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${flash.a * 0.22})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  drawMinimap(ctx, state, meta, viewW);

  ctx.fillStyle = "rgba(232,195,106,0.85)";
  ctx.font = "600 13px Atkinson Hyperlegible, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `Floor ${state.floor}  ·  ${FLOOR_NAMES[state.floor] ?? ""}  ·  Turn ${state.turn}`,
    18,
    28,
  );

  ctx.fillStyle = "#e8c36a";
  ctx.font = "700 15px Palatino Linotype, serif";
  ctx.fillText(`${state.gold} gold`, 18, 50);
  ctx.fillStyle = "#ead58a";
  ctx.fillText(`${state.stitches} stitch${state.stitches === 1 ? "" : "es"}`, 110, 50);

  const graveN = state.grave.length;
  ctx.fillStyle = "#c8b6ff";
  ctx.fillText(`Hollow grave ${graveN}  ·  bite ${hollowDamagePreview(state)}`, 18, 70);

  const face = def(stack[0] ?? "vagabond");
  ctx.textAlign = "center";
  ctx.fillStyle = face.color;
  ctx.font = "700 15px Palatino Linotype, serif";
  ctx.fillText(
    `Space — ${face.active.split("—")[0]!.trim()}`,
    viewW / 2,
    viewH - 22,
  );
}

export function drawTitleBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
): void {
  ctx.fillStyle = "#07050c";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.4, w * 0.55);
  g.addColorStop(0, "rgba(80,40,90,0.35)");
  g.addColorStop(1, "rgba(7,5,12,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const ids: IdentityId[] = ["rat", "guard", "archer", "thief", "priest", "pyromancer", "knight"];
  ids.forEach((id, i) => {
    const x = w * 0.5 + Math.sin(time / 1800 + i) * 220;
    const y = h * 0.42 + i * 18 + Math.cos(time / 1400 + i) * 8;
    ctx.globalAlpha = 0.35;
    drawSoul(ctx, id, x, y, 42, time, { ghost: true });
    ctx.globalAlpha = 1;
  });
  drawSoul(ctx, "hollow", w * 0.5, h * 0.28, 70, time);
}
