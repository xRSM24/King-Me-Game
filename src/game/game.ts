import { think } from "./ai.ts";
import { AudioSys } from "./audio.ts";
import { LAW_DEFS, unusedLaws, type LawDef } from "./laws.ts";
import { loadMeta, notchBonus, notchesFromRun, saveMeta } from "./meta.ts";
import { dailySeed, hashSeed, Rng } from "./rng.ts";
import {
  applyMove,
  at,
  crownRandom,
  legalMoves,
  moreJumps,
  outcome,
  piecesOf,
  recruitMan,
  setupBoard,
  type Board,
} from "./rules.ts";
import { boardSpec } from "./setup.ts";
import type { Laws, Meta, Move, Pos, Screen } from "./types.ts";
import { BOARD_NAMES, PATH_END, emptyLaws } from "./types.ts";

export class Game {
  meta: Meta = loadMeta();
  audio = new AudioSys();
  screen: Screen = "title";
  rng = new Rng(1);
  board: Board = setupBoard(boardSpec(0, 0, false), () => 1);
  laws: Laws = emptyLaws();
  hops = 0;
  boardIndex = 0;
  turn: "you" | "them" = "you";
  selected: Pos | null = null;
  lock: Pos | null = null;
  thinking = false;
  aiTimer: number | null = null;
  lastRitesUsed = false;
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
    this.audio.ui();
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
    this.boardIndex = 0;
    this.lastRitesUsed = false;
    this.end = null;
    this.idSeq = 1;
    this.meta.runs += 1;
    saveMeta(this.meta);
    this.loadBoard();
    this.pushLog("Ivory vs charcoal. Hop when you can — the felt does not forgive.");
    this.show("playing");
  }

  private scheduleAi(delay: number): void {
    this.clearAi();
    this.aiTimer = window.setTimeout(() => {
      this.aiTimer = null;
      this.aiStep();
    }, delay);
  }

  private clearAi(): void {
    if (this.aiTimer != null) {
      window.clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private resumeAiIfNeeded(): void {
    if (this.screen === "playing" && this.thinking && this.turn === "them") {
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
    this.board = setupBoard(spec, this.pid);
    this.turn = "you";
    this.selected = null;
    this.lock = null;
    this.thinking = false;
    this.clearAi();
    const name = BOARD_NAMES[this.boardIndex] ?? "Unknown felt";
    this.pushLog(`${name}. Ivory ${piecesOf(this.board, "you").length} · charcoal ${piecesOf(this.board, "them").length}.`);
  }

  private pushLog(msg: string): void {
    this.log.unshift(msg);
    if (this.log.length > 4) this.log.length = 4;
  }

  clickSquare(r: number, c: number): void {
    if (this.turn !== "you" || this.screen !== "playing" || this.thinking) return;
    const pos = { r, c };
    const piece = at(this.board, pos);
    const legal = legalMoves(this.board, "you", this.laws, this.lock);
    const hit = legal.find((m) => m.to.r === r && m.to.c === c && (!this.selected || (m.from.r === this.selected.r && m.from.c === this.selected.c)));

    if (this.selected && hit && hit.from.r === this.selected.r && hit.from.c === this.selected.c) {
      this.play(hit);
      return;
    }
    if (this.lock) return;
    const canSelect = legal.some((m) => m.from.r === r && m.from.c === c);
    if (piece && piece.side === "you" && canSelect) {
      this.selected = pos;
      this.renderBoard();
      return;
    }
    if (this.selected) {
      const m = legal.find((mv) => mv.from.r === this.selected!.r && mv.from.c === this.selected!.c && mv.to.r === r && mv.to.c === c);
      if (m) this.play(m);
    }
  }

  private play(move: Move): void {
    const wasKing = at(this.board, move.from)?.king ?? false;
    this.board = applyMove(this.board, move);
    const nowKing = at(this.board, move.to)?.king ?? false;
    if (move.capture) {
      this.hops += 1;
      this.audio.capture();
      this.pushLog("Taken.");
      if (this.laws.recruit) this.board = recruitMan(this.board, "you", this.pid);
      if (this.laws.hopCrown && this.hops % 4 === 0) {
        const c = crownRandom(this.board, "you", (n) => this.rng.int(n));
        this.board = c.board;
        if (c.did) {
          this.audio.crown();
          this.pushLog("Hop Fever crowns a man.");
        }
      }
    } else {
      this.audio.hop();
    }
    if (!wasKing && nowKing) {
      this.audio.crown();
      this.pushLog("Crowned.");
    }

    if (move.capture && moreJumps(this.board, move.to, this.laws)) {
      this.lock = move.to;
      this.selected = move.to;
      this.renderAll();
      return;
    }

    this.lock = null;
    this.selected = null;
    this.afterYou();
  }

  private afterYou(): void {
    const over = outcome(this.board, "them", this.laws);
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
    this.renderAll();
    this.scheduleAi(420);
  }

  private aiStep(): void {
    if (this.screen !== "playing") return;
    const skill = 0.25 + this.boardIndex * 0.12;
    const move = think(this.board, this.laws, this.rng, skill);
    if (!move) {
      this.boardCleared();
      return;
    }
    this.board = applyMove(this.board, move);
    if (move.capture) this.audio.capture();
    else this.audio.hop();
    this.renderAll();

    if (move.capture && moreJumps(this.board, move.to, this.laws)) {
      this.scheduleAi(380);
      return;
    }

    const over = outcome(this.board, "you", this.laws);
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
    this.renderAll();
  }

  private tryRites(): void {
    if (this.laws.lastRites && !this.lastRitesUsed) {
      this.lastRitesUsed = true;
      const before = new Set(piecesOf(this.board, "you").map((x) => x.piece.id));
      this.board = recruitMan(this.board, "you", this.pid);
      const spawned = piecesOf(this.board, "you").find((x) => !before.has(x.piece.id));
      const target = spawned ?? piecesOf(this.board, "you")[0];
      if (target) {
        const p = this.board[target.pos.r]![target.pos.c];
        if (p) p.king = true;
      }
      this.pushLog("Last Rites. One king crawls back onto the felt.");
      this.audio.crown();
      this.turn = "you";
      this.thinking = false;
      this.lock = null;
      this.selected = null;
      this.renderAll();
      if (outcome(this.board, "you", this.laws) === "them") this.finish(false);
      return;
    }
    this.finish(false);
  }

  private boardCleared(): void {
    this.thinking = false;
    if (this.boardIndex >= PATH_END - 1) {
      this.finish(true);
      return;
    }
    const pool = unusedLaws(this.laws);
    if (!pool.length) {
      this.boardIndex += 1;
      this.loadBoard();
      this.show("playing");
      return;
    }
    this.rng.shuffle(pool);
    this.offers = pool.slice(0, Math.min(3, pool.length));
    this.show("pick");
  }

  private finish(win: boolean): void {
    this.clearAi();
    this.thinking = false;
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
      stats.textContent = `${this.meta.runs} tries · deepest ${this.meta.bestBoard} / ${PATH_END} · ${this.meta.wins} wins · extra men ${b.extra} · crown chance ${Math.round(b.kingChance * 100)}%`;
    }
  }

  private renderPick(): void {
    const box = document.getElementById("pick-body");
    if (!box) return;
    const next = BOARD_NAMES[this.boardIndex + 1] ?? "the next felt";
    box.innerHTML = `
      <p class="kicker">The felt rewrites itself</p>
      <h2>A new Law</h2>
      <p class="lead">You cleared ${BOARD_NAMES[this.boardIndex]}. Pick one rule before ${next}.</p>
      <div class="col">
        ${this.offers
          .map(
            (o) => `<button type="button" data-cmd="law:${o.id}">
              <b>${o.name}</b>
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
    box.innerHTML = `
      <p class="kicker">${s.win ? "The Black Crown falls" : "The felt is empty"}</p>
      <h2>${s.win ? "You keep the table" : "Wiped"}</h2>
      <p class="lead">${
        s.win
          ? "Every charcoal king is in the box. The house will still deal you another path tomorrow."
          : "No ivory left to hop. Notches from this try make the next opening a little kinder — then they stop, so you never own the table."
      }</p>
      <ul class="stats">
        <li>Board ${s.board} — ${BOARD_NAMES[s.board - 1] ?? ""}</li>
        <li>${s.hops} captures</li>
        <li>Notches +${s.gained} (now ${s.notches})</li>
        <li>Next opening: +${b.extra} man · ${Math.round(b.kingChance * 100)}% borrowed crown</li>
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
    if (goal) {
      goal.textContent = `${name} · ${this.boardIndex + 1} / ${PATH_END}`;
    }
    const status = document.getElementById("status");
    if (status) {
      status.textContent = this.thinking
        ? "Charcoal is hopping…"
        : this.lock
          ? "Keep jumping."
          : this.selected
            ? "Land on a marked square."
            : this.turn === "you"
              ? "Your hop. Gold rings can move."
              : "Wait.";
    }
    const counts = document.getElementById("counts");
    if (counts) counts.textContent = `Ivory ${you} · charcoal ${them} · hops ${this.hops}`;
    const laws = document.getElementById("laws");
    if (laws) {
      const owned = LAW_DEFS.filter((d) => this.laws[d.id]);
      laws.innerHTML = owned.length
        ? owned.map((d) => `<li><b>${d.name}</b> ${d.desc}</li>`).join("")
        : `<li class="quiet">No laws yet. Win a board to rewrite the rules.</li>`;
    }
    const log = document.getElementById("log");
    if (log) log.innerHTML = this.log.map((l) => `<div>${l}</div>`).join("");
  }

  private renderBoard(): void {
    const el = document.getElementById("board");
    if (!el) return;
    const legal = this.turn === "you" && !this.thinking ? legalMoves(this.board, "you", this.laws, this.lock) : [];
    const hints = new Set(
      legal
        .filter((m) => !this.selected || (m.from.r === this.selected.r && m.from.c === this.selected.c))
        .map((m) => `${m.to.r},${m.to.c}`),
    );
    const froms = new Set(legal.map((m) => `${m.from.r},${m.from.c}`));
    let html = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dark = (r + c) % 2 === 1;
        const p = this.board[r]![c];
        const sel = this.selected && this.selected.r === r && this.selected.c === c;
        const hint = hints.has(`${r},${c}`);
        const can = p && p.side === "you" && froms.has(`${r},${c}`) && !this.lock;
        html += `<button type="button" class="sq ${dark ? "dark" : "light"} ${sel ? "sel" : ""} ${hint ? "hint" : ""} ${can ? "can" : ""}" data-r="${r}" data-c="${c}" ${dark ? "" : "tabindex='-1'"}>`;
        if (p) {
          html += `<span class="man ${p.side} ${p.king ? "king" : ""}" aria-label="${p.side} ${p.king ? "king" : "man"}"></span>`;
        } else if (hint) {
          html += `<span class="land" aria-hidden="true"></span>`;
        }
        html += `</button>`;
      }
    }
    el.innerHTML = html;
  }
}
