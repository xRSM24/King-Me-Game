import { def } from "./identities.ts";
import type { Dir, IdentityId } from "./types.ts";

export interface DrawOpts {
  ghost?: boolean;
  elite?: boolean;
  facing?: Dir;
  player?: boolean;
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

/** Round marshmallow kid in a silly costume. */
export function drawSoul(
  ctx: CanvasRenderingContext2D,
  id: IdentityId,
  x: number,
  y: number,
  s: number,
  time: number,
  opts?: DrawOpts,
): void {
  const bounce = Math.sin(time / 140 + x * 0.03) * (opts?.ghost ? 0.8 : 3.2);
  const squash = 1 + Math.sin(time / 180 + x * 0.03) * 0.04;
  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(opts?.facing === "left" ? -squash : squash, 2 - squash);
  if (opts?.ghost) ctx.globalAlpha *= 0.55;

  ctx.fillStyle = "rgba(40,20,60,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.48, s * 0.28, s * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  if (id === "hollow") {
    drawKingEmpty(ctx, s, time, !!opts?.elite);
    ctx.restore();
    return;
  }

  drawBody(ctx, id, s);
  drawCostume(ctx, id, s, time);
  drawFace(ctx, id, s, time);
  drawHeld(ctx, id, s, time);

  if (opts?.elite) {
    ctx.fillStyle = "#ffe566";
    star(ctx, -s * 0.28, -s * 0.48, s * 0.08);
    star(ctx, s * 0.26, -s * 0.4, s * 0.06);
  }
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const b = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
}

