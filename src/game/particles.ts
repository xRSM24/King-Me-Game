export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
  kind: "spark" | "wisp" | "text" | "ash";
}

export class Particles {
  list: Particle[] = [];

  burst(x: number, y: number, color: string, n = 12): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color,
        size: 2 + Math.random() * 3,
        kind: "spark",
      });
    }
  }

  wisps(x: number, y: number, color: string, n = 6): void {
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 20,
        vy: -30 - Math.random() * 40,
        life: 0.6 + Math.random() * 0.5,
        max: 1.1,
        color,
        size: 3 + Math.random() * 4,
        kind: "wisp",
      });
    }
  }

  ash(x: number, y: number, n = 8): void {
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: -10 - Math.random() * 40,
        life: 0.5 + Math.random() * 0.6,
        max: 1.1,
        color: "#c8b6ff",
        size: 2 + Math.random() * 2,
        kind: "ash",
      });
    }
  }

  text(x: number, y: number, text: string, color: string): void {
    this.list.push({
      x,
      y,
      vx: 0,
      vy: -36,
      life: 0.8,
      max: 0.8,
      color,
      size: 14,
      text,
      kind: "text",
    });
  }

  update(dt: number): void {
    const next: Particle[] = [];
    for (const p of this.list) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "spark") p.vy += 180 * dt;
      if (p.kind === "wisp" || p.kind === "ash") p.vy -= 10 * dt;
      next.push(p);
    }
    this.list = next;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.max);
      const x = p.x - camX;
      const y = p.y - camY;
      ctx.globalAlpha = a;
      if (p.kind === "text" && p.text) {
        ctx.font = "700 16px Palatino Linotype, Palatino, serif";
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "#100818";
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, x, y);
        ctx.fillText(p.text, x, y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (p.kind === "wisp" ? 1.2 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
