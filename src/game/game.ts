import { emptyMemory, remember, think, type AiMemory } from "./ai.ts";
import { AudioSys } from "./audio.ts";
import { comboName, comboTier } from "./combo.ts";
import { JUMP_HOW, CHASE_START, CHASE_END_MORE, CHASE_END_TIE, chaseHint } from "./copy.ts";
import { dailySpec, dailyTitle, utcDayKey } from "./daily.ts";
import { applyDailyMods, asFelt, dailyMods, type DailyMod } from "./dailyMods.ts";
import * as feel from "./feel.ts";
import { sceneMarkup } from "./getScenes.ts";
import { LAW_DEFS, unusedLaws, type LawDef } from "./laws.ts";
import { commitName, escapeHtml, fetchBoard, hasName, loadName, postScore, reportName, tryName, type Score } from "./leaderboard.ts";
import { loadMeta, notchBonus, notchesFromRun, saveMeta } from "./meta.ts";
import { dailySeed, hashSeed, Rng, freshSeed } from "./rng.ts";
import {
  applyMove,
  applyStartLaws,
  at,
  chaseArmed,
  chaseWinner,
  cloneBoard,
  cloneMods,
  crownRandom,
  isHole,
  legalMoves,
  modsFromSpec,
  hopOver,
  moreJumps,
  moveHitting,
  outcome,
  piecesOf,
  recruitMan,
  reviveKing,
  setupBoard,
  spreadCrown,
  trapdoorHole,
  type Board,
} from "./rules.ts";
import { clearClimb, hasClimb, loadClimb, packBoard, saveClimb, unpackBoard } from "./save.ts";
import { boardSpec, climbNames, CLIMB_SKILL, feltTheme, holesEqual, unstickHoles, withHoleMods } from "./setup.ts";
import { applyBurst, burstFromMods, endYouTurn, noteCapture } from "./tempo.ts";
import type { BoardMods, FeltMod, Laws, Meta, Move, Pos, Screen } from "./types.ts";
import { BOARD_NAMES, CHASE_HOPS, PATH_END, boardSize, emptyLaws, emptyMods, inBoard, isDark, samePos } from "./types.ts";
import {
  createAccount,
  deleteAccount,
  fetchInsight,
  loadSession,
  pushAccount,
  recordHop,
  refreshAccount,
  signIn,
  signOut,
} from "./account.ts";
import { describeHop, loadHistory, whenHop } from "./history.ts";
import { bootNative } from "../native.ts";

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
  feltMods: FeltMod[] = [];
  hops = 0;
  moves = 0;
  combo = 0;
  boardIndex = 0;
  mode: "run" | "daily" = "run";
  dailyLabel = "";
  twists: DailyMod[] = [];
  scores: Score[] = [];
  posted = false;
  boardLive = true;
  turn: "you" | "them" = "you";
  selected: Pos | null = null;
  lock: Pos | null = null;
  thinking = false;
  animating = false;
  getting = false;
  aiTimer: number | null = null;
  wipeTimer: number | null = null;
  actionGen = 0;
  aiMem: AiMemory = emptyMemory();
  lastRitesUsed = false;
  oopsLeft = 1;
  snapshot: Board | null = null;
  snapshotMods: BoardMods | null = null;
  snapshotHops = 0;
  snapshotMoves = 0;
  snapshotLastRites = false;
  snapshotQuiet = 0;
  skippedJump = false;
  quiet = 0;
  turnHadCapture = false;
  chaseTold = false;
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
  cloudTimer: number | null = null;
  accountBusy = false;

  constructor() {
    this.bind();
    this.applyPrefs();
    this.show("title");
    void bootNative(() => this.nativeBack());
    void this.bootAccount();
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
          if (cmd === "report") {
            void this.hideHopper(cmdBtn.getAttribute("data-name") || "");
            return;
          }
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
      if (e.target.id === "account-form") {
        e.preventDefault();
        const submitter = (e as SubmitEvent).submitter;
        const intent = submitter instanceof HTMLButtonElement ? submitter.value : "login";
        void this.submitAccount(intent);
      }
      if (e.target.id === "account-delete") {
        e.preventDefault();
        void this.submitDeleteAccount();
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
    if (this.getting) return;
    this.unlock();
    if (cmd !== "oops" && cmd !== "skip-jump") this.audio.ui();
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
    if (cmd === "privacy") {
      if (this.screen !== "privacy") this.returnTo = this.screen;
      this.show("privacy");
      return;
    }
    if (cmd === "support") {
      if (this.screen !== "support") this.returnTo = this.screen;
      this.show("support");
      return;
    }
    if (cmd === "account") {
      if (this.screen !== "account") this.returnTo = this.screen === "history" || this.screen === "studio" ? "title" : this.screen;
      this.show("account");
      return;
    }
    if (cmd === "history") {
      this.show("history");
      return;
    }
    if (cmd === "studio") {
      this.show("studio");
      return;
    }
    if (cmd === "sign-out") {
      signOut();
      this.paintAccount();
      this.show("account");
      this.cheer("Hops stay on this phone.");
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
    if (cmd === "skip-jump") {
      this.skipJump();
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
        this.getting = true;
        this.animating = true;
        const def = LAW_DEFS.find((d) => d.id === id);
        void this.playGet(def?.scene ?? "", def?.name ?? id).then(() => {
          this.laws[id] = true;
          this.boardIndex += 1;
          this.loadBoard();
          this.show("playing");
          this.persistClimb();
          this.getting = false;
          this.animating = false;
        });
      }
    }
  }

  private async playGet(scene: string, name: string): Promise<void> {
    const host = document.getElementById("get-overlay");
    if (!host) return;
    const stamp = scene === "back2Back" ? "BACK 2 BACK" : name.toUpperCase();
    if (this.meta.reduceMotion) {
      host.innerHTML = `<p class="get-stamp">${`YOU GOT ${stamp}!`}</p>`;
      host.classList.remove("hidden");
      host.setAttribute("aria-hidden", "false");
      this.audio.fanfare();
      await new Promise((r) => setTimeout(r, 700));
      host.classList.add("hidden");
      host.setAttribute("aria-hidden", "true");
      host.innerHTML = "";
      return;
    }
    host.innerHTML = sceneMarkup(scene, name);
    host.classList.remove("hidden");
    host.setAttribute("aria-hidden", "false");
    this.audio.fanfare();
    await new Promise((r) => setTimeout(r, 2000));
    host.classList.add("hidden");
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = "";
  }

  private nativeBack(): boolean {
    if (this.drag) {
      this.cancelDrag();
      return true;
    }
    if (this.screen === "playing") {
      this.command("pause");
      return true;
    }
    if (this.screen === "pause") {
      this.command("resume");
      return true;
    }
    if (this.screen === "pick") return true;
    if (this.screen === "how" || this.screen === "privacy" || this.screen === "support" || this.screen === "account" || this.screen === "history" || this.screen === "studio") {
      this.command("back");
      return true;
    }
    if (this.screen === "daily" || this.screen === "end") {
      this.show("title");
      return true;
    }
    return false;
  }

  private async hideHopper(raw: string): Promise<void> {
    const name = raw.trim();
    if (!name) return;
    this.unlock();
    this.audio.ui();
    await reportName(name);
    this.scores = this.scores.filter((s) => s.name.toLowerCase() !== name.toLowerCase());
    if (this.screen === "title") this.renderTitle();
    if (this.screen === "daily") this.renderDaily();
    if (this.screen === "end") this.renderEnd();
    this.cheer("Hidden. Thanks.");
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
    const status = document.getElementById("name-status");
    if (!result.saved) {
      if (status) {
        status.hidden = false;
        status.textContent = result.problem;
      }
      return;
    }
    if (status) {
      status.hidden = false;
        status.textContent = loadSession()
          ? `Hi, ${result.name}. Your hops can follow this account.`
          : `Hi, ${result.name}. Save hops with an account if you switch phones.`;
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
      status.textContent = "";
      status.hidden = true;
    }
    const hud = document.getElementById("hopper-tag");
    if (hud) hud.textContent = hasName() ? loadName() : "";
  }

  private queueCloud(): void {
    if (!loadSession()) return;
    if (this.cloudTimer) window.clearTimeout(this.cloudTimer);
    this.cloudTimer = window.setTimeout(() => {
      this.cloudTimer = null;
      void pushAccount();
    }, 900);
  }

  private async bootAccount(): Promise<void> {
    await refreshAccount();
    this.meta = loadMeta();
    this.applyPrefs();
    if (this.screen === "title") this.renderTitle();
    else this.paintAccount();
  }

  private paintAccount(): void {
    const session = loadSession();
    const chip = document.getElementById("account-chip");
    if (chip) {
      chip.textContent = session
        ? `Saving hops for ${session.email}.`
        : "Hops stay on this phone until you save them.";
    }
    const nav = document.querySelector('[data-cmd="account"]');
    if (nav) nav.textContent = session ? "Account" : "Save hops";
  }

  private accountNote(text: string, danger = false): void {
    const note = document.getElementById("account-note");
    if (!note) return;
    note.textContent = text;
    note.classList.toggle("danger", danger);
  }

  private renderAccount(): void {
    const root = document.getElementById("account-body");
    if (!root) return;
    const session = loadSession();
    if (!session) {
      root.innerHTML = `
        <p class="kicker">Hop book</p>
        <h2>Keep your hops</h2>
        <p class="lead">Ask a grown-up. An email and a password save Stars, a paused climb, and your hop history if this phone is cleared. You can still play without one.</p>
        <form id="account-form" class="account-form">
          <label for="account-email">Email</label>
          <input id="account-email" name="email" type="email" autocomplete="username" inputmode="email" required maxlength="80" />
          <label for="account-password">Password</label>
          <input id="account-password" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="64" />
          <div class="account-actions">
            <button name="intent" value="signup" type="submit">Create account</button>
            <button class="ghost" name="intent" value="login" type="submit">Log in</button>
          </div>
        </form>
        <p class="quiet" id="account-note">We store a password hash, not the password. No ads. Nothing to buy.</p>
        <div class="col">
          <button class="ghost" data-cmd="history" type="button">Hop history</button>
          <button class="ghost" data-cmd="back" type="button">Back</button>
        </div>`;
      return;
    }
    root.innerHTML = `
      <p class="kicker">Hop book</p>
      <h2>Signed in</h2>
      <p class="lead">Hops for <strong>${escapeHtml(session.email)}</strong> can follow you to another phone. This device still keeps a copy so you can play offline.</p>
      <div class="col">
        <button data-cmd="history" type="button">Hop history</button>
        ${session.studio ? `<button class="ghost" data-cmd="studio" type="button">Hop data</button>` : ""}
        <button class="ghost" data-cmd="sign-out" type="button">Sign out</button>
      </div>
      <form id="account-delete" class="account-form">
        <label for="account-delete-pass">Delete this account</label>
        <input id="account-delete-pass" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="64" placeholder="Password" />
        <button class="ghost" type="submit">Delete hops in the book</button>
      </form>
      <p class="quiet" id="account-note">Deleting the book does not erase Stars already on this phone.</p>
      <button class="ghost" data-cmd="back" type="button">Back</button>`;
  }

  private renderHistory(): void {
    const root = document.getElementById("history-body");
    if (!root) return;
    const hops = loadHistory();
    const session = loadSession();
    const rows = hops.length
      ? hops
          .slice(0, 40)
          .map(
            (e) =>
              `<li><b>${describeHop(e)}</b><span>${whenHop(e)}</span></li>`,
          )
          .join("")
      : `<li class="quiet">Win a board and it lands here. Sign in so a new phone can see it too.</li>`;
    root.innerHTML = `
      <p class="kicker">${session ? session.email : "This phone"}</p>
      <h2>Hop history</h2>
      <p class="lead">${session ? "Clears, Crowns, and daily tries follow this account." : "These hops live on this phone until you save them."}</p>
      <ol class="hop-log">${rows}</ol>
      <div class="row">
        <button data-cmd="account" type="button">${session ? "Account" : "Save hops"}</button>
        <button class="ghost" data-cmd="title" type="button">Home</button>
      </div>`;
  }

  private async renderStudio(): Promise<void> {
    const root = document.getElementById("studio-body");
    if (!root) return;
    root.innerHTML = `<p class="kicker">Studio</p><h2>Hop data</h2><p class="lead">Counting the table.</p>`;
    try {
      const stats = await fetchInsight();
      if (!stats) {
        root.innerHTML = `<p class="kicker">Studio</p><h2>Hop data</h2><p class="lead">This book is for the table.</p><button data-cmd="account" type="button">Back</button>`;
        return;
      }
      root.innerHTML = `
        <p class="kicker">Studio</p>
        <h2>Hop data</h2>
        <p class="lead">No emails here. Just how the table is hopping.</p>
        <div class="stat-grid">
          <p><strong>${stats.accounts}</strong> accounts</p>
          <p><strong>${stats.logins}</strong> sign-ins</p>
          <p><strong>${stats.boardClears}</strong> boards cleared</p>
          <p><strong>${stats.climbWins}</strong> Crowns</p>
          <p><strong>${stats.climbLosses}</strong> climb falls</p>
          <p><strong>${stats.dailyWins}</strong> dailies</p>
        </div>
        <button data-cmd="account" type="button">Back</button>`;
    } catch (err) {
      root.innerHTML = `<p class="kicker">Studio</p><h2>Hop data</h2><p class="lead">${err instanceof Error ? err.message : "Hop book hiccup."}</p><button data-cmd="account" type="button">Back</button>`;
    }
  }

  private async submitAccount(intent: string): Promise<void> {
    if (this.accountBusy) return;
    const emailEl = document.getElementById("account-email");
    const passEl = document.getElementById("account-password");
    const email = emailEl instanceof HTMLInputElement ? emailEl.value : "";
    const password = passEl instanceof HTMLInputElement ? passEl.value : "";
    this.accountBusy = true;
    this.accountNote("Opening the hop book…");
    try {
      if (intent === "signup") await createAccount(email, password);
      else await signIn(email, password);
      this.meta = loadMeta();
      this.applyPrefs();
      this.paintAccount();
      this.renderAccount();
      this.cheer("Hops can follow you.");
    } catch (err) {
      this.accountNote(err instanceof Error ? err.message : "Could not open the hop book.", true);
    } finally {
      this.accountBusy = false;
    }
  }

  private async submitDeleteAccount(): Promise<void> {
    if (this.accountBusy) return;
    const passEl = document.getElementById("account-delete-pass");
    const password = passEl instanceof HTMLInputElement ? passEl.value : "";
    this.accountBusy = true;
    this.accountNote("Closing the book…");
    try {
      await deleteAccount(password);
      this.paintAccount();
      this.renderAccount();
      this.cheer("Account gone. Stars on this phone stay.");
    } catch (err) {
      this.accountNote(err instanceof Error ? err.message : "Could not delete.", true);
    } finally {
      this.accountBusy = false;
    }
  }

  newRun(): void {
    this.unlock();
    this.mode = "run";
    clearClimb();
    const seed = freshSeed();
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
    this.pushLog(JUMP_HOW);
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
    this.feltMods = saved.feltMods ?? [];
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
    this.snapshotMods = saved.snapshotMods ? cloneMods({ ...emptyMods(), ...saved.snapshotMods }) : null;
    this.snapshotHops = saved.snapshotHops;
    this.snapshotMoves = saved.snapshotMoves;
    this.snapshotLastRites = saved.snapshotLastRites ?? saved.lastRitesUsed;
    this.snapshotQuiet = saved.snapshotQuiet ?? 0;
    this.quiet = typeof saved.quiet === "number" ? saved.quiet : 0;
    this.chaseTold = chaseArmed(this.board);
    this.skippedJump = !!saved.skippedJump && saved.laws.freeJump;
    this.idSeq = Math.max(saved.idSeq, this.maxPieceId() + 1);
    this.log = saved.log;
    this.offers = LAW_DEFS.filter((d) => saved.offers.includes(d.id));
    this.thinking = saved.turn === "them";
    this.animating = false;
    this.getting = false;
    this.aiMem = emptyMemory();
    this.clearAi();
    this.coachOn = false;
    this.hideCoach();
    if (!this.snapshot) this.freeSealedPieces();
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
      feltMods: this.feltMods,
      hops: this.hops,
      moves: this.moves,
      combo: this.combo,
      boardIndex: this.boardIndex,
      turn: this.turn,
      lock: this.lock,
      lastRitesUsed: this.lastRitesUsed,
      oopsLeft: this.oopsLeft,
      snapshot: this.snapshot ? packBoard(this.snapshot) : null,
      snapshotMods: this.snapshotMods ? cloneMods(this.snapshotMods) : null,
      snapshotHops: this.snapshotHops,
      snapshotMoves: this.snapshotMoves,
      snapshotLastRites: this.snapshotLastRites,
      snapshotQuiet: this.snapshotQuiet,
      quiet: this.quiet,
      skippedJump: this.skippedJump,
      idSeq: this.idSeq,
      log: this.log,
      offers: this.offers.map((o) => o.id),
      screen: this.screen === "pick" ? "pick" : "playing",
    });
    this.queueCloud();
  }

  private async openDaily(): Promise<void> {
    this.unlock();
    this.dailyLabel = dailyTitle();
    this.twists = dailyMods();
    const spec = dailySpec();
    this.feltMods = this.uniqueFelt([...(spec.feltMods ?? []), ...this.twists.map(asFelt)]);
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
    this.mods = modsFromSpec(spec, { themFly: applied.themFly, themBack: applied.themBack });
    if (this.laws.back2Back) this.mods.openingHops = 2;
    this.mods.napUsed = false;
    this.mods.napPending = false;
    this.mods.lilyHops = 0;
    this.blurb = spec.blurb;
    this.board = applyStartLaws(setupBoard(spec, this.pid), this.laws, this.mods);
    this.turn = "you";
    this.selected = null;
    this.lock = null;
    this.thinking = false;
    this.animating = false;
    this.oopsLeft = applied.oops;
    this.snapshot = null;
    this.snapshotMods = null;
    this.skippedJump = false;
    this.quiet = 0;
    this.chaseTold = false;
    this.aiMem = emptyMemory();
    this.coachOn = false;
    this.hideCoach();
    this.clearAi();
    this.feltMods = this.uniqueFelt([...(spec.feltMods ?? []), ...this.twists.map(asFelt)]);
    this.freeSealedPieces(this.rng);
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

  private clearWipe(): void {
    if (this.wipeTimer != null) {
      window.clearTimeout(this.wipeTimer);
      this.wipeTimer = null;
    }
  }

  private resumeAiIfNeeded(): void {
    if (this.screen === "playing" && this.thinking && this.turn === "them" && !this.animating) {
      this.scheduleAi(220);
    }
  }

  private uniqueFelt(list: FeltMod[]): FeltMod[] {
    const seen = new Set<string>();
    const out: FeltMod[] = [];
    for (const m of list) {
      const key = m.title.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m);
    }
    return out;
  }

  /** Scoot pits that wall in you or the Enemy so every piece that could walk still can. */
  private freeSealedPieces(rng: Rng = this.rng): void {
    if (!this.mods.holes.length) return;
    const next = unstickHoles(this.board, this.laws, this.mods, rng);
    if (holesEqual(next.holes, this.mods.holes)) return;
    this.mods = next;
    this.feltMods = withHoleMods(this.feltMods, this.mods.holes.length);
    this.persistClimb();
  }

  private modifierCard(title: string, desc: string, side?: "you" | "them"): string {
    const cls = side === "you" ? "help-you" : side === "them" ? "help-them" : "";
    return `<li class="mod-card ${cls}"><p class="mod-head">Modifier: ${escapeHtml(title.toUpperCase())}</p><p class="mod-desc">${escapeHtml(desc)}</p></li>`;
  }

  private extraMen(): number {
    const n = notchBonus(this.meta.notches);
    return (this.laws.extraMan ? 1 : 0) + n.extra;
  }

  private loadBoard(): void {
    const openKing = this.laws.openKing || this.rng.chance(notchBonus(this.meta.notches).kingChance);
    const boardRng = new Rng(hashSeed(this.runSeed + (this.boardIndex + 1) * 104729));
    const size = this.laws.widePond ? 10 : 8;
    const spec = boardSpec(this.boardIndex, this.extraMen(), openKing, boardRng, size);
    this.mods = modsFromSpec(spec, { size });
    if (this.laws.back2Back) this.mods.openingHops = 2;
    this.mods.napUsed = false;
    this.mods.napPending = false;
    this.mods.lilyHops = 0;
    this.blurb = spec.blurb;
    this.feltMods = spec.feltMods ?? [];
    this.board = applyStartLaws(setupBoard(spec, this.pid), this.laws, this.mods);
    this.freeSealedPieces(boardRng);
    this.turn = "you";
    this.selected = null;
    this.lock = null;
    this.thinking = false;
    this.animating = false;
    this.oopsLeft = this.mode === "daily" ? 2 : 1;
    this.snapshot = null;
    this.snapshotMods = null;
    this.skippedJump = false;
    this.combo = 0;
    this.quiet = 0;
    this.chaseTold = false;
    this.aiMem = emptyMemory();
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
    const debugRace = new URLSearchParams(location.search).get("felt") === "race";
    if (debugRace || this.meta.sawTutorial || this.mode !== "run" || this.boardIndex !== 0) {
      this.coachOn = false;
      this.hideCoach();
      return;
    }
    this.coachOn = true;
    const el = document.getElementById("coach");
    if (el) el.classList.remove("hidden");
    document.getElementById("board")?.classList.add("coaching");
    const coachText = document.getElementById("coach-text");
    if (coachText) coachText.textContent = JUMP_HOW;
    const status = document.getElementById("status");
    if (status) status.textContent = JUMP_HOW;
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
    if (e.key === "o" || e.key === "O") {
      if (this.canOops()) {
        e.preventDefault();
        this.oops();
      }
      return;
    }
    if (e.key === "s" || e.key === "S") {
      if (this.canSkipJump()) {
        e.preventDefault();
        this.skipJump();
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

  private youLegal(): Move[] {
    return legalMoves(this.board, "you", this.laws, this.lock, this.mods);
  }

  private canSkipJump(): boolean {
    if (this.screen !== "playing" || this.animating || this.thinking) return false;
    if (this.turn !== "you") return false;
    if (!this.lock) return false;
    return moreJumps(this.board, this.lock, this.laws, this.mods);
  }

  private skipJump(): void {
    if (!this.canSkipJump()) return;
    this.cancelDrag();
    if (this.lock) {
      const tookLily = !!this.mods.lily && samePos(this.lock, this.mods.lily);
      this.lock = null;
      this.selected = null;
      this.skippedJump = false;
      this.pushLog("Stopped the combo. Your hop is done.");
      this.cheer("Skip!");
      const ended = endYouTurn(burstFromMods(this.mods), { tookLily });
      applyBurst(this.mods, ended.burst);
      if (ended.next === "you") {
        this.turn = "you";
        this.renderAll();
        this.persistClimb();
        return;
      }
      this.afterYou();
      this.persistClimb();
      return;
    }
    this.skippedJump = true;
    this.selected = null;
    this.pushLog("Jump skipped. Slide a gold ring.");
    this.cheer("Skip!");
    this.renderAll();
    this.persistClimb();
  }

  private canOops(): boolean {
    if (this.screen !== "playing" || !this.snapshot || this.oopsLeft <= 0) return false;
    return true;
  }

  private stale(gen: number): boolean {
    return gen !== this.actionGen;
  }

  private oops(): void {
    if (!this.canOops()) return;
    const snap = this.snapshot;
    if (!snap) return;
    this.actionGen += 1;
    this.clearAi();
    this.clearWipe();
    this.cancelDrag();
    document.querySelectorAll(".flyer").forEach((el) => el.remove());
    this.audio.oops();
    feel.tap();
    this.oopsLeft -= 1;
    this.board = cloneBoard(snap);
    if (this.snapshotMods) this.mods = cloneMods(this.snapshotMods);
    this.hops = this.snapshotHops;
    this.moves = this.snapshotMoves;
    this.lastRitesUsed = this.snapshotLastRites;
    this.quiet = this.snapshotQuiet;
    this.lock = null;
    this.selected = null;
    this.combo = 0;
    this.snapshot = null;
    this.snapshotMods = null;
    this.skippedJump = false;
    this.turn = "you";
    this.thinking = false;
    this.animating = false;
    this.aiMem = emptyMemory();
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
    const legal = this.youLegal();
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
    const legal = this.youLegal();
    const shown = legal.filter((m) => m.from.r === from.r && m.from.c === from.c);
    const hints = new Set(shown.map((m) => `${m.to.r},${m.to.c}`));
    const jumps = new Set(
      shown.filter((m) => m.capture || m.overHole).map((m) => `${m.to.r},${m.to.c}`),
    );
    const preys = new Set(
      shown
        .filter((m) => m.capture || m.overHole)
        .map((m) => `${(m.capture ?? m.overHole)!.r},${(m.capture ?? m.overHole)!.c}`),
    );
    document.querySelectorAll("#board .sq").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const r = Number(node.getAttribute("data-r"));
      const c = Number(node.getAttribute("data-c"));
      const key = `${r},${c}`;
      node.classList.toggle("sel", r === from.r && c === from.c);
      node.classList.toggle("hint", hints.has(key));
      node.classList.toggle("prey", preys.has(key));
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
    const legal = this.youLegal();
    const move = moveHitting(legal, d.from, at);
    if (!move) return;
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
      const legal = this.youLegal();
      const move = moveHitting(legal, from, drop);
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
    const legal = this.youLegal();
    const lands = legal.filter((m) => {
      if (this.selected && !samePos(m.from, this.selected)) return false;
      return samePos(m.to, pos);
    });
    const overs = legal.filter((m) => {
      if (this.selected && !samePos(m.from, this.selected)) return false;
      const mid = hopOver(m);
      return mid ? samePos(mid, pos) : false;
    });
    const matches = lands.length ? lands : overs;
    if (this.selected && matches[0] && samePos(matches[0].from, this.selected)) {
      void this.play(matches[0]);
      return;
    }
    if (!this.selected && matches.length === 1) {
      void this.play(matches[0]!);
      return;
    }
    if (this.lock) return;
    const canSelect = legal.some((m) => m.from.r === r && m.from.c === c);
    if (piece && piece.side === "you" && canSelect) {
      this.selected = pos;
      this.audio.select();
      this.renderBoard();
      this.renderHud();
    }
  }

  private async play(move: Move, fromDrag = false): Promise<void> {
    const gen = this.actionGen;
    if (!this.lock) {
      this.snapshot = cloneBoard(this.board);
      this.snapshotMods = cloneMods(this.mods);
      this.snapshotHops = this.hops;
      this.snapshotMoves = this.moves;
      this.snapshotLastRites = this.lastRitesUsed;
      this.snapshotQuiet = this.quiet;
      this.turnHadCapture = false;
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
            if (this.stale(gen)) return;
          }
        }
      } else {
        await this.animateHop(move, "you");
        if (this.stale(gen)) return;
      }
      this.board = applyMove(this.board, move, this.mods);
      if (move.far) this.mods.farJumpUsed = true;
      if (move.capture) {
        this.turnHadCapture = true;
        const burst = noteCapture(burstFromMods(this.mods), this.laws.napTime);
        applyBurst(this.mods, burst);
      }
      const nowKing = at(this.board, move.to)?.king ?? false;
      let partyPos: Pos | null = null;
      let extraPos: Pos | null = null;
      let partyExtra: Pos | null = null;
      if (move.capture) {
        this.hops += 1;
        this.combo += 1;
        this.audio.capture(this.combo);
        feel.bump();
        const yell = comboName(this.combo);
        this.cheer(move.far ? "Far jump!" : yell, this.combo);
        this.pushLog(move.far ? "Far jump!" : this.combo >= 2 ? `${yell} x${this.combo}` : "Got one!");
        if (this.coachOn) this.finishCoach();
        if (this.laws.recruit) this.board = recruitMan(this.board, "you", this.pid, this.mods);
        const pit = trapdoorHole(move);
        if (this.laws.trapdoor && !this.mods.trapdoorUsed && pit) {
          this.mods.holes = [...this.mods.holes, { r: pit.r, c: pit.c }];
          this.mods.trapdoorUsed = true;
          this.pushLog("Trapdoor! That square is a hole now.");
        }
        if (this.laws.hopCrown && this.hops % 4 === 0) {
          const c = crownRandom(this.board, "you", (n) => this.rng.int(n));
          this.board = c.board;
          if (c.did) partyPos = c.pos;
        }
      } else {
        this.combo = 0;
        if (fromDrag) this.audio.hop();
      }
      if (this.laws.doubleCrown && !wasKing && nowKing) {
        const extra = spreadCrown(this.board, move.to, "you");
        this.board = extra.board;
        extraPos = extra.pos;
      }
      if (this.laws.doubleCrown && partyPos) {
        const extra = spreadCrown(this.board, partyPos, "you");
        this.board = extra.board;
        partyExtra = extra.pos;
      }

      keepJumping = !!(move.capture && moreJumps(this.board, move.to, this.laws, this.mods));
      this.lock = keepJumping ? move.to : null;
      this.selected = keepJumping ? move.to : null;
      this.renderAll();
      await this.settle(move.to, !wasKing && nowKing, keepJumping);
      if (this.stale(gen)) return;
      if (!wasKing && nowKing) {
        this.audio.crown();
        feel.heavy();
        this.audio.fanfare();
        this.cheer("King!");
        this.pushLog("King! It hops every way.");
        await this.animateCrown(move.to);
        if (this.stale(gen)) return;
      }
      if (extraPos) {
        this.audio.crown();
        feel.heavy();
        this.cheer("Double Crown!");
        this.pushLog("Double Crown! A neighbor is a King too.");
        await this.animateCrown(extraPos);
        if (this.stale(gen)) return;
      }
      if (partyPos && !(nowKing && samePos(partyPos, move.to))) {
        this.audio.crown();
        feel.heavy();
        this.cheer("Party King!");
        this.pushLog("Hop Party made a King.");
        await this.animateCrown(partyPos);
        if (this.stale(gen)) return;
      }
      if (partyExtra && (!extraPos || !samePos(partyExtra, extraPos))) {
        this.audio.crown();
        feel.heavy();
        this.cheer("Double Crown!");
        this.pushLog("Double Crown! A neighbor is a King too.");
        await this.animateCrown(partyExtra);
        if (this.stale(gen)) return;
      }
    } finally {
      if (!this.stale(gen)) this.animating = false;
    }
    if (this.stale(gen)) return;
    if (keepJumping) {
      const still = this.youLegal().some((m) => m.capture);
      if (still) {
        this.renderAll();
        return;
      }
    }
    this.lock = null;
    this.selected = null;
    const tookLily = !!this.mods.lily && samePos(move.to, this.mods.lily);
    const ended = endYouTurn(burstFromMods(this.mods), { tookLily });
    applyBurst(this.mods, ended.burst);
    if (ended.next === "you") {
      this.turn = "you";
      this.renderAll();
      this.persistClimb();
      return;
    }
    this.afterYou();
    this.persistClimb();
  }

  private afterYou(): void {
    this.skippedJump = false;
    this.mods.farJumpUsed = false;
    this.moves += 1;
    if (this.tickChase(this.turnHadCapture)) return;
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
    this.scheduleAi(280);
    this.renderAll();
  }

  /** Returns true if the chase clock just ended the board. */
  private tickChase(hadCapture: boolean): boolean {
    if (hadCapture) this.quiet = 0;
    else if (chaseArmed(this.board)) this.quiet += 1;
    else this.quiet = 0;
    this.warnChase();
    if (chaseArmed(this.board) && this.quiet >= CHASE_HOPS) {
      this.endChase();
      return true;
    }
    return false;
  }

  private warnChase(): void {
    if (!chaseArmed(this.board) || this.chaseTold) return;
    this.chaseTold = true;
    this.cheer("Only Kings!");
    this.pushLog(CHASE_START);
  }

  private endChase(): void {
    const who = chaseWinner(this.board);
    this.thinking = false;
    this.animating = false;
    this.lock = null;
    this.selected = null;
    if (who === "you") {
      this.pushLog(CHASE_END_MORE);
      this.cheer("Most pieces!");
      this.boardCleared();
      return;
    }
    this.pushLog(who === "draw" ? CHASE_END_TIE : CHASE_END_MORE);
    this.cheer(who === "draw" ? "It's a tie!" : "They had more!");
    this.loseOrHoldOops();
  }

  private async aiStep(): Promise<void> {
    if (this.screen !== "playing") return;
    const gen = this.actionGen;
    const skill = this.mode === "daily" ? 0.86 : (CLIMB_SKILL[this.boardIndex] ?? 0.95);
    const move = think(this.board, this.laws, this.rng, skill, this.mods, this.aiMem);
    if (!move) {
      this.boardCleared();
      return;
    }
    this.animating = true;
    try {
      const wasKing = at(this.board, move.from)?.king ?? false;
      await this.animateHop(move, "them");
      if (this.stale(gen)) return;
      this.board = applyMove(this.board, move, this.mods);
      const nowKing = at(this.board, move.to)?.king ?? false;
      if (move.capture) {
        this.audio.capture(1);
        feel.bump();
        this.quiet = 0;
      }
      const keepJumping = !!(move.capture && moreJumps(this.board, move.to, this.laws, this.mods));
      this.renderAll();
      await this.settle(move.to, !wasKing && nowKing, keepJumping);
      if (this.stale(gen)) return;
      if (!wasKing && nowKing) {
        this.audio.crown();
        feel.heavy();
        this.cheer("Enemy King!");
        await this.animateCrown(move.to);
        if (this.stale(gen)) return;
      }
      this.animating = false;

      if (keepJumping) {
        this.renderAll();
        this.scheduleAi(220);
        return;
      }
    } catch {
      this.animating = false;
    }

    if (this.stale(gen)) return;
    const over = outcome(this.board, "you", this.laws, this.mods);
    if (over === "them") {
      this.tryRites();
      return;
    }
    if (over === "you") {
      this.snapshot = null;
      this.snapshotMods = null;
      this.boardCleared();
      return;
    }
    this.turn = "you";
    this.thinking = false;
    if (at(this.board, move.to)?.side === "them") remember(this.aiMem, this.board, move);
    this.warnChase();
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
      const revived = reviveKing(this.board, "you", this.pid, this.laws, this.mods);
      this.board = revived.board;
      if (this.laws.doubleCrown && revived.pos) {
        const extra = spreadCrown(this.board, revived.pos, "you");
        this.board = extra.board;
      }
      const target = revived.pos ?? piecesOf(this.board, "you")[0]?.pos ?? null;
      this.pushLog("Second Chance! A King hops back on the far row.");
      this.cheer("Saved!");
      this.audio.crown();
      feel.heavy();
      this.turn = "you";
      this.thinking = false;
      this.lock = null;
      this.selected = null;
      this.renderAll();
      if (target) void this.animateCrown(target);
      if (outcome(this.board, "you", this.laws, this.mods) === "them") this.loseOrHoldOops();
      else this.persistClimb();
      return;
    }
    this.loseOrHoldOops();
  }

  /** After a wipe, Oops can still undo — then the board ends. Never wait on Give up. */
  private loseOrHoldOops(): void {
    this.turn = "you";
    this.thinking = false;
    this.animating = false;
    this.lock = null;
    this.selected = null;
    this.skippedJump = false;
    this.clearAi();
    this.clearWipe();
    const canUndo = !!(this.snapshot && this.oopsLeft > 0);
    if (canUndo) {
      this.pushLog("You're out. Oops to take that hop back.");
      this.cheer("Out!");
    } else {
      this.cheer("Out!");
    }
    this.renderAll();
    this.persistClimb();
    const wait = canUndo ? (this.mode === "daily" ? 900 : 2200) : 700;
    this.wipeTimer = window.setTimeout(() => {
      this.wipeTimer = null;
      if (this.end) return;
      if (piecesOf(this.board, "you").length > 0) return;
      this.finish(false);
    }, wait);
  }

  private boardCleared(): void {
    this.thinking = false;
    this.animating = false;
    this.audio.win();
    feel.winBuzz();
    this.cheer("Board clear!");
    if (this.mode !== "daily" && this.boardIndex < PATH_END - 1) {
      void recordHop({
        kind: "board-clear",
        title: this.pathNames[this.boardIndex] ?? "Board",
        board: this.boardIndex + 1,
        hops: this.hops,
        moves: this.moves,
        stars: this.meta.notches,
      });
    }
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
    this.clearWipe();
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
      void recordHop(
        {
          kind: win ? "climb-win" : "climb-lose",
          title: win ? "The Crown" : (this.pathNames[this.boardIndex] ?? "Climb"),
          board: this.boardIndex + 1,
          hops: this.hops,
          moves: this.moves,
          stars: this.meta.notches,
        },
        { clearClimb: true },
      );
    } else {
      this.end = {
        win,
        hops: this.hops,
        notches: this.moves,
        gained: this.moves,
        board: 1,
      };
      void recordHop({
        kind: win ? "daily-win" : "daily-lose",
        title: this.dailyLabel || "Daily",
        board: 1,
        hops: this.hops,
        moves: this.moves,
        stars: this.meta.notches,
      });
    }
    if (win) {
      this.audio.win();
      feel.winBuzz();
      if (this.mode === "run" && this.boardIndex >= PATH_END - 1) {
        this.audio.fanfare();
        this.petalBurst();
        this.cheer("The Crown falls!", 5);
      }
    } else {
      this.audio.lose();
      feel.loseBuzz();
    }
    this.show("end");
    if (this.mode === "daily" && win) void this.refreshScores();
  }

  private async refreshScores(): Promise<void> {
    const board = await fetchBoard(utcDayKey());
    this.scores = board.scores;
    this.boardLive = !!board.live;
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
    const head = `<li class="head"><b>#</b><span>Name</span><em>Moves</em><i></i></li>`;
    if (!this.scores.length) {
        return `${head}<li class="quiet">${
          this.boardLive
            ? "Nobody on the shared board yet. Win today's map and pin your moves."
            : "No network for the shared board. You can still hop today's felt; a pin stays on this device until you are back online."
        }</li>`;
    }
    const mine = loadName().toLowerCase();
    const rows = this.scores
      .slice(0, limit)
      .map((s, i) => {
        const me = s.name.toLowerCase() === mine ? " me" : "";
        const podium = i < 3 ? ` rank-${i + 1}` : "";
        const hide =
          s.name.toLowerCase() === mine
            ? `<i></i>`
            : `<i><button type="button" class="flag" data-cmd="report" data-name="${escapeHtml(s.name)}">Hide</button></i>`;
        return `<li class="score${me}${podium}"><b>${i + 1}</b><span>${escapeHtml(s.name)}</span><em>${s.moves}</em>${hide}</li>`;
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
    if (name === "account") this.renderAccount();
    if (name === "history") this.renderHistory();
    if (name === "studio") void this.renderStudio();
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
    const label = document.getElementById("play-main-label");
    const sub = document.getElementById("play-main-sub");
    const fresh = document.getElementById("play-fresh");
    const saved = hasClimb();
    if (main) main.setAttribute("data-cmd", saved ? "continue" : "new");
    if (label) label.textContent = saved ? "Continue" : "Play";
    if (sub) sub.textContent = saved ? "This climb" : "New climb";
    if (fresh) fresh.classList.toggle("hidden", !saved);
    const dailyName = document.getElementById("play-daily-name");
    if (dailyName) dailyName.textContent = dailyTitle();
    const hint = document.getElementById("climb-hint");
    if (hint) {
      hint.textContent = `Each new game begins a new challenge. Each challenge is randomly seeded. The Daily Challenge is ${dailyTitle()}.`;
    }
    this.paintName();
    this.paintAccount();
    void this.warmTitleScores();
  }

  private titleWarmed = false;
  private async warmTitleScores(): Promise<void> {
    if (this.titleWarmed && this.scores.length) return;
    this.titleWarmed = true;
    const board = await fetchBoard(utcDayKey());
    this.scores = board.scores;
    this.boardLive = !!board.live;
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
        : "The shared board is empty. Win it and pin your move count.";
    }
    const mods = document.getElementById("daily-mods");
    if (mods) {
      const list = this.feltMods.length ? this.feltMods : this.twists.map(asFelt);
      mods.innerHTML = list.map((m) => this.modifierCard(m.title, m.desc, m.side)).join("");
    }
    const lead = document.getElementById("daily-lead");
    if (lead) {
      const who = hasName() ? ` Pinning as ${loadName()}.` : " Pick a name on the title so the board knows you.";
      lead.textContent =
        `Everyone testing King Me shares this fewest-moves list until midnight UTC. A climb is different — New climb rolls a new path just for you.${who}${
          this.boardLive ? "" : " Shared pins need a network — this list is what this device last saw."
        }`;
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
            (o, i) => `<button type="button" class="pick-card" data-cmd="law:${o.id}" style="animation-delay:${i * 70}ms">
              <span class="pick-icon">${o.icon}</span>
              <b class="mod-head">${o.name}</b>
              <small class="mod-desc">${o.desc}</small>
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
      <p class="lead">The Enemy is off the felt. Lowest moves sits on top. ${rankBit}</p>
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
          ? "Every Enemy piece is in the box. Sit down tomorrow for a new path."
          : "Your last player piece hopped off the board. Stars from this try make the next First Hop a little kinder."
      }</p>
      <ul class="stats">
        <li>Reached ${this.pathNames[s.board - 1] ?? BOARD_NAMES[s.board - 1] ?? ""} (${s.board} / ${PATH_END})</li>
        <li>${s.hops} captures</li>
        <li class="star-line">Stars +${s.gained} <span>(now ${s.notches})</span></li>
        <li>Next game: ${b.extra ? `+${b.extra} extra man` : "same crew"}${
          b.kingChance > 0.05 ? ` · ${Math.round(b.kingChance * 100)}% a player piece starts as a King` : ""
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
    if (this.screen === "playing" && !this.animating) this.freeSealedPieces();
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
    const legal = this.turn === "you" && !this.thinking ? this.youLegal() : [];
    const jumps = legal.filter((m) => m.capture);
    const status = document.getElementById("status");
    if (status) {
      if (this.coachOn) {
        status.textContent = JUMP_HOW;
      } else {
        const wiped =
          this.turn === "you" &&
          !this.thinking &&
          piecesOf(this.board, "you").length === 0;
        status.textContent = this.thinking
          ? this.canOops()
            ? "Enemy… Oops still works."
            : "The Enemy is hopping…"
          : wiped
            ? this.canOops()
              ? "You're out. Tap Oops to undo — or that's the game."
              : "You're out."
            : this.lock
              ? "Keep capturing, slide a pip, or Skip jump."
              : jumps.length
                ? this.selected
                  ? "The star is the jump. Slide a pip if you want to go another way."
                  : "A jump is ready — you do not have to take it."
                : this.selected
                  ? legal.some((m) => m.overHole)
                    ? "Jump over the pit onto the star — or drop onto the pit."
                    : "Slide onto a pip."
                  : this.turn === "you"
                    ? this.canOops()
                      ? "Slide a pip, or jump an Enemy — or Oops that hop."
                      : "Slide a pip, or jump an Enemy."
                    : "Wait.";
      }
    }
    const counts = document.getElementById("counts");
    if (counts) {
      const who = hasName() ? `${loadName()} · ` : "";
      counts.textContent =
        this.mode === "daily"
          ? `${who}Moves ${this.moves} · you ${you} · Enemy ${them}`
          : `${who}You ${you} · Enemy ${them} · hops ${this.hops}`;
      if (chaseArmed(this.board)) {
        counts.textContent += ` · ${chaseHint(this.quiet)}`;
      }
    }
    const tip = document.getElementById("blurb");
    if (tip) {
      tip.textContent = "";
      tip.classList.add("hidden");
    }
    const oops = document.getElementById("btn-oops");
    if (oops instanceof HTMLButtonElement) {
      oops.classList.remove("hidden");
      oops.disabled = !this.canOops();
      oops.textContent = this.oopsLeft > 0 ? `Oops ×${this.oopsLeft}` : "Oops used";
      oops.title = this.canOops()
        ? "Take back your last hop, even after the Enemy replies"
        : "Hop first, then Oops after you see the Enemy's reply";
    }
    const skip = document.getElementById("btn-skip");
    if (skip instanceof HTMLButtonElement) {
      skip.classList.toggle("hidden", !this.lock);
      skip.disabled = !this.canSkipJump();
      skip.textContent = "Skip jump";
      skip.title = "Stop here without hopping again";
    }
    const laws = document.getElementById("laws");
    if (laws) {
      const cards = this.feltMods.map((m) => this.modifierCard(m.title, m.desc, m.side));
      if (this.mode === "daily") {
        laws.innerHTML = cards.join("") || `<li class="quiet">Today's board. Fewest moves wins.</li>`;
      } else {
        const owned = LAW_DEFS.filter((d) => this.laws[d.id]);
        const powers = owned.map(
          (d) =>
            `<li class="mod-card"><p class="mod-head">${d.icon} ${escapeHtml(d.name)}</p><p class="mod-desc">${escapeHtml(d.desc)}</p></li>`,
        );
        laws.innerHTML =
          cards.join("") +
          (powers.length ? powers.join("") : cards.length ? "" : `<li class="quiet">Win a board to pick a power.</li>`);
        if (!cards.length && !powers.length) {
          laws.innerHTML = `<li class="quiet">Win a board to pick a power.</li>`;
        }
      }
    }
    const log = document.getElementById("log");
    if (log) log.innerHTML = this.log.map((l) => `<div>${l}</div>`).join("");
  }

  private renderBoard(): void {
    const el = document.getElementById("board");
    if (!el) return;
    this.paintFelt();
    const legal = this.turn === "you" && !this.thinking && !this.animating
      ? this.youLegal()
      : [];
    const shown = legal.filter((m) => !this.selected || (m.from.r === this.selected.r && m.from.c === this.selected.c));
    const hints = new Set(shown.map((m) => `${m.to.r},${m.to.c}`));
    const jumps = new Set(
      shown.filter((m) => m.capture || m.overHole).map((m) => `${m.to.r},${m.to.c}`),
    );
    const longs = new Set(shown.filter((m) => m.far).map((m) => `${m.to.r},${m.to.c}`));
    const preys = new Set(
      shown
        .filter((m) => m.capture || m.overHole)
        .map((m) => `${(m.capture ?? m.overHole)!.r},${(m.capture ?? m.overHole)!.c}`),
    );
    const froms = new Set(legal.map((m) => `${m.from.r},${m.from.c}`));
    const n = boardSize(this.mods);
    let html = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const dark = (r + c) % 2 === 1;
        const hole = isHole(this.mods, r, c);
        const p = this.board[r]![c];
        const sel = this.selected && this.selected.r === r && this.selected.c === c;
        const hint = hints.has(`${r},${c}`);
        const prey = preys.has(`${r},${c}`);
        const far = longs.has(`${r},${c}`);
        const can = p && p.side === "you" && froms.has(`${r},${c}`) && !this.lock;
        const focusable = dark && (!hole || !!p || prey);
        html += `<div role="gridcell" class="sq ${dark ? "dark" : "light"} ${hole ? "hole" : ""} ${sel ? "sel" : ""} ${hint ? "hint" : ""} ${prey ? "prey" : ""} ${far ? "long" : ""} ${can ? "can" : ""}" data-r="${r}" data-c="${c}" ${focusable ? 'tabindex="0"' : 'tabindex="-1"'}>`;
        if (p) {
          html += `<span class="man ${p.side} ${p.king ? "king" : ""}" aria-label="${p.side === "you" ? "player" : "enemy"} ${p.king ? "King" : "piece"}"><span class="face" aria-hidden="true"></span></span>`;
        } else if (hint) {
          html += `<span class="land ${jumps.has(`${r},${c}`) ? "jump" : ""} ${far ? "far" : ""}" aria-hidden="true"></span>`;
        }
        html += `</div>`;
      }
    }
    el.innerHTML = html;
    el.classList.toggle("size-10", n === 10);
    el.classList.toggle("coaching", this.coachOn);
    const keep = this.keyFocus ?? this.selected;
    if (keep) this.squareEl(keep)?.focus();
  }

  private paintFelt(): void {
    const el = document.getElementById("board");
    if (!el) return;
    const seed = this.mode === "daily" ? dailySeed() : this.runSeed;
    const index = this.mode === "daily" ? 8 : this.boardIndex;
    const t = feltTheme(seed, index);
    el.style.setProperty("--board-rim", t.rim);
    el.style.setProperty("--board-outer", t.outer);
    el.style.setProperty("--board-back", t.back);
    el.style.setProperty("--board-inlay", t.light);
    el.style.setProperty("--sq-dark", t.dark);
    el.style.setProperty("--sq-dark-odd", t.darkOdd);
    el.style.setProperty("--sq-light", t.light);
  }
}
