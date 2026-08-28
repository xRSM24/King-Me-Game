import { think } from "./ai.ts";
import { AudioSys } from "./audio.ts";
import { comboName, comboTier } from "./combo.ts";
import { dailySpec, dailyTitle, utcDayKey } from "./daily.ts";
import { applyDailyMods, dailyMods, type DailyMod } from "./dailyMods.ts";
import { LAW_DEFS, unusedLaws, type LawDef } from "./laws.ts";
import { commitName, escapeHtml, fetchBoard, hasName, loadName, postScore, tryName, type Score } from "./leaderboard.ts";
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
import { clearClimb, hasClimb, loadClimb, packBoard, saveClimb, unpackBoard } from "./save.ts";
import { boardSpec, climbNames, CLIMB_SKILL } from "./setup.ts";
import type { BoardMods, Laws, Meta, Move, Pos, Screen } from "./types.ts";
import { BOARD_NAMES, PATH_END, emptyLaws, emptyMods, inBoard, isDark, samePos } from "./types.ts";

export class Game {
  meta: Meta = loadMeta();
  audio = new AudioSys();
  screen: Screen = "title";
  rng = new Rng(1);
  runSeed = 1;
  pathNames = climbNames(1);
  board: Board = setupBoard(boardSpec(0, 0, false, new Rng(1)), () => 1);
  laws: Laws = emptyLaws();
  mods: BoardMods = emptyMods();
  blurb = "";
  hops = 0;
  moves = 0;
  combo = 0;
  boardIndex = 0;
  mode: "run" | "daily" = "run";
  dailyLabel = "";
  twists: DailyMod[] = [];
  scores: Score[] = [];
  posted = false;
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
  snapshotMoves = 0;
  drag: {
    from: Pos;
    startX: number;
    startY: number;
    pointerId: number;
    flyer: HTMLElement | null;
    origin: HTMLElement | null;
    sliding: boolean;
    dropAt: Pos | null;
  } | null = null;
  skipClick = false;
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
  coachOn = false;
  keyFocus: Pos | null = null;

