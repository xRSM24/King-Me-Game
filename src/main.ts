import { Game } from "./game/game.ts";
import "./style.css";

const canvas = document.getElementById("game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing canvas");
}

const game = new Game(canvas);
game.showScreen("title");

document.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const btn = t.closest("[data-cmd]");
  if (!(btn instanceof HTMLElement)) return;
  const cmd = btn.getAttribute("data-cmd");
  if (!cmd) return;
  e.preventDefault();
  if (cmd === "resume" && game.screen === "playing") {
    game.showScreen("pause");
    return;
  }
  game.command(cmd);
});

function holdFromEvent(e: Event): HTMLElement | null {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return null;
  return t.closest("[data-hold]");
}

document.addEventListener("pointerdown", (e) => {
  const btn = holdFromEvent(e);
  if (!btn) return;
  const dir = btn.getAttribute("data-hold");
  if (dir === "up" || dir === "down" || dir === "left" || dir === "right") {
    e.preventDefault();
    game.unlock();
    game.input.holdTouch(dir);
    if (e instanceof PointerEvent) btn.setPointerCapture(e.pointerId);
  }
  if (dir === "fire") {
    e.preventDefault();
    game.unlock();
    game.input.holdFire(true);
    if (e instanceof PointerEvent) btn.setPointerCapture(e.pointerId);
  }
});

const releaseHold = (e: Event): void => {
  const btn = holdFromEvent(e);
  if (!btn) {
    game.input.holdTouch("clear");
    game.input.holdFire(false);
    return;
  }
  const dir = btn.getAttribute("data-hold");
  if (dir === "up" || dir === "down" || dir === "left" || dir === "right") {
    game.input.releaseTouch(dir);
  }
  if (dir === "fire") game.input.holdFire(false);
};

document.addEventListener("pointerup", releaseHold);
document.addEventListener("pointercancel", () => {
  game.input.holdTouch("clear");
  game.input.holdFire(false);
});
window.addEventListener("blur", () => {
  game.input.holdTouch("clear");
  game.input.holdFire(false);
});

function loop(): void {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