function outlineFill(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawBody(ctx: CanvasRenderingContext2D, id: IdentityId, s: number): void {
  const c = def(id).color;
  ctx.fillStyle = shade(c, 20);
  ctx.beginPath();
  ctx.ellipse(-s * 0.16, s * 0.28, s * 0.09, s * 0.14, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.16, s * 0.28, s * 0.09, s * 0.14, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-s * 0.16, s * 0.28, s * 0.09, s * 0.14, 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(s * 0.16, s * 0.28, s * 0.09, s * 0.14, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, s * 0.08, s * 0.28, s * 0.26, 0, 0, Math.PI * 2);
  outlineFill(ctx, id === "vagabond" ? "#fff6c8" : shade(c, 50));

  if (id === "vagabond") {
    ctx.fillStyle = "#6ec8ff";
    ctx.fillRect(-s * 0.2, s * 0.02, s * 0.4, s * 0.08);
    ctx.fillStyle = "#ffe566";
    ctx.fillRect(-s * 0.2, s * 0.1, s * 0.4, s * 0.08);
    ctx.strokeStyle = "#3b2152";
    ctx.strokeRect(-s * 0.2, s * 0.02, s * 0.4, s * 0.16);
  }
}

function drawCostume(
  ctx: CanvasRenderingContext2D,
  id: IdentityId,
  s: number,
  time: number,
): void {
  switch (id) {
    case "vagabond": {
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.4);
      ctx.quadraticCurveTo(s * 0.02, -s * 0.72, s * 0.32, -s * 0.52);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.42, s * 0.08, -s * 0.28);
      ctx.lineTo(-s * 0.04, -s * 0.28);
      outlineFill(ctx, "#6ec8ff");
      ctx.fillStyle = "#ffe566";
      ctx.fillRect(-s * 0.02, -s * 0.48, s * 0.16, s * 0.08);
      ctx.beginPath();
      ctx.arc(s * 0.34, -s * 0.52, s * 0.08, 0, Math.PI * 2);
      outlineFill(ctx, "#ffe566");
      break;
    }
    case "rat": {
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.42, s * 0.1, s * 0.14, -0.4, 0, Math.PI * 2);
      outlineFill(ctx, "#ff9a62");
      ctx.beginPath();
      ctx.ellipse(s * 0.2, -s * 0.42, s * 0.1, s * 0.14, 0.4, 0, Math.PI * 2);
      outlineFill(ctx, "#ff9a62");
      ctx.fillStyle = "#ffd0c0";
      ctx.beginPath();
      ctx.ellipse(-s * 0.2, -s * 0.42, s * 0.045, s * 0.07, -0.4, 0, Math.PI * 2);
      ctx.ellipse(s * 0.2, -s * 0.42, s * 0.045, s * 0.07, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff9a62";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.18);
      ctx.quadraticCurveTo(s * 0.42, s * 0.05, s * 0.34, -s * 0.08);
      ctx.stroke();
      break;
    }
    case "guard": {
      ctx.beginPath();
      ctx.arc(0, -s * 0.36, s * 0.22, Math.PI, 0);
      ctx.lineTo(s * 0.22, -s * 0.22);
      ctx.lineTo(-s * 0.22, -s * 0.22);
      outlineFill(ctx, "#c5d8e8");
      ctx.fillStyle = "#5a6a7a";
      ctx.fillRect(-s * 0.14, -s * 0.3, s * 0.28, s * 0.08);
      break;
    }
    case "archer": {
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.18);
      ctx.quadraticCurveTo(0, -s * 0.58, s * 0.24, -s * 0.18);
      ctx.lineTo(s * 0.16, -s * 0.08);
      ctx.lineTo(-s * 0.16, -s * 0.08);
      outlineFill(ctx, "#7db86c");
      break;
    }
    case "thief": {
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.22, s * 0.22, s * 0.1, 0, 0, Math.PI * 2);
      outlineFill(ctx, "#5a3068");
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-s * 0.08, -s * 0.24, 3, 0, Math.PI * 2);
      ctx.arc(s * 0.08, -s * 0.24, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "priest": {
      ctx.strokeStyle = "#9ae8ff";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7 + Math.sin(time / 160) * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.52, s * 0.16, s * 0.07, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "pyromancer": {
      const flick = 0.8 + Math.sin(time / 80) * 0.2;
      ctx.fillStyle = `rgba(255,140,40,${flick})`;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.36);
      ctx.quadraticCurveTo(-s * 0.18, -s * 0.62, 0, -s * 0.72);
      ctx.quadraticCurveTo(s * 0.18, -s * 0.62, s * 0.1, -s * 0.36);
      ctx.fill();
      ctx.strokeStyle = "#3b2152";
      ctx.stroke();
      ctx.fillStyle = "#fff38a";
      ctx.beginPath();
      ctx.moveTo(-s * 0.04, -s * 0.4);
      ctx.quadraticCurveTo(0, -s * 0.58, s * 0.04, -s * 0.4);
      ctx.fill();
      break;
    }
    case "knight": {
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.22);
      ctx.lineTo(-s * 0.18, -s * 0.5);
      ctx.lineTo(0, -s * 0.58);
      ctx.lineTo(s * 0.18, -s * 0.5);
      ctx.lineTo(s * 0.2, -s * 0.22);
      outlineFill(ctx, "#ff8aa0");
      ctx.fillStyle = "#3b2152";
      ctx.fillRect(-s * 0.1, -s * 0.38, s * 0.2, s * 0.07);
      ctx.fillStyle = "#ffe566";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.62);
      ctx.lineTo(s * 0.06, -s * 0.5);
      ctx.lineTo(-s * 0.06, -s * 0.5);
      ctx.fill();
      break;
    }
    default:
      break;
  }
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  id: IdentityId,
  s: number,
  time: number,
): void {
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.22, s * 0.24, s * 0.22, 0, 0, Math.PI * 2);
  outlineFill(ctx, id === "rat" ? "#ffb089" : "#fff8e8");

  ctx.fillStyle = "#ffb0c0";
  ctx.beginPath();
  ctx.ellipse(-s * 0.14, -s * 0.16, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.14, -s * 0.16, s * 0.05, s * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  const blink = Math.sin(time / 900) > 0.97 ? 0.15 : 1;
  ctx.fillStyle = "#3b2152";
  ctx.beginPath();
  ctx.ellipse(-s * 0.08, -s * 0.24, s * 0.055, s * 0.07 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.08, -s * 0.24, s * 0.055, s * 0.07 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  if (blink > 0.5) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-s * 0.06, -s * 0.26, s * 0.02, 0, Math.PI * 2);
    ctx.arc(s * 0.1, -s * 0.26, s * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (id === "thief") {
    ctx.moveTo(-s * 0.06, -s * 0.1);
    ctx.quadraticCurveTo(0, -s * 0.02, s * 0.08, -s * 0.1);
  } else {
    ctx.moveTo(-s * 0.06, -s * 0.12);
    ctx.quadraticCurveTo(0, -s * 0.05, s * 0.06, -s * 0.12);
  }
  ctx.stroke();

  if (id === "rat") {
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, -s * 0.16);
    ctx.lineTo(-s * 0.28, -s * 0.12);
    ctx.moveTo(-s * 0.16, -s * 0.14);
    ctx.lineTo(-s * 0.27, -s * 0.18);
    ctx.moveTo(s * 0.16, -s * 0.16);
    ctx.lineTo(s * 0.28, -s * 0.12);
    ctx.moveTo(s * 0.16, -s * 0.14);
    ctx.lineTo(s * 0.27, -s * 0.18);
    ctx.stroke();
  }
}

