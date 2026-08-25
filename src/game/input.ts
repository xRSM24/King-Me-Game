export class Input {
  private pressed = new Set<string>();
  mouse: { x: number; y: number; clicked: boolean } = { x: 0, y: 0, clicked: false };

  bind(canvas: HTMLCanvasElement): void {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.pressed.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    });
    canvas.addEventListener("pointerdown", (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.clicked = true;
    });
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

  endFrame(): void {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}

export const KEY_UP = ["ArrowUp", "w", "W", "k", "K"];
export const KEY_DOWN = ["ArrowDown", "s", "S", "j", "J"];
export const KEY_LEFT = ["ArrowLeft", "a", "A", "h", "H"];
export const KEY_RIGHT = ["ArrowRight", "d", "D", "l", "L"];
export const KEY_WAIT = ["z", "Z", ".", "End"];
export const KEY_POWER = [" ", "f", "F"];
export const KEY_ESC = ["Escape"];
export const KEY_ENTER = ["Enter"];
export const KEY_ONE = ["1"];
export const KEY_TWO = ["2"];
export const KEY_THREE = ["3"];
