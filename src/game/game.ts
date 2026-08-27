import { think } from "./ai.ts";
import { AudioSys } from "./audio.ts";
import { LAW_DEFS, unusedLaws, type LawDef } from "./laws.ts";
import { loadMeta, notchBonus, notchesFromRun, saveMeta } from "./meta.ts";
import { dailySeed, hashSeed, Rng } from "./rng.ts";
import {
  applyMove,
  at,
  cloneBoard,
  crownRandom,
  isHole,
  legalMoves,
  moreJumps,
  outcome,
  piecesOf,
  recruitMan,
  setupBoard,
  type Board,
} from "./rules.ts";
import { boardSpec } from "./setup.ts";
import type { BoardMods, Laws, Meta, Move, Pos, Screen } from "./types.ts";
import { BOARD_NAMES, PATH_END, emptyLaws, emptyMods, samePos } from "./types.ts";

const CHEERS = ["Nice!", "Jump!", "Got 'em!", "Wow!", "Again!", "Super hop!"];

export class Game {
  meta: Meta = loadMeta();
  audio = new AudioSys();
  screen: Screen = "title";
  rng = new Rng(1);
  board: Board = setupBoard(boardSpec(0, 0, false), () => 1);
  laws: Laws = emptyLaws();
  mods: BoardMods = emptyMods();
  blurb = "";
  hops = 0;
  combo = 0;
  boardIndex = 0;
  turn: "you" | "them" = "you";
  selected: Pos | null = null;
  lock: Pos | null = null;
  thinking = false;
  animating = false;
  aiTimer: number | null = null;
  lastRitesUsed = false;
  oopsLeft = 1;
  snapshot: Board | null = null;
  snapshotHops = 0;
  offers: LawDef[] = [];
  log: string[] = [];
  returnTo: Screen = "title";
  end: {
    win: boolean;
    hops: number;
    notches: number;
    gained: number;
    board: number;
  } | null = null;
  idSeq = 1;
  cheerTimer: number | null = null;

  constructor() {
    this.bind();
    this.show("title");
  }

  private pid = (): number => {
    this.idSeq += 1;
    return this.idSeq;
  };

  unlock(): void {
    this.audio.unlock();
    this.audio.setMuted(this.meta.mute);
  }