function drawHeld(
  ctx: CanvasRenderingContext2D,
  id: IdentityId,
  s: number,
  time: number,
): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3b2152";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(s * 0.26, s * 0.04, s * 0.07, s * 0.09, 0.4, 0, Math.PI * 2);
  outlineFill(ctx, "#fff6c8");

  switch (id) {
    case "guard": {
      ctx.fillStyle = "#c5d8e8";
      ctx.fillRect(s * 0.24, -s * 0.1, 4, s * 0.4);
      ctx.strokeRect(s * 0.24, -s * 0.1, 4, s * 0.4);
      ctx.beginPath();
      ctx.moveTo(s * 0.18, 0);
      ctx.lineTo(s * 0.36, 0);
      ctx.lineTo(s * 0.27, s * 0.1);
      outlineFill(ctx, "#ffe566");
      break;
    }
    case "archer": {
      ctx.strokeStyle = "#3b2152";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(s * 0.22, 0, s * 0.18, -1, 1.1);
      ctx.stroke();
      break;
    }
    case "knight": {
      ctx.fillStyle = "#ffe566";
      ctx.fillRect(s * 0.22, -s * 0.22, 5, s * 0.36);
      ctx.strokeRect(s * 0.22, -s * 0.22, 5, s * 0.36);
      break;
    }
    case "pyromancer": {
      ctx.fillStyle = `rgba(255,160,40,${0.7 + Math.sin(time / 70) * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.02);
      ctx.quadraticCurveTo(s * 0.34, -s * 0.16, s * 0.24, -s * 0.28);
      ctx.quadraticCurveTo(s * 0.4, -s * 0.04, s * 0.26, s * 0.04);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "thief": {
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.06);
      ctx.lineTo(s * 0.36, -s * 0.08);
      ctx.lineTo(s * 0.24, s * 0.1);
      outlineFill(ctx, "#c48ad6");
      break;
    }
    default: {
      ctx.strokeStyle = "#e8c36a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.06);
      ctx.lineTo(s * 0.34, -s * 0.16);
      ctx.stroke();
      ctx.strokeStyle = "#3b2152";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s * 0.34, -s * 0.16, 4, 0.4, Math.PI * 1.6);
      ctx.stroke();
    }
  }
}

function drawKingEmpty(
  ctx: CanvasRenderingContext2D,
  s: number,
  time: number,
  elite: boolean,
): void {
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, s * 0.34);
  ctx.quadraticCurveTo(-s * 0.4, -s * 0.1, -s * 0.1, -s * 0.38);
  ctx.lineTo(s * 0.1, -s * 0.38);
  ctx.quadraticCurveTo(s * 0.4, -s * 0.1, s * 0.28, s * 0.34);
  outlineFill(ctx, "#c8b6ff");
  ctx.fillStyle = "#3b2152";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.08, s * 0.14, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe566";
  ctx.beginPath();
  ctx.arc(-s * 0.12, -s * 0.2, 6 + Math.sin(time / 140), 0, Math.PI * 2);
  ctx.arc(s * 0.12, -s * 0.2, 6 + Math.cos(time / 140), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b2152";
  ctx.beginPath();
  ctx.arc(-s * 0.12, -s * 0.2, 2.5, 0, Math.PI * 2);
  ctx.arc(s * 0.12, -s * 0.2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe566";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(s * 0.1, -s * 0.36);
  ctx.lineTo(-s * 0.1, -s * 0.36);
  ctx.fill();
  if (elite) {
    ctx.fillStyle = "#ffe566";
    star(ctx, 0, -s * 0.58, s * 0.08);
  }
}
