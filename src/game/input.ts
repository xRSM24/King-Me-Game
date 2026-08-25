export class Input {
  private pressed = new Set<string>();
  private touch = { x: 0, y: 0 };
  fireOn = false;
  mouse: { x: number; y: number; clicked: boolean } = { x: 0, y: 0, clicked: false };

  bind(canvas: HTMLCanvasElement): void {
    window.addEventListener("keydown", (e) => {
      this.pressed.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.pressed.delete(e.key);
    });
    window.addEventListener("blur", () => {
      this.pressed.clear();
      this.touch.x = 0;
      this.touch.y = 0;
      this.fireOn = false;
    });
    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.clicked = true;
    });
  }

  holdTouch(dir: "up" | "down" | "left" | "right" | "clear"): void {
    if (dir === "clear") {
      this.touch.x = 0;
      this.touch.y = 0;
      return;
    }
    if (dir === "up") this.touch.y = -1;
    if (dir === "down") this.touch.y = 1;
    if (dir === "left") this.touch.x = -1;
    if (dir === "right") this.touch.x = 1;
  }

  releaseTouch(dir: "up" | "down" | "left" | "right"): void {
    if (dir === "up" && this.touch.y < 0) this.touch.y = 0;
    if (dir === "down" && this.touch.y > 0) this.touch.y = 0;
    if (dir === "left" && this.touch.x < 0) this.touch.x = 0;
    if (dir === "right" && this.touch.x > 0) this.touch.x = 0;
  }

  holdFire(on: boolean): void {
    this.fireOn = on;
  }

  heldFire(): boolean {
    return this.fireOn || this.held(KEY_POWER);
  }

  held(keys: string[]): boolean {
    return keys.some((k) => this.pressed.has(k));
  }

  consume(keys: string[]): boolean {
    for (const k of keys) {
      if (this.pressed.has(k)) {
        this.pressed.delete(k);
        return true;
      }
    }
    return false;
  }

  consumeClick(): boolean {
    if (!this.mouse.clicked) return false;
    this.mouse.clicked = false;
    return true;
  }

  axis(): { x: number; y: number } {
    let x = this.touch.x;
    let y = this.touch.y;
    if (this.held(KEY_LEFT)) x = -1;
    if (this.held(KEY_RIGHT)) x = 1;
    if (this.held(KEY_UP)) y = -1;
    if (this.held(KEY_DOWN)) y = 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  endFrame(): void {
    this.mouse.clicked = false;
  }
}

export const KEY_UP = ["ArrowUp", "w", "W", "k", "K"];
export const KEY_DOWN = ["ArrowDown", "s", "S", "j", "J"];
export const KEY_LEFT = ["ArrowLeft", "a", "A", "h", "H"];
export const KEY_RIGHT = ["ArrowRight", "d", "D", "l", "L"];
export const KEY_POWER = [" ", "f", "F"];
export const KEY_ESC = ["Escape"];
export const KEY_ENTER = ["Enter"];
export const KEY_ONE = ["1"];
export const KEY_TWO = ["2"];
export const KEY_THREE = ["3"];