  private bind(): void {
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const cmdBtn = t.closest("[data-cmd]");
      if (cmdBtn instanceof HTMLElement) {
        const cmd = cmdBtn.getAttribute("data-cmd");
        if (cmd) {
          e.preventDefault();
          this.command(cmd);
        }
        return;
      }
      const sq = t.closest("[data-r]");
      if (sq instanceof HTMLElement && this.screen === "playing") {
        const r = Number(sq.getAttribute("data-r"));
        const c = Number(sq.getAttribute("data-c"));
        if (Number.isFinite(r) && Number.isFinite(c)) this.clickSquare(r, c);
      }
    });
  }

  command(cmd: string): void {
    this.unlock();
    if (cmd !== "oops") this.audio.ui();
    if (cmd === "new") {
      this.newRun(false);
      return;
    }
    if (cmd === "daily") {
      this.newRun(true);
      return;
    }
    if (cmd === "how") {
      if (this.screen !== "how") this.returnTo = this.screen;
      this.show("how");
      return;
    }
    if (cmd === "back") {
      const dest = this.returnTo;
      this.returnTo = "title";
      this.show(dest);
      this.resumeAiIfNeeded();
      return;
    }
    if (cmd === "title") {
      this.show("title");
      return;
    }
    if (cmd === "pause") {
      if (this.screen === "playing") this.show("pause");
      return;
    }
    if (cmd === "resume") {
      this.show("playing");
      this.resumeAiIfNeeded();
      return;
    }
    if (cmd === "abandon") {
      if (this.screen === "pause") this.finish(false);
      else this.show("title");
      return;
    }
    if (cmd === "oops") {
      this.oops();
      return;
    }
    if (cmd === "mute") {
      this.meta.mute = !this.meta.mute;
      this.audio.setMuted(this.meta.mute);
      saveMeta(this.meta);
      this.renderChrome();
      return;
    }
    if (cmd.startsWith("law:")) {
      const id = cmd.slice(4) as keyof Laws;
      if (this.screen === "pick" && id in this.laws) {
        this.laws[id] = true;
        this.boardIndex += 1;
        this.loadBoard();
        this.show("playing");
      }
    }
  }

  newRun(daily: boolean): void {
    this.unlock();
    const seed = daily ? hashSeed(dailySeed() * 31 + 9) : (Math.random() * 0xffffffff) | 0;
    this.rng = new Rng(seed);
    this.laws = emptyLaws();
    this.hops = 0;
    this.combo = 0;
    this.boardIndex = 0;
    this.lastRitesUsed = false;
    this.end = null;
    this.idSeq = 1;
    this.meta.runs += 1;
    saveMeta(this.meta);
    this.loadBoard();
    this.pushLog("Tap a gold ring, then a pip. Stars mean jump!");
    this.show("playing");
    this.cheer("Let's hop!");
  }

  private scheduleAi(delay: number): void {
    this.clearAi();
    this.aiTimer = window.setTimeout(() => {
      this.aiTimer = null;
      void this.aiStep();
    }, delay);
  }

  private clearAi(): void {
    if (this.aiTimer != null) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private resumeAiIfNeeded(): void {
    if (this.screen === "playing" && this.thinking && this.turn === "them" && !this.animating) {
      this.scheduleAi(220);
    }
  }

  private extraMen(): number {
    const n = notchBonus(this.meta.notches);
    return (this.laws.extraMan ? 1 : 0) + n.extra;
  }

  private loadBoard(): void {
    const openKing = this.laws.openKing || this.rng.chance(notchBonus(this.meta.notches).kingChance);
    const spec = boardSpec(this.boardIndex, this.extraMen(), openKing);
    this.mods = { holes: spec.holes, bounce: spec.bounce, themFly: spec.themFly };
    this.blurb = spec.blurb;
    this.board = setupBoard(spec, this.pid);
    this.turn = "you";
    this.selected = null;
    this.lock = null;
    this.thinking = false;
    this.animating = false;
    this.oopsLeft = 1;
    this.snapshot = null;
    this.combo = 0;
    this.clearAi();
    const name = BOARD_NAMES[this.boardIndex] ?? "Next board";
    this.pushLog(`${name}. ${spec.blurb}`);
  }

  private pushLog(msg: string): void {
    this.log.unshift(msg);
    if (this.log.length > 3) this.log.length = 3;
  }

  private cheer(text: string): void {
    const el = document.getElementById("cheer");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.remove("popin");
    void el.offsetWidth;
    el.classList.add("popin");
    if (this.cheerTimer != null) window.clearTimeout(this.cheerTimer);
    this.cheerTimer = window.setTimeout(() => {
      el.classList.add("hidden");
      this.cheerTimer = null;
    }, 720);
  }

  private canOops(): boolean {
    if (this.screen !== "playing" || this.animating || !this.snapshot || this.oopsLeft <= 0) return false;
    if (this.turn === "you" && !this.thinking) return true;
    return this.turn === "them" && this.aiTimer != null;
  }

  private oops(): void {
    if (!this.canOops()) return;
    const snap = this.snapshot;
    if (!snap) return;
    this.clearAi();
    this.audio.oops();
    this.oopsLeft -= 1;
    this.board = cloneBoard(snap);
    this.hops = this.snapshotHops;
    this.lock = null;
    this.selected = null;
    this.combo = 0;
    this.snapshot = null;
    this.turn = "you";
    this.thinking = false;
    this.pushLog("Oops! That hop didn't count.");
    this.cheer("Oops!");
    this.renderAll();
  }

  clickSquare(r: number, c: number): void {
    if (this.turn !== "you" || this.screen !== "playing" || this.thinking || this.animating) return;
    const pos = { r, c };
    const piece = at(this.board, pos);
    const legal = legalMoves(this.board, "you", this.laws, this.lock, this.mods);
    const hit = legal.find(
      (m) => m.to.r === r && m.to.c === c && (!this.selected || (m.from.r === this.selected.r && m.from.c === this.selected.c)),
    );

    if (this.selected && hit && hit.from.r === this.selected.r && hit.from.c === this.selected.c) {
      void this.play(hit);
      return;
    }
    if (this.lock) return;
    const canSelect = legal.some((m) => m.from.r === r && m.from.c === c);
    if (piece && piece.side === "you" && canSelect) {
      this.selected = pos;
      this.renderBoard();
      this.renderHud();
      return;
    }
    if (this.selected) {
      const m = legal.find(
        (mv) => mv.from.r === this.selected!.r && mv.from.c === this.selected!.c && mv.to.r === r && mv.to.c === c,
      );
      if (m) void this.play(m);
    }
  }

  private async play(move: Move): Promise<void> {
    if (!this.lock) {
      this.snapshot = cloneBoard(this.board);
      this.snapshotHops = this.hops;
    }
    this.animating = true;
    const wasKing = at(this.board, move.from)?.king ?? false;
    await this.animateHop(move, "you");
    this.board = applyMove(this.board, move);
    const nowKing = at(this.board, move.to)?.king ?? false;
    let partyPos: Pos | null = null;
    if (move.capture) {
      this.hops += 1;
      this.combo += 1;
      this.audio.capture(this.combo);
      this.cheer(this.combo >= 2 ? "Double hop!" : CHEERS[this.combo % CHEERS.length]!);
      this.pushLog(this.combo >= 2 ? `Combo x${this.combo}!` : "Got one!");
      if (this.laws.recruit) this.board = recruitMan(this.board, "you", this.pid, this.mods);
      if (this.laws.hopCrown && this.hops % 4 === 0) {
        const c = crownRandom(this.board, "you", (n) => this.rng.int(n));
        this.board = c.board;
        if (c.did) partyPos = c.pos;
      }
    } else {
      this.combo = 0;
      this.audio.hop();
    }

    const keepJumping = !!(move.capture && moreJumps(this.board, move.to, this.laws, this.mods));
    this.lock = keepJumping ? move.to : null;
    this.selected = keepJumping ? move.to : null;
    this.renderAll();
    await this.settle(move.to, !wasKing && nowKing, keepJumping);
    if (!wasKing && nowKing) {
      this.audio.crown();
      this.cheer("Crowned!");
      this.pushLog("Crowned! Kings hop every way.");
      await this.animateCrown(move.to);
    }
    if (partyPos && !(nowKing && samePos(partyPos, move.to))) {
      this.audio.crown();
      this.cheer("Party crown!");
      this.pushLog("Hop Party crowned a friend.");
      await this.animateCrown(partyPos);
    }

    this.animating = false;
    if (keepJumping) {
      this.renderAll();
      return;
    }
    this.lock = null;
    this.selected = null;
    this.afterYou();
  }

  private afterYou(): void {
    const over = outcome(this.board, "them", this.laws, this.mods);
    if (over === "you") {
      this.boardCleared();
      return;
    }
    if (over === "them") {
      this.tryRites();
      return;
    }
    this.turn = "them";
    this.thinking = true;
    this.scheduleAi(this.oopsLeft && this.snapshot ? 900 : 380);
    this.renderAll();
  }

  private async aiStep(): Promise<void> {
    if (this.screen !== "playing") return;
    const skill = 0.08 + this.boardIndex * 0.14;
    const move = think(this.board, this.laws, this.rng, skill, this.mods);
    if (!move) {
      this.boardCleared();
      return;
    }
    this.animating = true;
    const wasKing = at(this.board, move.from)?.king ?? false;
    await this.animateHop(move, "them");
    this.board = applyMove(this.board, move);
    const nowKing = at(this.board, move.to)?.king ?? false;
    if (move.capture) this.audio.capture(1);
    else this.audio.hop();
    const keepJumping = !!(move.capture && moreJumps(this.board, move.to, this.laws, this.mods));
    this.renderAll();
    await this.settle(move.to, !wasKing && nowKing, keepJumping);
    if (!wasKing && nowKing) {
      this.audio.crown();
      this.cheer("They crowned!");
      await this.animateCrown(move.to);
    }
    this.animating = false;

    if (keepJumping) {
      this.scheduleAi(280);
      return;
    }

    const over = outcome(this.board, "you", this.laws, this.mods);
    if (over === "them") {
      this.tryRites();
      return;
    }
    if (over === "you") {
      this.boardCleared();
      return;
    }
    this.turn = "you";
    this.thinking = false;
    this.snapshot = null;
    this.renderAll();
  }

  private squareEl(p: Pos): HTMLElement | null {
    return document.querySelector(`[data-r="${p.r}"][data-c="${p.c}"]`);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private fx(el: HTMLElement, className: string, ms: number): void {
    document.body.appendChild(el);
    el.classList.add(className);
    window.setTimeout(() => el.remove(), ms);
  }

  private sparkAt(target: HTMLElement, count: number, colors: string[], dist = 36): void {
    const box = target.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      s.style.background = colors[i % colors.length]!;
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const far = dist * (0.65 + Math.random() * 0.5);
      s.style.setProperty("--sx", `${Math.cos(ang) * far}px`);
      s.style.setProperty("--sy", `${Math.sin(ang) * far}px`);
      this.fx(s, "go", 420);
    }
  }

  private puffAt(target: HTMLElement): void {
    const box = target.getBoundingClientRect();
    const p = document.createElement("span");
    p.className = "puff";
    p.style.left = `${box.left + box.width / 2}px`;
    p.style.top = `${box.top + box.height / 2}px`;
    this.fx(p, "go", 380);
  }

  private animateHop(move: Move, side: "you" | "them"): Promise<void> {
    const fromEl = this.squareEl(move.from);
    const toEl = this.squareEl(move.to);
    const man = fromEl?.querySelector(".man") as HTMLElement | null;
    if (!fromEl || !toEl || !man) return this.wait(0);

    const start = man.getBoundingClientRect();
    const destBox = toEl.getBoundingClientRect();
    const fly = man.cloneNode(true) as HTMLElement;
    fly.classList.add("flyer");
    fly.style.width = `${start.width}px`;
    fly.style.height = `${start.height}px`;
    fly.style.left = `${start.left}px`;
    fly.style.top = `${start.top}px`;
    man.style.opacity = "0";
    document.body.appendChild(fly);
    this.puffAt(fromEl);

    const dx = destBox.left + (destBox.width - start.width) / 2 - start.left;
    const dy = destBox.top + (destBox.height - start.height) / 2 - start.top;
    const arc = -Math.min(side === "you" ? 72 : 56, Math.hypot(dx, dy) * 0.42);
    const spin = move.capture ? (dx >= 0 ? 22 : -22) : dx >= 0 ? 8 : -8;
    const ms = move.capture ? 340 : 280;

    const hop = fly.animate(
      [
        { transform: "translate(0, 0) scale(1) rotate(0deg)" },
        {
          transform: `translate(${dx * 0.5}px, ${dy * 0.45 + arc}px) scale(1.2) rotate(${spin}deg)`,
          offset: 0.42,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(1.04) rotate(0deg)` },
      ],
      { duration: ms, easing: "cubic-bezier(.2,.85,.25,1)", fill: "forwards" },
    );

    const extras: Promise<void>[] = [hop.finished.then(() => undefined).catch(() => undefined), this.wait(ms)];

    if (move.capture) {
      const capEl = this.squareEl(move.capture);
      const capMan = capEl?.querySelector(".man") as HTMLElement | null;
      if (capEl && capMan) {
        const cbox = capMan.getBoundingClientRect();
        capMan.style.opacity = "0";
        const taken = capMan.cloneNode(true) as HTMLElement;
        taken.classList.add("flyer", "taken");
        taken.style.width = `${cbox.width}px`;
        taken.style.height = `${cbox.height}px`;
        taken.style.left = `${cbox.left}px`;
        taken.style.top = `${cbox.top}px`;
        document.body.appendChild(taken);
        this.sparkAt(capEl, 8, ["#ffd45a", "#fff3d4", "#ff9a6b"], 42);
        this.puffAt(capEl);
        const kick = dx >= 0 ? 28 : -28;
        const pop = taken.animate(
          [
            { transform: "scale(1) rotate(0deg)", opacity: 1 },
            { transform: `scale(1.25) rotate(${kick > 0 ? -18 : 18}deg)`, opacity: 1, offset: 0.22 },
            { transform: `translate(${kick}px, 36px) scale(0.15) rotate(${kick > 0 ? 70 : -70}deg)`, opacity: 0 },
          ],
          { duration: 320, easing: "ease-in", fill: "forwards" },
        );
        extras.push(pop.finished.then(() => undefined).catch(() => undefined));
        window.setTimeout(() => taken.remove(), 340);
      }
    }

    return Promise.all(extras).then(() => {
      fly.remove();
    });
  }

  private async settle(pos: Pos, willCrown: boolean, quick: boolean): Promise<void> {
    const man = this.squareEl(pos)?.querySelector(".man") as HTMLElement | null;
    if (!man) return;
    man.classList.add(willCrown ? "just-crowned" : "just-landed");
    const sq = this.squareEl(pos);
    if (sq) this.puffAt(sq);
    if (!willCrown) this.sparkAt(man, quick ? 3 : 5, ["#fff3d4", "#ffd45a"], 22);
    await this.wait(willCrown || quick ? 140 : 200);
  }

  private async animateCrown(pos: Pos): Promise<void> {
    const sq = this.squareEl(pos);
    const man = sq?.querySelector(".man") as HTMLElement | null;
    if (!sq || !man) return;
    man.classList.add("just-crowned", "king");
    const box = man.getBoundingClientRect();
    const crown = document.createElement("span");
    crown.className = "crown-drop";
    crown.style.left = `${box.left + box.width / 2}px`;
    crown.style.top = `${box.top - 8}px`;
    this.fx(crown, "go", 620);
    this.sparkAt(sq, 12, ["#ffd45a", "#fff8ea", "#ffe08a", "#ffb347"], 48);
    const ring = document.createElement("span");
    ring.className = "crown-ring";
    ring.style.left = `${box.left + box.width / 2}px`;
    ring.style.top = `${box.top + box.height / 2}px`;
    this.fx(ring, "go", 560);
    await this.wait(560);
  }

  private tryRites(): void {
    if (this.laws.lastRites && !this.lastRitesUsed) {
      this.lastRitesUsed = true;
      const before = new Set(piecesOf(this.board, "you").map((x) => x.piece.id));
      this.board = recruitMan(this.board, "you", this.pid, this.mods);
      const spawned = piecesOf(this.board, "you").find((x) => !before.has(x.piece.id));
      const target = spawned ?? piecesOf(this.board, "you")[0];
      if (target) {
        const p = this.board[target.pos.r]![target.pos.c];
        if (p) p.king = true;
      }
      this.pushLog("Second Chance! A king hops back on.");
      this.cheer("Saved!");
      this.audio.crown();
      this.turn = "you";
      this.thinking = false;
      this.lock = null;
      this.selected = null;
      this.renderAll();
      if (target) void this.animateCrown(target.pos);
      if (outcome(this.board, "you", this.laws, this.mods) === "them") this.finish(false);
      return;
    }
    this.finish(false);
  }

  private boardCleared(): void {
    this.thinking = false;
    this.animating = false;
    this.audio.win();
    this.cheer("Board clear!");
    if (this.boardIndex >= PATH_END - 1) {
      window.setTimeout(() => this.finish(true), 700);
      return;
    }
    const pool = unusedLaws(this.laws);
    window.setTimeout(() => {
      if (!pool.length) {
        this.boardIndex += 1;
        this.loadBoard();
        this.show("playing");
        return;
      }
      this.rng.shuffle(pool);
      this.offers = pool.slice(0, Math.min(3, pool.length));
      this.show("pick");
    }, 720);
  }

  private finish(win: boolean): void {
    this.clearAi();
    this.thinking = false;
    this.animating = false;
    const gained = notchesFromRun(this.hops, this.meta.notches);
    this.meta.notches += gained;
    this.meta.bestBoard = Math.max(this.meta.bestBoard, this.boardIndex + 1);
    if (win) this.meta.wins += 1;
    saveMeta(this.meta);
    this.end = {
      win,
      hops: this.hops,
      notches: this.meta.notches,
      gained,
      board: this.boardIndex + 1,
    };
    if (win) this.audio.win();
    else this.audio.lose();
    this.show("end");
  }

  show(name: Screen): void {
    this.screen = name;
    document.querySelectorAll("[data-screen]").forEach((el) => {
      el.classList.toggle("hidden", el.getAttribute("data-screen") !== name);
    });
    document.getElementById("table")?.classList.toggle("hidden", name !== "playing");
    if (name === "title") this.renderTitle();
    if (name === "end") this.renderEnd();
    if (name === "pick") this.renderPick();
    if (name === "playing") this.renderAll();
    this.renderChrome();
  }

  private renderChrome(): void {
    const mute = document.querySelector("[data-cmd='mute']");
    if (mute) mute.textContent = this.meta.mute ? "Sound is off" : "Sound is on";
    const hudMute = document.getElementById("btn-mute");
    if (hudMute) hudMute.textContent = this.meta.mute ? "Sound off" : "Sound on";
  }

  private renderTitle(): void {
    const rem = document.getElementById("notch-count");
    if (rem) rem.textContent = String(this.meta.notches);
    const stats = document.getElementById("meta-stats");
    const b = notchBonus(this.meta.notches);
    if (stats) {
      const extra = b.extra ? ` · extra man +${b.extra}` : "";
      stats.textContent = `${this.meta.runs} plays · farthest ${this.meta.bestBoard} / ${PATH_END} · ${this.meta.wins} Crowns beaten${extra}`;
    }
  }

  private renderPick(): void {
    const box = document.getElementById("pick-body");
    if (!box) return;
    const next = BOARD_NAMES[this.boardIndex + 1] ?? "the next board";
    box.innerHTML = `
      <p class="kicker">You won the board!</p>
      <h2>Pick a power</h2>
      <p class="lead">Nice hops. Choose one treat before ${next}.</p>
      <div class="col">
        ${this.offers
          .map(
            (o) => `<button type="button" data-cmd="law:${o.id}">
              <b>${o.icon} ${o.name}</b>
              <small>${o.desc}</small>
            </button>`,
          )
          .join("")}
      </div>
    `;
  }

  private renderEnd(): void {
    const box = document.getElementById("end-body");
    const s = this.end;
    if (!box || !s) return;
    const b = notchBonus(s.notches);
    const close = s.board >= 3;
    box.innerHTML = `
      <p class="kicker">${s.win ? "You did it" : close ? "So close" : "Nice try"}</p>
      <h2>${s.win ? "The Crown is yours!" : "Want to hop again?"}</h2>
      <p class="lead">${
        s.win
          ? "Every charcoal checker is in the box. Sit down tomorrow for a new path."
          : "Your ivory hopped off the board. Stars from this try make the next First Hop a little kinder."
      }</p>
      <ul class="stats">
        <li>Reached ${BOARD_NAMES[s.board - 1] ?? ""} (${s.board} / ${PATH_END})</li>
        <li>${s.hops} captures</li>
        <li class="star-line">Stars +${s.gained} <span>(now ${s.notches})</span></li>
        <li>Next game: ${b.extra ? `+${b.extra} extra man` : "same crew"}${
          b.kingChance > 0.05 ? ` · ${Math.round(b.kingChance * 100)}% start crowned` : ""
        }</li>
      </ul>
    `;
  }

  renderAll(): void {
    this.renderBoard();
    this.renderHud();
  }

  private renderHud(): void {
    const you = piecesOf(this.board, "you").length;
    const them = piecesOf(this.board, "them").length;
    const name = BOARD_NAMES[this.boardIndex] ?? "";
    const goal = document.getElementById("goal");
    if (goal) goal.textContent = name;
    const path = document.getElementById("path");
    if (path) {
      path.innerHTML = BOARD_NAMES.map(
        (n, i) =>
          `<li class="${i < this.boardIndex ? "done" : i === this.boardIndex ? "now" : ""}" title="${n}">${i + 1}</li>`,
      ).join("");
    }
    const legal = this.turn === "you" && !this.thinking ? legalMoves(this.board, "you", this.laws, this.lock, this.mods) : [];
    const jumps = legal.filter((m) => m.capture);
    const status = document.getElementById("status");
    if (status) {
      status.textContent = this.thinking
        ? this.canOops()
          ? "Charcoal is thinking… Oops still works!"
          : "Charcoal is hopping…"
        : this.lock
          ? "Keep jumping — another star!"
          : jumps.length
            ? this.selected
              ? "Jump onto the star!"
              : "A jump is ready. Tap the gold ring, then the star."
            : this.selected
              ? "Tap a cream pip to hop."
              : this.turn === "you"
                ? "Your turn. Gold rings can move."
                : "Wait.";
    }
    const counts = document.getElementById("counts");
    if (counts) counts.textContent = `You ${you} · them ${them} · hops ${this.hops}`;
    const tip = document.getElementById("blurb");
    if (tip) tip.textContent = this.blurb;
    const oops = document.getElementById("btn-oops");
    if (oops instanceof HTMLButtonElement) {
      oops.disabled = !this.canOops();
      oops.textContent = this.oopsLeft ? "Oops" : "Oops used";
    }
    const laws = document.getElementById("laws");
    if (laws) {
      const owned = LAW_DEFS.filter((d) => this.laws[d.id]);
      laws.innerHTML = owned.length
        ? owned.map((d) => `<li><b>${d.icon} ${d.name}</b> ${d.desc}</li>`).join("")
        : `<li class="quiet">Win a board to pick a power.</li>`;
    }
    const log = document.getElementById("log");
    if (log) log.innerHTML = this.log.map((l) => `<div>${l}</div>`).join("");
  }

  private renderBoard(): void {
    const el = document.getElementById("board");
    if (!el) return;
    const legal = this.turn === "you" && !this.thinking && !this.animating
      ? legalMoves(this.board, "you", this.laws, this.lock, this.mods)
      : [];
    const shown = legal.filter((m) => !this.selected || (m.from.r === this.selected.r && m.from.c === this.selected.c));
    const hints = new Set(shown.map((m) => `${m.to.r},${m.to.c}`));
    const jumps = new Set(shown.filter((m) => m.capture).map((m) => `${m.to.r},${m.to.c}`));
    const froms = new Set(legal.map((m) => `${m.from.r},${m.from.c}`));
    let html = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dark = (r + c) % 2 === 1;
        const hole = isHole(this.mods, r, c);
        const p = this.board[r]![c];
        const sel = this.selected && this.selected.r === r && this.selected.c === c;
        const hint = hints.has(`${r},${c}`);
        const can = p && p.side === "you" && froms.has(`${r},${c}`) && !this.lock;
        html += `<button type="button" class="sq ${dark ? "dark" : "light"} ${hole ? "hole" : ""} ${sel ? "sel" : ""} ${hint ? "hint" : ""} ${can ? "can" : ""}" data-r="${r}" data-c="${c}" ${dark && !hole ? "" : "tabindex='-1'"}>`;
        if (p) {
          html += `<span class="man ${p.side} ${p.king ? "king" : ""}" aria-label="${p.side === "you" ? "ivory" : "charcoal"} ${p.king ? "king" : "man"}"></span>`;
        } else if (hint) {
          html += `<span class="land ${jumps.has(`${r},${c}`) ? "jump" : ""}" aria-hidden="true"></span>`;
        }
        html += `</button>`;
      }
    }
    el.innerHTML = html;
  }
}
