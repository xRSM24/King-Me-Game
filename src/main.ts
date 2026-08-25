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

function loop(): void {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
