import { AudioSys } from "./audio.ts";
import { def, IDENTITIES, PLAYABLE, powerName } from "./identities.ts";
import {
  Input,
  KEY_ENTER,
  KEY_ESC,
  KEY_ONE,
  KEY_THREE,
  KEY_TWO,
} from "./input.ts";
import { hasPerk, loadMeta, PERKS, remembranceFor, saveMeta, type Meta } from "./meta.ts";
import { Particles } from "./particles.ts";
import { activeResonances, RESONANCES } from "./resonances.ts";
import { drawTitleBg, drawWorld, type Cam } from "./render.ts";
import { dailySeed, hashSeed } from "./rng.ts";
import {
  chooseHarvest,
  chooseWear,
  createRun,
  effectiveMax,
  goalLabel,
  leaveShop,
  setMoveTarget,
  shopPick,
  shrinePick,
  tickWorld,
} from "./sim.ts";
import type { IdentityId, RunState, Screen } from "./types.ts";
import { PATH_END, PATH_NAMES, TILE } from "./types.ts";
import { gunOf, sparkBonus, sparkFromRun, weaponLevel, xpIntoLevel } from "./weapons.ts";

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input = new Input();
  audio = new AudioSys();
  particles = new Particles();
  meta: Meta = loadMeta();
  screen: Screen = "title";
  run: RunState | null = null;
  cam: Cam = { x: 0, y: 0 };
  time = 0;
  last = performance.now();
  shake = 0;
  hitstop = 0;
  flash: { color: string; a: number } | null = null;
  banner: { text: string; sub: string; color: string; t: number } | null = null;
  floorTitle = 0;
  viewW = 800;
  viewH = 600;
  usurper = false;
  hudKey = "";
  endStats: {
    win: boolean;
    usurper: boolean;
    rem: number;
    floor: number;
    worn: number;
    resonances: number;
    gold: number;
    kills: number;
    grave: number;
    sparkGained: number;
    sparkTotal: number;
    runXp: number;
  } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
    this.input.bind(canvas);
    this.audio.setMuted(this.meta.mute);
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewW = parent.clientWidth;
    this.viewH = parent.clientHeight;
    this.canvas.width = Math.floor(this.viewW * dpr);
    this.canvas.height = Math.floor(this.viewH * dpr);
    this.canvas.style.width = `${this.viewW}px`;
    this.canvas.style.height = `${this.viewH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  unlock(): void {
    this.audio.unlock();
  }

  newRun(daily: boolean): void {
    this.unlock();
    const seed = daily ? hashSeed(dailySeed() * 97 + 13) : (Math.random() * 0xffffffff) | 0;
    this.run = createRun(seed, this.meta, daily);
    this.screen = "playing";
    this.usurper = false;
    this.endStats = null;
    this.banner = null;
    this.shake = 0;
    this.floorTitle = 1.8;
    this.snapCam();
    this.meta.runs += 1;
    saveMeta(this.meta);
    this.syncHud();
    this.showScreen("playing");
  }

  snapCam(): void {
    const r = this.run;
    if (!r) return;
    this.cam.x = r.player.x * TILE - this.viewW / 2;
    this.cam.y = r.player.y * TILE - this.viewH / 2;
  }

  showScreen(name: Screen): void {
    this.screen = name;
    document.querySelectorAll("[data-screen]").forEach((el) => {
      el.classList.toggle("hidden", el.getAttribute("data-screen") !== name);
    });
    document.getElementById("hud")?.classList.toggle("hidden", name !== "playing");
    document.getElementById("touch")?.classList.toggle(
      "hidden",
      name !== "playing" || !window.matchMedia("(pointer: coarse)").matches,
    );
    if (name === "title") this.renderTitleMenu();
    if (name === "codex") this.renderCodex();
    if (name === "end") this.renderEnd();
    if (name === "playing") this.syncHud();
  }

  finishRun(win: boolean, usurper: boolean): void {
    const r = this.run;
    if (!r) return;
    const rem = remembranceFor({
      floor: r.floor,
      worn: r.worn.length,
      resonances: r.discovered.length,
      win,
      usurper,
    });
    const gained = sparkFromRun(r.runXp, this.meta.spark ?? 0);
    this.meta.spark = (this.meta.spark ?? 0) + gained;
    this.meta.remembrance += rem;
    this.meta.bestFloor = Math.max(this.meta.bestFloor, r.floor);
    this.meta.bestGold = Math.max(this.meta.bestGold, r.gold);
    if (win) this.meta.wins += 1;
    if (usurper) this.meta.usurper = true;
    for (const id of r.worn) {
      if (!this.meta.seen.includes(id)) this.meta.seen.push(id);
    }
    for (const e of r.enemies) {
      if (!this.meta.seen.includes(e.id)) this.meta.seen.push(e.id);
    }
    for (const id of Object.keys(r.ash) as IdentityId[]) {
      if (!this.meta.seen.includes(id)) this.meta.seen.push(id);
    }
    if (!this.meta.seen.includes("hollow") && r.pathProgress >= PATH_END) this.meta.seen.push("hollow");
    for (const res of r.discovered) {
      if (!this.meta.resonances.includes(res)) this.meta.resonances.push(res);
    }
    saveMeta(this.meta);
    this.endStats = {
      win,
      usurper,
      rem,
      floor: r.floor,
      worn: r.worn.length,
      resonances: r.discovered.length,
      gold: r.gold,
      kills: r.kills,
      grave: r.grave.length,
      sparkGained: gained,
      sparkTotal: this.meta.spark,
      runXp: r.runXp,
    };
    this.showScreen("end");
  }

  drainFx(): void {
    const r = this.run;
    if (!r) return;
    const queue = r.fx.splice(0, r.fx.length);
    for (const f of queue) {
      if (f.kind === "shake" && this.meta.shake) this.shake = Math.max(this.shake, f.mag);
      if (f.kind === "burst") {
        this.particles.burst(f.x * TILE, f.y * TILE, f.color, f.n ?? 12);
      }
      if (f.kind === "text") {
        this.particles.text(f.x * TILE, f.y * TILE, f.text, f.color);
      }
      if (f.kind === "banner") {
        this.banner = { text: f.text, sub: f.sub ?? "", color: f.color, t: 1.6 };
      }
      if (f.kind === "sfx") this.audio.play(f.name);
      if (f.kind === "flash") this.flash = { color: f.color, a: 1 };
      if (f.kind === "hitstop") this.hitstop = Math.max(this.hitstop, f.ms / 1000);
      if (f.kind === "floorTitle") this.floorTitle = 1.8;
    }
  }

  handlePlaying(): void {
    const r = this.run;
    if (!r) return;

    if (r.phase === "dead") {
      this.finishRun(false, false);
      return;
    }
    if (r.phase === "won") {
      const usurper = r.player.stack[0] === "hollow" || this.usurper;
      this.finishRun(true, usurper);
      return;
    }

    if (r.phase === "playing" && this.input.consume(KEY_ESC)) {
      this.showScreen("pause");
      return;
    }

    if (r.phase === "decision") {
      this.syncModal();
      if (this.input.consume(KEY_ONE) || this.input.consume(KEY_ENTER)) chooseWear(r);
      else if (this.input.consume(KEY_TWO)) chooseHarvest(r);
      this.drainFx();
      this.syncHud();
      this.usurper = r.player.stack[0] === "hollow";
      return;
    }

    if (r.phase === "shrine") {
      this.syncModal();
      if (this.input.consume(KEY_ONE)) shrinePick(r, 1);
      else if (this.input.consume(KEY_TWO)) shrinePick(r, 2);
      else if (this.input.consume(KEY_THREE)) shrinePick(r, 3);
      else if (this.input.consume(KEY_ESC)) shrinePick(r, 0);
      this.drainFx();
      this.syncHud();
      return;
    }

    if (r.phase === "shop") {
      this.syncModal();
      if (this.input.consume(KEY_ONE)) shopPick(r, 1);
      else if (this.input.consume(KEY_TWO)) shopPick(r, 2);
      else if (this.input.consume(KEY_THREE)) shopPick(r, 3);
      else if (this.input.consume(KEY_ESC) || this.input.consume(["0", "4"])) leaveShop(r);
      this.drainFx();
      this.syncHud();
      return;
    }

    if (r.phase === "playing") {
      this.hideModal();
      if (this.input.consumeClick()) {
        const wx = (this.input.mouse.x + this.cam.x) / TILE;
        const wy = (this.input.mouse.y + this.cam.y) / TILE;
        setMoveTarget(r, wx, wy);
      }
    }
    this.drainFx();
    this.syncHud();
  }

  command(cmd: string): void {
    this.unlock();
    const r = this.run;
    if (cmd === "new") {
      this.newRun(false);
      return;
    }
    if (cmd === "daily") {
      this.newRun(true);
      return;
    }
    if (cmd === "how") {
      this.showScreen("how");
      return;
    }
    if (cmd === "codex") {
      this.showScreen("codex");
      return;
    }
    if (cmd === "title") {
      this.showScreen("title");
      return;
    }
    if (cmd === "resume") {
      this.showScreen("playing");
      return;
    }
    if (cmd === "abandon") {
      if (this.run && this.screen === "pause") this.finishRun(false, false);
      else this.showScreen("title");
      return;
    }
    if (cmd === "mute") {
      this.meta.mute = !this.meta.mute;
      this.audio.setMuted(this.meta.mute);
      saveMeta(this.meta);
      this.renderTitleMenu();
      this.syncHud();
      return;
    }
    if (cmd === "shake") {
      this.meta.shake = !this.meta.shake;
      saveMeta(this.meta);
      this.renderTitleMenu();
      return;
    }
    if (cmd.startsWith("buy:")) {
      const id = cmd.slice(4);
      const perk = PERKS.find((p) => p.id === id);
      if (!perk || hasPerk(this.meta, id)) return;
      if (this.meta.remembrance < perk.cost) return;
      this.meta.remembrance -= perk.cost;
      this.meta.perks.push(id);
      saveMeta(this.meta);
      this.audio.play("resonate");
      this.renderTitleMenu();
      return;
    }
    if (!r) return;
    if (cmd === "wear") chooseWear(r);
    if (cmd === "harvest") chooseHarvest(r);
    if (cmd === "shrine1") shrinePick(r, 1);
    if (cmd === "shrine2") shrinePick(r, 2);
    if (cmd === "shrine3") shrinePick(r, 3);
    if (cmd === "shop1") shopPick(r, 1);
    if (cmd === "shop2") shopPick(r, 2);
    if (cmd === "shop3") shopPick(r, 3);
    if (cmd === "shop0") leaveShop(r);
    this.drainFx();
    this.syncHud();
  }

  update(): void {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.15;
    }
    this.time += dt * 1000;
    this.shake *= Math.pow(0.001, dt);
    if (this.flash) {
      this.flash.a = Math.max(0, this.flash.a - dt * 2.4);
      if (this.flash.a <= 0) this.flash = null;
    }
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.floorTitle = Math.max(0, this.floorTitle - dt);
    this.particles.update(dt);

    if (this.screen === "playing" && this.run) {
      if (this.run.phase === "playing") {
        const axis = this.input.axis();
        tickWorld(this.run, dt, axis.x, axis.y, this.input.heldFire());
        this.drainFx();
      }
      this.handlePlaying();
      const r = this.run;
      if (r) {
        const tx = r.player.x * TILE - this.viewW / 2;
        const ty = r.player.y * TILE - this.viewH / 2;
        this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 10);
        this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 10);
      }
    } else if (this.screen === "pause" && this.input.consume(KEY_ESC)) {
      this.showScreen("playing");
    } else if ((this.screen === "how" || this.screen === "codex") && this.input.consume(KEY_ESC)) {
      this.showScreen("title");
    }

    this.input.endFrame();
  }

  draw(): void {
    const ctx = this.ctx;
    if (this.screen !== "playing" || !this.run) {
      drawTitleBg(ctx, this.viewW, this.viewH, this.time);
      return;
    }
    const sx = this.meta.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.meta.shake ? (Math.random() - 0.5) * this.shake : 0;
    const cam = { x: this.cam.x + sx, y: this.cam.y + sy };
    drawWorld(ctx, this.run, cam, this.viewW, this.viewH, this.time, this.meta, this.flash);
    this.particles.draw(ctx, cam.x, cam.y);

    if (this.floorTitle > 0 && this.run) {
      const a = Math.min(1, this.floorTitle, this.floorTitle > 1.2 ? 1 : this.floorTitle / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.strokeStyle = "#3b2152";
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ff5a8a";
      ctx.font = "800 48px Fredoka, Nunito, sans-serif";
      const roomName = PATH_NAMES[this.run.pathProgress] ?? "Trail";
      ctx.strokeText(roomName, this.viewW / 2, this.viewH * 0.28);
      ctx.fillText(roomName, this.viewW / 2, this.viewH * 0.28);
      ctx.fillStyle = "#3b2152";
      ctx.font = "800 20px Fredoka, Nunito, sans-serif";
      ctx.fillText(
        `Trail ${this.run.pathProgress + 1} / ${PATH_END + 1}  ·  ${goalLabel(this.run)}`,
        this.viewW / 2,
        this.viewH * 0.28 + 34,
      );
      ctx.restore();
    }

    if (this.banner) {
      const a = Math.min(1, this.banner.t, this.banner.t > 0.4 ? 1 : this.banner.t / 0.4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.fillStyle = this.banner.color;
      ctx.font = "800 36px Fredoka, Nunito, sans-serif";
      ctx.fillText(this.banner.text, this.viewW / 2, this.viewH * 0.38);
      if (this.banner.sub) {
        ctx.fillStyle = "#3b2152";
        ctx.font = "700 16px Nunito, sans-serif";
        ctx.fillText(this.banner.sub, this.viewW / 2, this.viewH * 0.38 + 28);
      }
      ctx.restore();
    }
  }

  hideModal(): void {
    const m = document.getElementById("modal");
    if (m) m.classList.add("hidden");
  }

  syncModal(): void {
    const r = this.run;
    const m = document.getElementById("modal");
    if (!r || !m) return;
    if (r.phase === "decision" && r.pending) {
      const e = r.pending;
      const d = def(e.id);
      const hollow = e.id === "hollow";
      m.classList.remove("hidden");
      m.innerHTML = `
        <div class="sheet">
          <p class="kicker">${hollow ? "King Empty wobbles" : "Costume time!"}</p>
          <h2 style="color:${d.color}">${d.name}</h2>
          <p class="lead">${d.blurb}</p>
          <p class="stat"><strong>Wear</strong> — put on the ${d.name} outfit. ${d.active}</p>
          <p class="stat"><strong>Snack</strong> — take the coins.${hollow ? " Or send the King home and you win." : " King Empty keeps this costume."}</p>
          <div class="row">
            <button data-cmd="wear">${hollow ? "Wear King Empty (1)" : "Wear (1)"}</button>
            <button class="ghost" data-cmd="harvest">${hollow ? "Send him home (2)" : "Snack (2)"}</button>
          </div>
        </div>`;
      return;
    }
    if (r.phase === "shrine") {
      m.classList.remove("hidden");
      m.innerHTML = `
        <div class="sheet">
          <p class="kicker">A fizzy fountain</p>
          <h2>Shuffle, trade, or pin</h2>
          <p class="lead">The fountain burps sparkles. It likes costumes.</p>
          <div class="col">
            <button data-cmd="shrine1">1 — Flip the pile upside down</button>
            <button data-cmd="shrine2">2 — Trade your top costume for 6 coins</button>
            <button data-cmd="shrine3">3 — Get a Lucky Pin</button>
          </div>
        </div>`;
      return;
    }
    if (r.phase === "shop") {
      m.classList.remove("hidden");
      m.innerHTML = `
        <div class="sheet">
          <p class="kicker">Snack stall</p>
          <h2>Goodies · ${r.gold} coins</h2>
          <div class="col">
            <button data-cmd="shop1">1 — Lucky Pin · 7 coins</button>
            <button data-cmd="shop2">2 — Mystery costume · 12 coins</button>
            <button data-cmd="shop3">3 — Bigger pile · 14 coins ${r.extraSlotBought ? "(sold)" : ""}</button>
            <button class="ghost" data-cmd="shop0">Bye (Esc)</button>
          </div>
        </div>`;
    }
  }

  syncHud(): void {
    const r = this.run;
    const panel = document.getElementById("stack-panel");
    const logEl = document.getElementById("log");
    if (!r || !panel || !logEl) return;
    const k = `${r.phase}|${r.gold}|${r.stitches}|${r.player.stack.join(",")}|${r.log[0] ?? ""}|${r.pending?.id ?? ""}|${r.runXp}|${r.pathProgress}|${this.meta.mute}`;
    if (k === this.hudKey) return;
    this.hudKey = k;
    const face = r.player.stack[0] ?? "vagabond";
    const res = activeResonances(r);
    const max = effectiveMax(r);
    const lv = weaponLevel(r.runXp);
    const xp = xpIntoLevel(r.runXp);
    const gun = gunOf(face);
    const perm = sparkBonus(r.spark);
    panel.innerHTML = `
      <div class="stack-head">
        <span>Pile</span>
        <span>${r.player.stack.length}/${max}</span>
      </div>
      <ol class="stack-list">
        ${r.player.stack
          .map((id, i) => {
            const d = def(id);
            return `<li class="${i === 0 ? "top" : ""}" style="--c:${d.color}">
              <b>${d.name}</b>
              ${i === 0 ? `<small>${powerName(id)}</small>` : ""}
            </li>`;
          })
          .join("")}
      </ol>
      ${
        res.length
          ? `<div class="res-list">${res.map((x) => `<div class="res"><b>${x.name}</b></div>`).join("")}</div>`
          : ""
      }
      <p class="power">${gun.name} · Lv ${lv}${lv >= 8 ? " max" : ""}</p>
      <div class="xp"><i style="width:${Math.round((xp.have / xp.need) * 100)}%"></i></div>
      <p class="spark-note">Spark ${r.spark} · +${Math.round(perm.dmg * 100)}% dmg forever</p>
    `;
    logEl.innerHTML = r.log.slice(0, 2).map((l) => `<div>${l}</div>`).join("");
    const mute = document.getElementById("btn-mute");
    if (mute) mute.textContent = this.meta.mute ? "Sound off" : "Sound on";

    if ((r.phase === "decision" && r.pending) || r.phase === "shop" || r.phase === "shrine") {
      this.syncModal();
    } else {
      this.hideModal();
    }
  }

  renderTitleMenu(): void {
    const shop = document.getElementById("perk-shop");
    const rem = document.getElementById("rem-count");
    if (rem) rem.textContent = String(this.meta.remembrance);
    if (shop) {
      shop.innerHTML = PERKS.map((p) => {
        const owned = hasPerk(this.meta, p.id);
        const can = !owned && this.meta.remembrance >= p.cost;
        return `<button class="perk ${owned ? "owned" : ""}" data-cmd="buy:${p.id}" ${
          owned || !can ? "disabled" : ""
        }>
          <b>${p.name}</b>
          <span>${owned ? "Got it!" : p.cost + " stickers"}</span>
          <small>${p.desc}</small>
        </button>`;
      }).join("");
    }
    const stats = document.getElementById("meta-stats");
    if (stats) {
      stats.textContent = `${this.meta.runs} tries · deepest trail ${this.meta.bestFloor} / ${PATH_END + 1} · ${this.meta.wins} wins · Spark ${this.meta.spark ?? 0} (+${Math.round(sparkBonus(this.meta.spark ?? 0).dmg * 100)}% guns)`;
    }
    const mute = document.querySelector("[data-cmd='mute']");
    if (mute) mute.textContent = this.meta.mute ? "Sound is off" : "Sound is on";
    const shake = document.querySelector("[data-cmd='shake']");
    if (shake) shake.textContent = this.meta.shake ? "Wobble on" : "Wobble off";
  }

  renderCodex(): void {
    const box = document.getElementById("codex-body");
    if (!box) return;
    const faces = PLAYABLE.map((id) => {
      const d = IDENTITIES[id];
      const seen = this.meta.seen.includes(id);
      return `<article class="card ${seen ? "" : "locked"}" style="--c:${d.color}">
        <h3>${seen ? d.name : "????"}</h3>
        <p>${seen ? d.blurb : "Not yet worn."}</p>
        <small>${seen ? d.active : ""}</small>
        <small>${seen ? "Echo: " + d.echo : ""}</small>
      </article>`;
    }).join("");
    const hollowSeen = this.meta.seen.includes("hollow");
    const h = IDENTITIES.hollow;
    const res = RESONANCES.map((r) => {
      const seen = this.meta.resonances.includes(r.id);
      return `<article class="card ${seen ? "" : "locked"}">
        <h3>${seen ? r.name : "Mystery combo"}</h3>
        <p>${seen ? r.desc : r.hint}</p>
      </article>`;
    }).join("");
    box.innerHTML = `
      <h3 class="sec">Costumes</h3>
      <div class="grid">${faces}
        <article class="card ${hollowSeen ? "" : "locked"}" style="--c:${h.color}">
          <h3>${hollowSeen ? h.name : "????"}</h3>
          <p>${hollowSeen ? h.blurb : "King Empty is collecting every outfit you skip."}</p>
        </article>
      </div>
      <h3 class="sec">Silly combos</h3>
      <div class="grid">${res}</div>
    `;
  }

  renderEnd(): void {
    const box = document.getElementById("end-body");
    const s = this.endStats;
    if (!box || !s) return;
    box.innerHTML = `
      <p class="kicker">${s.win ? (s.usurper ? "You wore the King!" : "You sent him home!") : "All the costumes fell off"}</p>
      <h2>${s.win ? "Pip wins the closet" : "Pip got sent home"}</h2>
      <p class="lead">${
        s.win
          ? s.usurper
            ? "You put King Empty on like a giant raincoat. Googly eyes and all. Time for a snack."
            : "You sent King Empty packing and kept your own silly pile. Sticker time."
          : `The last costume went fwoomp. King Empty is still down the trail. Spark from this try makes the next gun a little stronger — never enough to go god-mode.`
      }</p>
      <ul class="stats">
        <li>Trail room ${s.floor} — ${PATH_NAMES[s.floor - 1] ?? ""}</li>
        <li>${s.kills} costumes collected</li>
        <li>${s.worn} outfits worn</li>
        <li>${s.resonances} combos found</li>
        <li>${s.grave} given to King Empty</li>
        <li>${s.gold} coins in the PJ pockets</li>
        <li>Run XP ${s.runXp} · Spark +${s.sparkGained} (now ${s.sparkTotal})</li>
        <li class="gold">+${s.rem} Stickers</li>
      </ul>
    `;
  }
}