  constructor() {
    this.bind();
    this.applyPrefs();
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
      if (this.skipClick) {
        this.skipClick = false;
        return;
      }
      const sq = t.closest("[data-r]");
      if (sq instanceof HTMLElement && this.screen === "playing") {
        const r = Number(sq.getAttribute("data-r"));
        const c = Number(sq.getAttribute("data-c"));
        if (Number.isFinite(r) && Number.isFinite(c)) this.clickSquare(r, c);
      }
    });
    document.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    document.addEventListener("pointermove", (e) => this.onPointerMove(e));
    document.addEventListener("pointerup", (e) => this.finishDrag(e.clientX, e.clientY, e.pointerId));
    document.addEventListener("pointercancel", (e) => this.finishDrag(e.clientX, e.clientY, e.pointerId));
    document.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.finishDrag(e.clientX, e.clientY);
    });
    document.addEventListener("keydown", (e) => this.onKey(e));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.persistClimb();
    });
    window.addEventListener("pagehide", () => this.persistClimb());
    document.addEventListener("submit", (e) => {
      if (!(e.target instanceof HTMLFormElement)) return;
      if (e.target.id === "score-form") {
        e.preventDefault();
        void this.submitDaily();
        return;
      }
      if (e.target.id === "name-form" || e.target.id === "pause-name-form") {
        e.preventDefault();
        this.saveHopperName(e.target);
      }
    });
    document.addEventListener("focusout", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.id === "hopper-name" || t.id === "pause-name" || t.id === "player-name") {
        this.saveHopperName(t.form ?? t, false);
      }
    });
  }

  command(cmd: string): void {
    this.unlock();
    if (cmd !== "oops") this.audio.ui();
    if (cmd === "new") {
      if (hasClimb()) this.continueClimb();
      else this.newRun();
      return;
    }
    if (cmd === "fresh") {
      this.newRun();
      return;
    }
    if (cmd === "continue") {
      this.continueClimb();
      return;
    }
    if (cmd === "daily") {
      void this.openDaily();
      return;
    }
    if (cmd === "daily-play") {
      this.newDaily();
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
      if (this.screen === "playing") {
        this.persistClimb();
        this.show("pause");
      }
      return;
    }
    if (cmd === "home") {
      this.persistClimb();
      this.show("title");
      return;
    }
    if (cmd === "coach-ok") {
      this.finishCoach();
      return;
    }
    if (cmd === "colorblind") {
      this.meta.colorblind = !this.meta.colorblind;
      saveMeta(this.meta);
      this.applyPrefs();
      this.renderChrome();
      return;
    }
    if (cmd === "motion") {
      this.meta.reduceMotion = !this.meta.reduceMotion;
      saveMeta(this.meta);
      this.applyPrefs();
      this.renderChrome();
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
      if (!this.meta.mute) this.audio.ui();
      return;
    }
    if (cmd.startsWith("law:")) {
      const id = cmd.slice(4) as keyof Laws;
      if (this.screen === "pick" && id in this.laws) {
        this.laws[id] = true;
        this.boardIndex += 1;
        this.loadBoard();
        this.show("playing");
        this.persistClimb();
      }
    }
  }

  private saveHopperName(source: HTMLElement, cheer = true): void {
    const input =
      source instanceof HTMLInputElement
        ? source
        : source.querySelector("input");
    const typed = input instanceof HTMLInputElement ? input.value : "";
    if (!typed.trim()) {
      this.paintName();
      return;
    }
    const result = commitName(typed);
    this.paintName();
    if (!result.saved) {
      const status = document.getElementById("name-status");
      if (status) status.textContent = "A bit longer — two letters at least.";
      return;
    }
    if (cheer) {
      this.unlock();
      this.audio.ui();
      if (this.screen === "playing") this.cheer(`Hi, ${result.name}!`);
    }
  }

  private paintName(): void {
    const mine = hasName() ? loadName() : "";
    for (const id of ["hopper-name", "pause-name", "player-name"]) {
      const el = document.getElementById(id);
      if (el instanceof HTMLInputElement && document.activeElement !== el) el.value = mine;
    }
    const status = document.getElementById("name-status");
    if (status) {
      status.textContent = hasName()
        ? `${loadName()} — that's you on today's board.`
        : "Pick a name so friends know you. It stays on this device.";
    }
    const hud = document.getElementById("hopper-tag");
    if (hud) hud.textContent = hasName() ? loadName() : "";
  }

  newRun(): void {
    this.unlock();
    this.mode = "run";
    clearClimb();
    const seed = (Math.random() * 0xffffffff) | 0;
    this.runSeed = seed;
    this.rng = new Rng(seed);
    this.pathNames = climbNames(seed);
    this.laws = emptyLaws();
    this.twists = [];
    this.hops = 0;
    this.moves = 0;
    this.combo = 0;
    this.boardIndex = 0;
    this.lastRitesUsed = false;
    this.end = null;
    this.posted = false;
    this.idSeq = 1;
    this.meta.runs += 1;
    saveMeta(this.meta);
    this.loadBoard();
    this.pushLog("Tap a gold ring, then a pip. Stars mean jump!");
    this.show("playing");
    this.cheer("Let's hop!");
    this.maybeCoach();
    this.persistClimb();
  }

  continueClimb(): void {
    const saved = loadClimb();
    if (!saved) {
      this.newRun();
      return;
    }
    this.unlock();
    this.mode = "run";
    this.end = null;
    this.posted = false;
    this.twists = [];
    this.runSeed = saved.runSeed;
    this.rng = new Rng(saved.runSeed + saved.hops * 17 + saved.boardIndex * 31);
    this.pathNames = saved.pathNames.length ? saved.pathNames : climbNames(saved.runSeed);
    this.board = unpackBoard(saved.board);
    this.laws = saved.laws;
    this.mods = { ...emptyMods(), ...saved.mods };
    this.blurb = saved.blurb;
    this.hops = saved.hops;
    this.moves = saved.moves;
    this.combo = saved.combo;
    this.boardIndex = saved.boardIndex;
    this.turn = saved.turn;
    this.lock = saved.lock;
    this.selected = saved.lock;
    this.lastRitesUsed = saved.lastRitesUsed;
    this.oopsLeft = saved.oopsLeft;
    this.snapshot = saved.snapshot ? unpackBoard(saved.snapshot) : null;
    this.snapshotHops = saved.snapshotHops;
    this.snapshotMoves = saved.snapshotMoves;
    this.idSeq = Math.max(saved.idSeq, this.maxPieceId() + 1);
    this.log = saved.log;
    this.offers = LAW_DEFS.filter((d) => saved.offers.includes(d.id));
    this.thinking = saved.turn === "them";
    this.animating = false;
    this.clearAi();
    this.coachOn = false;
    this.hideCoach();
    if (saved.screen === "pick" && this.offers.length) {
      this.show("pick");
      return;
    }
    this.show("playing");
    this.pushLog("Welcome back. The pieces waited.");
    this.cheer("Welcome back!");
    if (this.turn === "them") this.scheduleAi(280);
  }

  private maxPieceId(): number {
    let n = 0;
    for (const row of this.board) {
      for (const p of row) {
        if (p && p.id > n) n = p.id;
      }
    }
    return n;
  }

  private persistClimb(): void {
    if (this.mode !== "run" || this.end) return;
    if (this.screen !== "playing" && this.screen !== "pick" && this.screen !== "pause") return;
    saveClimb({
      v: 1,
      runSeed: this.runSeed,
      pathNames: this.pathNames,
      board: packBoard(this.board),
      laws: this.laws,
      mods: this.mods,
      blurb: this.blurb,
      hops: this.hops,
      moves: this.moves,
      combo: this.combo,
      boardIndex: this.boardIndex,
      turn: this.turn,
      lock: this.lock,
      lastRitesUsed: this.lastRitesUsed,
      oopsLeft: this.oopsLeft,
      snapshot: this.snapshot ? packBoard(this.snapshot) : null,
      snapshotHops: this.snapshotHops,
      snapshotMoves: this.snapshotMoves,
      idSeq: this.idSeq,
      log: this.log,
      offers: this.offers.map((o) => o.id),
      screen: this.screen === "pick" ? "pick" : "playing",
    });
  }

  private async openDaily(): Promise<void> {
    this.unlock();
    this.dailyLabel = dailyTitle();
    this.twists = dailyMods();
    this.show("daily");
    const board = await fetchBoard(utcDayKey());
    this.scores = board.scores;
    this.renderDaily();
  }

  newDaily(): void {
    this.unlock();
    this.mode = "daily";
    this.rng = new Rng(hashSeed(dailySeed() * 97 + 13));
    this.twists = dailyMods();
    const applied = applyDailyMods(dailySpec(), this.twists);
    this.laws = applied.laws;
    this.hops = 0;
    this.moves = 0;
    this.combo = 0;
    this.boardIndex = 0;
    this.lastRitesUsed = false;
    this.end = null;
    this.posted = false;
    this.idSeq = 1;
    const spec = applied.spec;
    this.dailyLabel = dailyTitle();
    this.mods = {
      holes: spec.holes,
      bounce: spec.bounce,
      themFly: applied.themFly,
      themBack: applied.themBack,
    };
    this.blurb = spec.blurb;
    this.board = setupBoard(spec, this.pid);
    this.turn = "you";
    this.selected = null;
    this.lock = null;
    this.thinking = false;
    this.animating = false;
    this.oopsLeft = applied.oops;
    this.snapshot = null;
    this.coachOn = false;
    this.hideCoach();
    this.clearAi();
    const twistLine = this.twists.map((t) => t.name).join(" · ");
    this.pushLog(`${this.dailyLabel}. ${twistLine}. Fewest moves wins today.`);
    this.show("playing");
    this.cheer("Daily!");
  }

  private scheduleAi(delay: number): void {
    this.clearAi();
    this.aiTimer = window.setTimeout(() => {
      this.aiTimer = null;
      void this.aiStep().catch(() => {
        this.animating = false;
        this.thinking = false;
        this.turn = "you";
        this.lock = null;
        this.selected = null;
        this.renderAll();
      });
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
    const boardRng = new Rng(hashSeed(this.runSeed + (this.boardIndex + 1) * 104729));
    const spec = boardSpec(this.boardIndex, this.extraMen(), openKing, boardRng);
    this.mods = { holes: spec.holes, bounce: spec.bounce, themFly: spec.themFly, themBack: false };
    this.blurb = spec.blurb;
    this.board = setupBoard(spec, this.pid);
    this.turn = "you";
    this.selected = null;
    this.lock = null;
    this.thinking = false;
    this.animating = false;
    this.oopsLeft = this.mode === "daily" ? 2 : 1;
    this.snapshot = null;
    this.combo = 0;
    this.clearAi();
    const name = this.pathNames[this.boardIndex] ?? "Next board";
    this.pushLog(`${name}. ${spec.blurb}`);
    this.persistClimb();
  }

  private pushLog(msg: string): void {
    this.log.unshift(msg);
    if (this.log.length > 3) this.log.length = 3;
  }

  private applyPrefs(): void {
    document.documentElement.classList.toggle("cb", this.meta.colorblind);
    document.documentElement.classList.toggle("calm", this.meta.reduceMotion);
    this.audio.setMuted(this.meta.mute);
  }

  private wantsFx(): boolean {
    return !this.meta.reduceMotion;
  }

  private maybeCoach(): void {
    if (this.meta.sawTutorial || this.mode !== "run" || this.boardIndex !== 0) {
      this.coachOn = false;
      this.hideCoach();
      return;
    }
    this.coachOn = true;
    const el = document.getElementById("coach");
    if (el) el.classList.remove("hidden");
    document.getElementById("board")?.classList.add("coaching");
    const status = document.getElementById("status");
    if (status) status.textContent = "Drag the gold ring onto the star.";
  }

  private finishCoach(): void {
    if (!this.coachOn && this.meta.sawTutorial) {
      this.hideCoach();
      return;
    }
    this.coachOn = false;
    this.meta.sawTutorial = true;
    saveMeta(this.meta);
    this.hideCoach();
  }

  private hideCoach(): void {
    document.getElementById("coach")?.classList.add("hidden");
    document.getElementById("board")?.classList.remove("coaching");
  }

  private petalBurst(): void {
    if (!this.wantsFx()) return;
    const host = document.querySelector(".petals");
    if (!(host instanceof HTMLElement)) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("i");
      p.className = "burst";
      p.style.left = `${8 + Math.random() * 84}%`;
      p.style.animationDuration = `${0.9 + Math.random() * 0.8}s`;
      p.style.animationDelay = `${Math.random() * 0.12}s`;
      host.appendChild(p);
      window.setTimeout(() => p.remove(), 1800);
    }
  }

  private onKey(e: KeyboardEvent): void {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key === "Escape" && this.screen === "playing" && !typing) {
      e.preventDefault();
      this.command("pause");
      return;
    }
    if (this.screen !== "playing" || typing) {
      if ((e.key === "Enter" || e.key === " ") && !typing) {
        const t = e.target;
        if (t instanceof HTMLElement && t.closest("#board [data-r]")) {
          /* handled below when playing */
        }
      }
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const sq = t.closest("#board [data-r]");
      if (!(sq instanceof HTMLElement)) return;
      e.preventDefault();
      const r = Number(sq.getAttribute("data-r"));
      const c = Number(sq.getAttribute("data-c"));
      if (Number.isFinite(r) && Number.isFinite(c)) this.clickSquare(r, c);
      return;
    }
    const step: Record<string, Pos> = {
      ArrowUp: { r: -1, c: 0 },
      ArrowDown: { r: 1, c: 0 },
      ArrowLeft: { r: 0, c: -1 },
      ArrowRight: { r: 0, c: 1 },
    };
    const dir = step[e.key];
    if (!dir) return;
    e.preventDefault();
    this.moveFocus(dir);
  }

  private moveFocus(dir: Pos): void {
    const active = document.activeElement;
    let r = this.keyFocus?.r ?? 7;
    let c = this.keyFocus?.c ?? 0;
    if (active instanceof HTMLElement && active.hasAttribute("data-r")) {
      r = Number(active.getAttribute("data-r"));
      c = Number(active.getAttribute("data-c"));
    }
    for (let i = 1; i < 16; i++) {
      const nr = r + dir.r * i;
      const nc = c + dir.c * i;
      if (!inBoard(nr, nc)) break;
      if (!isDark(nr, nc) || isHole(this.mods, nr, nc)) continue;
      this.keyFocus = { r: nr, c: nc };
      this.squareEl(this.keyFocus)?.focus();
      return;
    }
    for (let i = 1; i < 12; i++) {
      for (const tilt of [-1, 1]) {
        const nr = r + dir.r * i + (dir.r === 0 ? tilt : 0);
        const nc = c + dir.c * i + (dir.c === 0 ? tilt : 0);
        if (!inBoard(nr, nc) || !isDark(nr, nc) || isHole(this.mods, nr, nc)) continue;
        this.keyFocus = { r: nr, c: nc };
        this.squareEl(this.keyFocus)?.focus();
        return;
      }
    }
  }

  private cheer(text: string, combo = 0): void {
    const el = document.getElementById("cheer");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.remove("popin");
    el.className = `cheer${combo >= 2 ? ` combo-${comboTier(combo)}` : ""}`;
    void el.offsetWidth;
    el.classList.add("popin");
    if (combo < 2) this.audio.chirp();
    if (this.cheerTimer != null) window.clearTimeout(this.cheerTimer);
    this.cheerTimer = window.setTimeout(() => {
      el.classList.add("hidden");
      this.cheerTimer = null;
    }, combo >= 3 ? 980 : 720);
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
    this.moves = this.snapshotMoves;
    this.lock = null;
    this.selected = null;
    this.combo = 0;
    this.snapshot = null;
    this.turn = "you";
    this.thinking = false;
    this.pushLog("Oops! That hop didn't count.");
    this.cheer("Oops!");
    this.renderAll();
    this.persistClimb();
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button > 0) return;
    if (!(e.target instanceof HTMLElement)) return;
    if (this.turn !== "you" || this.screen !== "playing" || this.thinking || this.animating) return;
    const at = this.posFromPoint(e.clientX, e.clientY);
    if (!at) return;
    const legal = legalMoves(this.board, "you", this.laws, this.lock, this.mods);
    const canFrom = legal.some((m) => m.from.r === at.r && m.from.c === at.c);
    if (!canFrom) return;
    const origin = this.squareEl(at)?.querySelector(".man");
    if (!(origin instanceof HTMLElement)) return;
    this.unlock();
    e.preventDefault();
    this.markSelection(at);
    this.renderHud();
    const board = document.getElementById("board");
    try {
      board?.setPointerCapture(e.pointerId);
    } catch {
      /* geometry hit-test still works without capture */
    }
    this.startFlyer(at, origin, e);
    this.audio.pickup();
  }

  /** Highlight without wiping the board — a full render would cancel the pointer. */
  private markSelection(from: Pos): void {
    this.selected = from;
    const legal = legalMoves(this.board, "you", this.laws, this.lock, this.mods);
    const shown = legal.filter((m) => m.from.r === from.r && m.from.c === from.c);
    const hints = new Set(shown.map((m) => `${m.to.r},${m.to.c}`));
    const jumps = new Set(shown.filter((m) => m.capture).map((m) => `${m.to.r},${m.to.c}`));
    document.querySelectorAll("#board .sq").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const r = Number(node.getAttribute("data-r"));
      const c = Number(node.getAttribute("data-c"));
      const key = `${r},${c}`;
      node.classList.toggle("sel", r === from.r && c === from.c);
      node.classList.toggle("hint", hints.has(key));
      const land = node.querySelector(".land");
      if (hints.has(key) && !this.board[r]![c]) {
        if (land instanceof HTMLElement) {
          land.classList.toggle("jump", jumps.has(key));
        } else {
          const pip = document.createElement("span");
          pip.className = `land ${jumps.has(key) ? "jump" : ""}`;
          pip.setAttribute("aria-hidden", "true");
          node.appendChild(pip);
        }
      } else if (land) {
        land.remove();
      }
    });
  }

  private startFlyer(from: Pos, origin: HTMLElement, e: PointerEvent): void {
    this.cancelDrag();
    const box = origin.getBoundingClientRect();
    const fly = origin.cloneNode(true) as HTMLElement;
    fly.classList.add("flyer", "slide");
    fly.style.width = `${box.width}px`;
    fly.style.height = `${box.height}px`;
    fly.style.left = `${box.left}px`;
    fly.style.top = `${box.top}px`;
    fly.style.pointerEvents = "none";
    origin.style.opacity = "0.35";
    document.body.appendChild(fly);
    this.drag = {
      from,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      flyer: fly,
      origin,
      sliding: false,
      dropAt: null,
    };
  }

  private onPointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (e.pointerId !== d.pointerId && e.buttons === 0) return;
    e.preventDefault();
    const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (dist >= 6) d.sliding = true;
    if (d.flyer) {
      const w = d.flyer.offsetWidth;
      const h = d.flyer.offsetHeight;
      d.flyer.style.left = `${e.clientX - w / 2}px`;
      d.flyer.style.top = `${e.clientY - h / 2}px`;
    }
    document.querySelectorAll(".sq.drop").forEach((el) => el.classList.remove("drop"));
    d.dropAt = null;
    if (!d.sliding) return;
    const at = this.posFromPoint(e.clientX, e.clientY);
    if (!at) return;
    const legal = legalMoves(this.board, "you", this.laws, this.lock, this.mods);
    const ok = legal.some((m) => m.from.r === d.from.r && m.from.c === d.from.c && m.to.r === at.r && m.to.c === at.c);
    if (!ok) return;
    d.dropAt = at;
    this.squareEl(at)?.classList.add("drop");
  }

  private finishDrag(x: number, y: number, pointerId?: number): void {
    const d = this.drag;
    if (!d) return;
    if (pointerId !== undefined && pointerId !== d.pointerId) return;
    const sliding = d.sliding;
    const from = d.from;
    const drop = d.dropAt ?? (sliding ? this.posFromPoint(x, y) : null);
    this.releasePointer(d.pointerId);
    this.cancelDrag();
    if (!sliding) return;
    this.skipClick = true;
    if (drop) {
      const legal = legalMoves(this.board, "you", this.laws, this.lock, this.mods);
      const move = legal.find((m) => m.from.r === from.r && m.from.c === from.c && m.to.r === drop.r && m.to.c === drop.c);
      if (move) {
        void this.play(move, true);
        return;
      }
    }
    if (sliding) {
      this.audio.plop();
      this.renderBoard();
    }
  }

  /** Map a pointer to a square using the board grid, not DOM hit-testing. */
  private posFromPoint(x: number, y: number): Pos | null {
    const board = document.getElementById("board");
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const style = getComputedStyle(board);
    const left = rect.left + (parseFloat(style.borderLeftWidth) || 0);
    const top = rect.top + (parseFloat(style.borderTopWidth) || 0);
    const w = rect.width - (parseFloat(style.borderLeftWidth) || 0) - (parseFloat(style.borderRightWidth) || 0);
    const h = rect.height - (parseFloat(style.borderTopWidth) || 0) - (parseFloat(style.borderBottomWidth) || 0);
    if (w <= 0 || h <= 0) return null;
    const c = Math.floor(((x - left) / w) * 8);
    const r = Math.floor(((y - top) / h) * 8);
    if (r < 0 || r > 7 || c < 0 || c > 7) return null;
    return { r, c };
  }

  private releasePointer(pointerId: number): void {
    const board = document.getElementById("board");
    try {
      if (board?.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
  }

  private cancelDrag(): void {
    document.querySelectorAll(".sq.drop").forEach((el) => el.classList.remove("drop"));
    if (!this.drag) return;
    this.drag.flyer?.remove();
    if (this.drag.origin) this.drag.origin.style.opacity = "";
    this.drag = null;
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
      this.audio.select();
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

  private async play(move: Move, fromDrag = false): Promise<void> {
    if (!this.lock) {
      this.snapshot = cloneBoard(this.board);
      this.snapshotHops = this.hops;
      this.snapshotMoves = this.moves;
    }
    this.animating = true;
    let keepJumping = false;
    try {
      const wasKing = at(this.board, move.from)?.king ?? false;
      if (fromDrag) {
        if (move.capture) {
          const capEl = this.squareEl(move.capture);
          const capMan = capEl?.querySelector(".man") as HTMLElement | null;
          if (capEl && capMan) {
            capMan.classList.add("pop");
            this.audio.pop();
            this.sparkAt(capEl, 8, ["#ffd45a", "#fff3d4", "#ff9a6b"], 42);
            this.puffAt(capEl);
            await this.wait(160);
          }
        }
      } else {
        await this.animateHop(move, "you");
      }
      this.board = applyMove(this.board, move);
      const nowKing = at(this.board, move.to)?.king ?? false;
      let partyPos: Pos | null = null;
      if (move.capture) {
        this.hops += 1;
        this.combo += 1;
        this.audio.capture(this.combo);
        const yell = comboName(this.combo);
        this.cheer(yell, this.combo);
        this.pushLog(this.combo >= 2 ? `${yell} x${this.combo}` : "Got one!");
        if (this.coachOn) this.finishCoach();
        if (this.laws.recruit) this.board = recruitMan(this.board, "you", this.pid, this.mods);
        if (this.laws.hopCrown && this.hops % 4 === 0) {
          const c = crownRandom(this.board, "you", (n) => this.rng.int(n));
          this.board = c.board;
          if (c.did) partyPos = c.pos;
        }
      } else {
        this.combo = 0;
        if (fromDrag) this.audio.hop();
      }

      keepJumping = !!(move.capture && moreJumps(this.board, move.to, this.laws, this.mods));
      this.lock = keepJumping ? move.to : null;
      this.selected = keepJumping ? move.to : null;
      this.renderAll();
      await this.settle(move.to, !wasKing && nowKing, keepJumping);
      if (!wasKing && nowKing) {
        this.audio.crown();
        this.audio.fanfare();
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
    } finally {
      this.animating = false;
    }
    if (keepJumping) {
      const still = legalMoves(this.board, "you", this.laws, this.lock, this.mods).some((m) => m.capture);
      if (still) {
        this.renderAll();
        return;
      }
    }
    this.lock = null;
    this.selected = null;
    this.afterYou();
    this.persistClimb();
  }

  private afterYou(): void {
    this.moves += 1;
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
    this.scheduleAi(this.oopsLeft && this.snapshot ? 520 : 280);
    this.renderAll();
  }

  private async aiStep(): Promise<void> {
    if (this.screen !== "playing") return;
    const skill = this.mode === "daily" ? 0.86 : (CLIMB_SKILL[this.boardIndex] ?? 0.95);
    const move = think(this.board, this.laws, this.rng, skill, this.mods);
    if (!move) {
      this.boardCleared();
      return;
    }
    this.animating = true;
    try {
      const wasKing = at(this.board, move.from)?.king ?? false;
      await this.animateHop(move, "them");
      this.board = applyMove(this.board, move);
      const nowKing = at(this.board, move.to)?.king ?? false;
      if (move.capture) this.audio.capture(1);
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
        this.scheduleAi(220);
        return;
      }
    } catch {
      this.animating = false;
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
    this.persistClimb();
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
    if (!this.wantsFx()) return;
    this.audio.sparkle();
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
    if (!this.wantsFx()) return;
    this.audio.puff();
    const box = target.getBoundingClientRect();
    const p = document.createElement("span");
    p.className = "puff";
    p.style.left = `${box.left + box.width / 2}px`;
    p.style.top = `${box.top + box.height / 2}px`;
    this.fx(p, "go", 380);
  }

  private async animateHop(move: Move, side: "you" | "them"): Promise<void> {
    if (!this.wantsFx()) return this.wait(70);
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
    this.audio.whoosh();
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
    hop.onfinish = () => undefined;

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
        this.audio.pop();
        const kick = dx >= 0 ? 28 : -28;
        taken.animate(
          [
            { transform: "scale(1) rotate(0deg)", opacity: 1 },
            { transform: `scale(1.25) rotate(${kick > 0 ? -18 : 18}deg)`, opacity: 1, offset: 0.22 },
            { transform: `translate(${kick}px, 36px) scale(0.15) rotate(${kick > 0 ? 70 : -70}deg)`, opacity: 0 },
          ],
          { duration: 320, easing: "ease-in", fill: "forwards" },
        );
        window.setTimeout(() => taken.remove(), 340);
      }
    }

    await this.wait(ms);
    fly.remove();
  }

  private async settle(pos: Pos, willCrown: boolean, quick: boolean): Promise<void> {
    const man = this.squareEl(pos)?.querySelector(".man") as HTMLElement | null;
    if (!man) return;
    man.classList.add(willCrown ? "just-crowned" : "just-landed");
    if (!willCrown) this.audio.land();
    const sq = this.squareEl(pos);
    if (sq) this.puffAt(sq);
    if (!willCrown) this.sparkAt(man, quick ? 3 : 5, ["#fff3d4", "#ffd45a"], 22);
    await this.wait(willCrown || quick ? 140 : 200);
  }

  private async animateCrown(pos: Pos): Promise<void> {
    if (!this.wantsFx()) return this.wait(80);
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
    if (this.mode === "daily" || this.boardIndex >= PATH_END - 1) {
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
      this.persistClimb();
    }, 720);
  }

  private finish(win: boolean): void {
    this.clearAi();
    this.thinking = false;
    this.animating = false;
    this.hideCoach();
    this.coachOn = false;
    if (this.mode === "run") {
      clearClimb();
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
    } else {
      this.end = {
        win,
        hops: this.hops,
        notches: this.moves,
        gained: this.moves,
        board: 1,
      };
    }
    if (win) {
      this.audio.win();
      if (this.mode === "run" && this.boardIndex >= PATH_END - 1) {
        this.audio.fanfare();
        this.petalBurst();
        this.cheer("The Crown falls!", 5);
      }
    } else this.audio.lose();
    this.show("end");
    if (this.mode === "daily" && win) void this.refreshScores();
  }

  private async refreshScores(): Promise<void> {
    const board = await fetchBoard(utcDayKey());
    this.scores = board.scores;
    if (this.screen === "end" || this.screen === "daily" || this.screen === "title") {
      if (this.screen === "end") this.renderEnd();
      if (this.screen === "daily") this.renderDaily();
      if (this.screen === "title") this.renderTitle();
    }
  }

  private async submitDaily(): Promise<void> {
    if (this.mode !== "daily" || !this.end?.win || this.posted) return;
    const input = document.getElementById("player-name");
    const typed = input instanceof HTMLInputElement ? input.value : "";
    const picked = tryName(typed) ?? (hasName() ? loadName() : null);
    if (!picked) {
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    commitName(picked);
    this.posted = true;
    const board = await postScore(utcDayKey(), picked, this.moves);
    this.scores = board.scores;
    this.renderEnd();
  }

  private scoreList(limit = 12): string {
    const head = `<li class="head"><b>#</b><span>Name</span><em>Moves</em></li>`;
    if (!this.scores.length) {
      return `${head}<li class="quiet">Nobody on the board yet. Win today's map and pin your moves.</li>`;
    }
    const mine = loadName().toLowerCase();
    const rows = this.scores
      .slice(0, limit)
      .map((s, i) => {
        const me = s.name.toLowerCase() === mine ? " me" : "";
        const podium = i < 3 ? ` rank-${i + 1}` : "";
        return `<li class="score${me}${podium}"><b>${i + 1}</b><span>${escapeHtml(s.name)}</span><em>${s.moves}</em></li>`;
      })
      .join("");
    return head + rows;
  }

  show(name: Screen): void {
    if (name !== "playing") this.cancelDrag();
    this.screen = name;
    document.querySelectorAll("[data-screen]").forEach((el) => {
      const on = el.getAttribute("data-screen") === name;
      el.classList.toggle("hidden", !on);
      if (on && el instanceof HTMLElement) {
        el.classList.remove("enter");
        void el.offsetWidth;
        el.classList.add("enter");
      }
    });
    document.getElementById("table")?.classList.toggle("hidden", name !== "playing");
    if (name === "title") this.renderTitle();
    if (name === "end") this.renderEnd();
    if (name === "pick") this.renderPick();
    if (name === "daily") this.renderDaily();
    if (name === "playing") this.renderAll();
    if (name === "pause") this.paintName();
    this.renderChrome();
    if (name !== "playing") this.audio.screen();
  }

  private renderChrome(): void {
    const titleMute = document.getElementById("title-mute");
    if (titleMute) titleMute.textContent = this.meta.mute ? "Muted" : "Sound";
    const hudMute = document.getElementById("btn-mute");
    if (hudMute) hudMute.textContent = this.meta.mute ? "Sound off" : "Sound on";
    const cb = document.getElementById("opt-cb");
    if (cb) cb.textContent = this.meta.colorblind ? "Colorblind on" : "Colorblind off";
    const motion = document.getElementById("opt-motion");
    if (motion) motion.textContent = this.meta.reduceMotion ? "Motion off" : "Motion on";
  }

  private renderTitle(): void {
    const rem = document.getElementById("notch-count");
    if (rem) rem.textContent = String(this.meta.notches);
    const dlabel = document.getElementById("daily-chip");
    if (dlabel) dlabel.textContent = dailyTitle();
    const mini = document.getElementById("title-leaders");
    if (mini) mini.innerHTML = this.scoreList(5);
    const main = document.getElementById("play-main");
    const fresh = document.getElementById("play-fresh");
    const saved = hasClimb();
    if (main) {
      main.textContent = saved ? "Continue" : "Play";
      main.setAttribute("data-cmd", saved ? "continue" : "new");
    }
    if (fresh) fresh.classList.toggle("hidden", !saved);
    this.paintName();
    void this.warmTitleScores();
  }

  private titleWarmed = false;
  private async warmTitleScores(): Promise<void> {
    if (this.titleWarmed && this.scores.length) return;
    this.titleWarmed = true;
    const board = await fetchBoard(utcDayKey());
    this.scores = board.scores;
    if (this.screen === "title") {
      const mini = document.getElementById("title-leaders");
      if (mini) mini.innerHTML = this.scoreList(5);
    }
  }

  private renderDaily(): void {
    const title = document.getElementById("daily-heading");
    if (title) title.textContent = this.dailyLabel || dailyTitle();
    const date = document.getElementById("daily-date");
    if (date) date.textContent = utcDayKey();
    const list = document.getElementById("daily-board");
    if (list) list.innerHTML = this.scoreList(40);
    const count = document.getElementById("daily-count");
    if (count) {
      const n = this.scores.length;
      count.textContent = n
        ? `${n} hopper${n === 1 ? "" : "s"} on the board. Lowest moves wins.`
        : "The board is empty. Win it and pin your move count.";
    }
    const mods = document.getElementById("daily-mods");
    if (mods) {
      const list = this.twists.length ? this.twists : dailyMods();
      mods.innerHTML = list
        .map(
          (m) =>
            `<li class="${m.side === "you" ? "help-you" : "help-them"}"><b>${m.name}</b> ${m.desc}</li>`,
        )
        .join("");
    }
    const lead = document.getElementById("daily-lead");
    if (lead) {
      const who = hasName() ? ` Pinning as ${loadName()}.` : " Pick a name on the title so the board knows you.";
      lead.textContent =
        `Same hard felt for everybody until midnight UTC. Beat it, pin your move count. Lowest moves sits on top. Today's twists help ivory and the house.${who}`;
    }
  }

  private renderPick(): void {
    const box = document.getElementById("pick-body");
    if (!box) return;
    const next = this.pathNames[this.boardIndex + 1] ?? "the next board";
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
    if (this.mode === "daily") {
      const rank = this.scores.findIndex((x) => x.moves === this.moves && x.name.toLowerCase() === loadName().toLowerCase());
      const rankBit = this.posted && rank >= 0 ? `You're #${rank + 1} with ${this.moves} moves.` : "";
      box.innerHTML = s.win
        ? `
      <p class="kicker">${this.dailyLabel} · ${utcDayKey()}</p>
      <h2>${this.moves} moves</h2>
      <p class="lead">The house is off the felt. Lowest moves sits on top. ${rankBit}</p>
      ${
        this.posted
          ? `<p class="quiet">Pinned as ${escapeHtml(loadName())}. Come back tomorrow for a new board.</p>`
          : `<form id="score-form" class="score-form">
              <label>Your name <input id="player-name" name="name" maxlength="16" value="${escapeHtml(hasName() ? loadName() : "")}" placeholder="Ivory" autocomplete="nickname" /></label>
              <button type="submit">Pin ${this.moves} moves${hasName() ? ` as ${escapeHtml(loadName())}` : ""}</button>
            </form>`
      }
      <ol class="leaderboard">${this.scoreList(12)}</ol>
    `
        : `
      <p class="kicker">${this.dailyLabel}</p>
      <h2>Not this time</h2>
      <p class="lead">The daily is supposed to sting. Same felt until midnight UTC — try a shorter line.</p>
      <ol class="leaderboard">${this.scoreList(8)}</ol>
    `;
      const extra = document.getElementById("end-actions");
      if (extra) {
        extra.innerHTML = s.win
          ? `<button data-cmd="daily" type="button">See the board</button>
             <button class="ghost" data-cmd="title" type="button">Home</button>`
          : `<button data-cmd="daily-play" type="button">Try again</button>
             <button class="ghost" data-cmd="title" type="button">Home</button>`;
      }
      return;
    }
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
        <li>Reached ${this.pathNames[s.board - 1] ?? BOARD_NAMES[s.board - 1] ?? ""} (${s.board} / ${PATH_END})</li>
        <li>${s.hops} captures</li>
        <li class="star-line">Stars +${s.gained} <span>(now ${s.notches})</span></li>
        <li>Next game: ${b.extra ? `+${b.extra} extra man` : "same crew"}${
          b.kingChance > 0.05 ? ` · ${Math.round(b.kingChance * 100)}% start crowned` : ""
        }</li>
      </ul>
    `;
    const extra = document.getElementById("end-actions");
    if (extra) {
      extra.innerHTML = `<button data-cmd="new" type="button">Play again</button>
        <button class="ghost" data-cmd="title" type="button">Home</button>`;
    }
  }

  renderAll(): void {
    this.renderBoard();
    this.renderHud();
  }

  private renderHud(): void {
    const you = piecesOf(this.board, "you").length;
    const them = piecesOf(this.board, "them").length;
    const name = this.mode === "daily" ? this.dailyLabel : (this.pathNames[this.boardIndex] ?? "");
    const goal = document.getElementById("goal");
    if (goal) goal.textContent = name;
    const path = document.getElementById("path");
    if (path) {
      path.classList.toggle("hidden", this.mode === "daily");
      path.innerHTML = this.pathNames.map(
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
          ? "Charcoal… Oops still works."
          : "Charcoal is hopping…"
        : this.lock
          ? "Keep jumping!"
          : jumps.length
            ? this.selected
              ? "Jump the star."
              : "Jump ready — gold ring, then the star."
            : this.selected
              ? "Slide onto a pip."
              : this.turn === "you"
                ? "Slide a gold ring, or tap then tap."
                : "Wait.";
    }
    const counts = document.getElementById("counts");
    if (counts) {
      const who = hasName() ? `${loadName()} · ` : "";
      counts.textContent =
        this.mode === "daily"
          ? `${who}Moves ${this.moves} · you ${you} · them ${them}`
          : `${who}You ${you} · them ${them} · hops ${this.hops}`;
    }
    const tip = document.getElementById("blurb");
    if (tip) tip.textContent = this.blurb;
    const oops = document.getElementById("btn-oops");
    if (oops instanceof HTMLButtonElement) {
      oops.classList.remove("hidden");
      oops.disabled = !this.canOops();
      oops.textContent = this.oopsLeft > 0 ? `Oops ×${this.oopsLeft}` : "Oops used";
    }
    const laws = document.getElementById("laws");
    if (laws) {
      if (this.mode === "daily") {
        const list = this.twists.length ? this.twists : dailyMods();
        laws.innerHTML = list
          .map((d) => `<li class="${d.side === "you" ? "help-you" : "help-them"}"><b>${d.name}</b> ${d.desc}</li>`)
          .join("");
      } else {
        const owned = LAW_DEFS.filter((d) => this.laws[d.id]);
        laws.innerHTML = owned.length
          ? owned.map((d) => `<li><b>${d.icon} ${d.name}</b> ${d.desc}</li>`).join("")
          : `<li class="quiet">Win a board to pick a power.</li>`;
      }
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
        html += `<div role="gridcell" class="sq ${dark ? "dark" : "light"} ${hole ? "hole" : ""} ${sel ? "sel" : ""} ${hint ? "hint" : ""} ${can ? "can" : ""}" data-r="${r}" data-c="${c}" ${dark && !hole ? 'tabindex="0"' : 'tabindex="-1"'}>`;
        if (p) {
          html += `<span class="man ${p.side} ${p.king ? "king" : ""}" aria-label="${p.side === "you" ? "ivory" : "charcoal"} ${p.king ? "king" : "man"}"><span class="face" aria-hidden="true"></span></span>`;
        } else if (hint) {
          html += `<span class="land ${jumps.has(`${r},${c}`) ? "jump" : ""}" aria-hidden="true"></span>`;
        }
        html += `</div>`;
      }
    }
    el.innerHTML = html;
    el.classList.toggle("coaching", this.coachOn);
    const keep = this.keyFocus ?? this.selected;
    if (keep) this.squareEl(keep)?.focus();
  }
}
