# Endless Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Endless: keep winning boards with a 3-power kit (fill, then swap), late-climb remix after a warm-up, a paused save separate from the climb, and a shared all-time **Endless** list ranked by rounds cleared.

**Architecture:** Pure helpers in `src/game/endless.ts` (kit, round table, pin). Phone wait in `src/game/endlessSave.ts` (`jumpgrave-endless-v1`, never touches `jumpgrave-climb-v1`). Shared list via `shared/endlessApi.mjs` + `netlify/functions/endless.mjs` + `src/game/endlessBoard.ts`. `game.ts` only wires mode `endless` (HUD, lily, pick/drop, persist, finish/pin).

**Tech Stack:** Vite, TypeScript, DOM/CSS, Netlify Blobs (`jumpgrave-endless` for scores; `jumpgrave-daily` still owns `hidden-names`). Tests: `tsc --noEmit`, `src/game/endlessCheck.ts`, `scripts/endlessCheck.mjs`, existing crown/power/names/account checks. Live: `https://jumpgrave-ajrr1z.netlify.app`. Do not run `npm run publish`.

## Global Constraints

- Product title is King Me; package / localStorage / Netlify slug stay `jumpgrave`.
- Player-facing: your pieces / Enemy, spots, captures, hops, Stars. Do not say pip. Super King / Long King do not say 7.
- Optional captures. Super King range stays 7 in `rules.ts`. Trapdoor once per board. No shop, ads, DLC.
- Climb `PATH_END` stays 6. Daily stays UTC fewest-moves. No secret boss. No hop-book Endless wait this pass.
- `persistClimb` / `queueCloud` must not run while `mode === "endless"`. Endless wait is phone-only (`jumpgrave-endless-v1`).
- Playtest on `http://localhost:43181/`. Do not click New climb on `http://127.0.0.1:43181/` (real Continue save).
- Do not auto-publish. Do not commit android/ios/`play-feature.png` line-ending churn.
- Do not create git commits unless the user explicitly asked to commit in this session. If a task says Commit and they have not asked, skip that step.

**Spec:** `docs/superpowers/specs/2026-09-10-endless-mode-design.md`

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/game/endless.ts` | Kit cap, take/swap, round → spec index / lily / AI skill, pin rounds |
| `src/game/endlessCheck.ts` | Node asserts for kit, pressure, pin, Wide Pond size via `boardSpec` |
| `src/game/endlessSave.ts` | `jumpgrave-endless-v1` load/save/clear/has; isolation from climb key |
| `shared/endlessApi.mjs` | `sortEndlessScores`, `mergeEndlessRow`, caps |
| `scripts/endlessCheck.mjs` | Memory tests for merge/sort |
| `netlify/functions/endless.mjs` | GET/POST all-time scores; Hide via daily `hidden-names` |
| `src/game/endlessBoard.ts` | Client GET/POST + `jumpgrave-endless-board-v1` cache |
| `src/game/copy.ts` | How, `pauseLead("endless")` |
| `src/game/keepSave.ts` | Offer keep-save on Endless end |
| `src/game/history.ts` | `endless-clear` / `endless-lose`; board cap 999 |
| `src/game/game.ts` | Mode wiring |
| `src/game/types.ts` | `pauseLead` mode union if needed (copy owns the union) |
| `index.html` | Title Endless buttons, How fallback, Daily+Endless lists, pick drop host |
| `src/style.css` | Title plays, Endless list, hide path |
| `netlify.toml` | `/api/endless` |
| `package.json` | Add endless checks to `npm test` |
| `index.html` How/Privacy/Support, `public/privacy.html`, `public/support.html`, `STORE.md`, `README.md` | Copy |

Do not add React. Do not write Endless rows into Daily day keys.

---

### Task 1: Kit, pressure table, pin helper

**Files:**
- Create: `src/game/endless.ts`
- Create: `src/game/endlessCheck.ts`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: `Laws` from `./types.ts`, `LAW_DEFS` from `./laws.ts`, `emptyLaws` from `./types.ts`, `CLIMB_SKILL` / `boardSpec` from `./setup.ts`, `Rng` from `./rng.ts`
- Produces:
  - `ENDLESS_KIT_CAP = 3`
  - `ownedLawIds(laws: Laws): (keyof Laws)[]`
  - `endlessTake(laws: Laws, id: keyof Laws): { laws: Laws; needsDrop: boolean } | null`
  - `endlessSwap(laws: Laws, takeId: keyof Laws, dropId: keyof Laws): Laws | null`
  - `endlessSpecIndex(round: number): number` — 1→0, 2–3→1, 4–6→2, 7–10→3, 11–16→4, 17+→5
  - `endlessLily(round: number): boolean` — `round >= 4`
  - `endlessSkill(round: number): number` — `CLIMB_SKILL[endlessSpecIndex(round)] ?? 0.95` (never 1)
  - `endlessPinRounds(clears: number, kind: "home" | "lose" | "giveup"): number | null`

- [ ] **Step 1: Write the failing test file**

Create `src/game/endlessCheck.ts`:

```ts
import { LAW_DEFS } from "./laws.ts";
import { boardSpec } from "./setup.ts";
import { Rng } from "./rng.ts";
import { emptyLaws, type Laws } from "./types.ts";
import {
  ENDLESS_KIT_CAP,
  endlessLily,
  endlessPinRounds,
  endlessSkill,
  endlessSpecIndex,
  endlessSwap,
  endlessTake,
  ownedLawIds,
} from "./endless.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(ENDLESS_KIT_CAP === 3, "kit cap is 3");
assert(ownedLawIds(emptyLaws()).length === 0, "fresh kit empty");

const first = LAW_DEFS[0]!.id;
const second = LAW_DEFS[1]!.id;
const third = LAW_DEFS[2]!.id;
const fourth = LAW_DEFS[3]!.id;

let laws: Laws = emptyLaws();
const t1 = endlessTake(laws, first);
assert(t1 && !t1.needsDrop && t1.laws[first], "first take fills");
laws = t1.laws;
const t2 = endlessTake(laws, second);
assert(t2 && !t2.needsDrop, "second take fills");
laws = t2.laws;
const t3 = endlessTake(laws, third);
assert(t3 && !t3.needsDrop && ownedLawIds(t3.laws).length === 3, "third take fills to 3");
laws = t3.laws;
const t4 = endlessTake(laws, fourth);
assert(t4 && t4.needsDrop && !t4.laws[fourth] && ownedLawIds(t4.laws).length === 3, "fourth take does not apply");
const swapped = endlessSwap(laws, fourth, first);
assert(swapped && swapped[fourth] && !swapped[first] && ownedLawIds(swapped).length === 3, "swap drops one");
assert(endlessSwap(laws, fourth, fourth) === null, "cannot drop the take id");
assert(endlessTake(laws, first) === null, "cannot take an owned power");

assert(endlessSpecIndex(1) === 0, "r1 First Hop");
assert(endlessSpecIndex(3) === 1, "r3 early");
assert(endlessSpecIndex(4) === 2, "r4 board 3");
assert(endlessSpecIndex(7) === 3, "r7");
assert(endlessSpecIndex(11) === 4, "r11");
assert(endlessSpecIndex(17) === 5, "r17 crown band");
assert(endlessLily(1) === false && endlessLily(3) === false && endlessLily(4) === true, "lily from round 4");
assert(endlessSkill(1) === 0.1, "r1 skill");
assert(endlessSkill(17) === 0.95, "r17 skill not 1");

assert(endlessPinRounds(0, "lose") === null, "no pin at 0 clears");
assert(endlessPinRounds(4, "home") === null, "home does not pin");
assert(endlessPinRounds(4, "lose") === 4, "lose pins clears");
assert(endlessPinRounds(4, "giveup") === 4, "give up pins clears");
assert(endlessPinRounds(12, "lose") === 12, "pin the clear count");

const pondOn = { ...emptyLaws(), widePond: true };
const spec10 = boardSpec(endlessSpecIndex(5), 0, false, new Rng(1), pondOn.widePond ? 10 : 8);
assert((spec10.size ?? 8) === 10, "Wide Pond next board is 10");
const spec8 = boardSpec(endlessSpecIndex(5), 0, false, new Rng(1), 8);
assert((spec8.size ?? 8) === 8, "drop Wide Pond next board is 8");

console.log("endlessCheck ok");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types src/game/endlessCheck.ts`

Expected: FAIL (cannot find `./endless.ts` or exports).

- [ ] **Step 3: Write `src/game/endless.ts`**

```ts
import { LAW_DEFS } from "./laws.ts";
import { CLIMB_SKILL } from "./setup.ts";
import type { Laws } from "./types.ts";

export const ENDLESS_KIT_CAP = 3;

export function ownedLawIds(laws: Laws): (keyof Laws)[] {
  return LAW_DEFS.map((d) => d.id).filter((id) => laws[id]);
}

export function endlessTake(laws: Laws, id: keyof Laws): { laws: Laws; needsDrop: boolean } | null {
  if (!(id in laws) || laws[id]) return null;
  const n = ownedLawIds(laws).length;
  if (n < ENDLESS_KIT_CAP) return { laws: { ...laws, [id]: true }, needsDrop: false };
  if (n === ENDLESS_KIT_CAP) return { laws, needsDrop: true };
  return null;
}

export function endlessSwap(laws: Laws, takeId: keyof Laws, dropId: keyof Laws): Laws | null {
  if (takeId === dropId) return null;
  if (!laws[dropId] || laws[takeId]) return null;
  if (ownedLawIds(laws).length !== ENDLESS_KIT_CAP) return null;
  return { ...laws, [dropId]: false, [takeId]: true };
}

export function endlessSpecIndex(round: number): number {
  const n = Math.max(1, Math.floor(round));
  if (n <= 1) return 0;
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  if (n <= 10) return 3;
  if (n <= 16) return 4;
  return 5;
}

export function endlessLily(round: number): boolean {
  return round >= 4;
}

export function endlessSkill(round: number): number {
  return CLIMB_SKILL[endlessSpecIndex(round)] ?? 0.95;
}

export function endlessPinRounds(clears: number, kind: "home" | "lose" | "giveup"): number | null {
  if (kind === "home") return null;
  if (!Number.isInteger(clears) || clears < 1) return null;
  return Math.min(999, clears);
}
```

- [ ] **Step 4: Hook `package.json` and run tests**

In `package.json` `test` script, after `powerCheck.ts` add:

`&& node --experimental-strip-types src/game/endlessCheck.ts`

Run: `npm test`

Expected: `endlessCheck ok` and existing checks still pass.

- [ ] **Step 5: Commit** (skip unless the user asked)

```bash
git add src/game/endless.ts src/game/endlessCheck.ts package.json
git commit -m "test: lock Endless kit cap, remix table, and pin rules"
```

---

### Task 2: Phone save isolated from the climb

**Files:**
- Create: `src/game/endlessSave.ts`
- Modify: `src/game/endlessCheck.ts`
- Modify: `src/game/save.ts` — export `packBoard` / `unpackBoard` already exported; do not change climb `KEY`

**Interfaces:**
- Consumes: `ClimbSave`, `packBoard`, `unpackBoard` from `./save.ts`; `emptyLaws`, `emptyMods` from `./types.ts`
- Produces:
  - `ENDLESS_KEY = "jumpgrave-endless-v1"`
  - `EndlessSave` = climb save fields plus `endlessRound: number`, `clears: number`, `pendingTake: keyof Laws | null`
  - `loadEndless(): EndlessSave | null`
  - `saveEndless(data: EndlessSave): void`
  - `clearEndless(): void`
  - `hasEndless(): boolean`

- [ ] **Step 1: Append isolation tests to `endlessCheck.ts`**

Use a memory localStorage shim only if `globalThis.localStorage` is missing (Node). Prefer testing pack shape without DOM:

```ts
import { ENDLESS_KEY, clearEndless, hasEndless, loadEndless, saveEndless, type EndlessSave } from "./endlessSave.ts";
import { hasClimb, saveClimb, clearClimb, type ClimbSave } from "./save.ts";
import { emptyMods } from "./types.ts";

function tinyBoard() {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

const climbStub: ClimbSave = {
  v: 1,
  runSeed: 9,
  pathNames: ["First Hop"],
  board: tinyBoard(),
  laws: emptyLaws(),
  mods: emptyMods(),
  blurb: "climb",
  feltMods: [],
  hops: 1,
  moves: 1,
  combo: 0,
  boardIndex: 0,
  turn: "you",
  lock: null,
  lastRitesUsed: false,
  oopsLeft: 1,
  snapshot: null,
  snapshotMods: null,
  snapshotHops: 0,
  snapshotMoves: 0,
  snapshotLastRites: false,
  skippedJump: false,
  quiet: 0,
  snapshotQuiet: 0,
  idSeq: 1,
  log: ["climb-log"],
  offers: [],
  screen: "playing",
};

const endlessStub: EndlessSave = {
  ...climbStub,
  blurb: "endless",
  log: ["endless-log"],
  endlessRound: 4,
  clears: 3,
  pendingTake: "backJump",
};

if (typeof localStorage !== "undefined") {
  clearClimb();
  clearEndless();
  saveClimb(climbStub);
  saveEndless(endlessStub);
  assert(hasClimb() && hasEndless(), "both waits can exist");
  assert(loadClimb()?.blurb === "climb", "climb wait intact");
  assert(loadEndless()?.endlessRound === 4 && loadEndless()?.pendingTake === "backJump", "endless wait has round + drop");
  clearEndless();
  assert(hasClimb() && !hasEndless(), "clear endless leaves climb");
  assert(ENDLESS_KEY === "jumpgrave-endless-v1", "endless key");
}
```

If Node has no `localStorage`, skip the block with `console.log("endless save skipped (no localStorage)")` but still assert types compile. Vite/Node 22 may lack it — then add a 10-line shim at the top of the test:

```ts
if (typeof localStorage === "undefined") {
  const bag: Record<string, string> = {};
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k) => bag[k] ?? null,
    setItem: (k, v) => {
      bag[k] = String(v);
    },
    removeItem: (k) => {
      delete bag[k];
    },
    clear: () => {
      for (const k of Object.keys(bag)) delete bag[k];
    },
    key: () => null,
    get length() {
      return Object.keys(bag).length;
    },
  } as Storage;
}
```

- [ ] **Step 2: Run `node --experimental-strip-types src/game/endlessCheck.ts`**

Expected: FAIL (missing `endlessSave.ts`).

- [ ] **Step 3: Implement `src/game/endlessSave.ts`**

Copy `loadClimb` validation from `src/game/save.ts` (v, board array, runSeed). Differences: key `jumpgrave-endless-v1`; read `endlessRound` (min 1), `clears` (min 0), `pendingTake` (`keyof Laws` or null). Do **not** call `climbFeltMods` in a way that mutates climb storage. Reuse `emptyLaws` / `emptyMods` spreads like `loadClimb`.

```ts
export const ENDLESS_KEY = "jumpgrave-endless-v1";

export interface EndlessSave extends ClimbSave {
  endlessRound: number;
  clears: number;
  pendingTake: keyof Laws | null;
}
```

`saveEndless` writes `JSON.stringify` to `ENDLESS_KEY` only. `clearEndless` removes that key only.

- [ ] **Step 4: Run `npm test`**

Expected: `endlessCheck ok`.

- [ ] **Step 5: Commit** (skip unless asked)

---

### Task 3: All-time Endless list (merge + API)

**Files:**
- Create: `shared/endlessApi.mjs`
- Create: `shared/endlessApi.d.ts`
- Create: `scripts/endlessCheck.mjs`
- Create: `netlify/functions/endless.mjs`
- Create: `src/game/endlessBoard.ts`
- Modify: `netlify.toml`
- Modify: `package.json` `test` script

**Interfaces:**
- Produces:
  - `EndlessScore = { name: string, rounds: number, at: number }`
  - `sortEndlessScores(scores: EndlessScore[]): EndlessScore[]` — `b.rounds - a.rounds || a.at - b.at`
  - `mergeEndlessRow(scores, name, rounds, at): EndlessScore[]` — replace only if `rounds` strictly greater; slice 80
  - `MAX_ENDLESS_ROUNDS = 999`
  - Function GET `{ scores }` POST `{ name, rounds }` → `{ scores }`
  - Client: `fetchEndlessBoard(): Promise<{ scores: EndlessScore[]; live: boolean }>`
  - Client: `postEndlessScore(name: string, rounds: number): Promise<{ scores: EndlessScore[]; live: boolean }>`
  - Local cache key `jumpgrave-endless-board-v1`

- [ ] **Step 1: Write `scripts/endlessCheck.mjs` failing tests**

```js
import { mergeEndlessRow, sortEndlessScores } from "../shared/endlessApi.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const a = mergeEndlessRow([], "Ivory", 4, 100);
assert(a[0].rounds === 4, "first pin");
const worse = mergeEndlessRow(a, "Ivory", 3, 200);
assert(worse[0].rounds === 4 && worse[0].at === 100, "worse does not replace");
const better = mergeEndlessRow(a, "ivory", 5, 300);
assert(better[0].rounds === 5 && better[0].at === 300, "better replaces same name");
const two = mergeEndlessRow(better, "Oak", 5, 400);
assert(two[0].name === "ivory" && two[1].name === "Oak", "tie keeps earlier at first");
const sorted = sortEndlessScores([
  { name: "A", rounds: 2, at: 1 },
  { name: "B", rounds: 9, at: 2 },
]);
assert(sorted[0].name === "B", "highest rounds first");
console.log("endless api checks ok");
```

- [ ] **Step 2: Run `node scripts/endlessCheck.mjs`**

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `shared/endlessApi.mjs`**

```js
export const MAX_ENDLESS_ROUNDS = 999;
export const ENDLESS_LIST_CAP = 80;

export function sortEndlessScores(scores) {
  return [...scores].sort((a, b) => b.rounds - a.rounds || a.at - b.at);
}

export function mergeEndlessRow(scores, name, rounds, at) {
  const key = String(name).toLowerCase();
  const rest = scores.filter((s) => String(s.name).toLowerCase() !== key);
  const prev = scores.find((s) => String(s.name).toLowerCase() === key);
  if (!prev || rounds > prev.rounds) rest.push({ name, rounds, at });
  else rest.push(prev);
  return sortEndlessScores(rest).slice(0, ENDLESS_LIST_CAP);
}
```

Add `shared/endlessApi.d.ts` with the same exports.

- [ ] **Step 4: Implement `netlify/functions/endless.mjs`**

Mirror `netlify/functions/daily.mjs` CORS, `tryName` / `sanitizeName` / `isBlockedName`. Differences:

- No day in the path. GET always returns the all-time list.
- Open store `jumpgrave-endless`, JSON key `scores`.
- Open `jumpgrave-daily` only to read `hidden-names` (same helper as daily). Do not write Daily day keys.
- POST body `{ name, rounds }`. `rounds` integer 1–999. Merge with `mergeEndlessRow(..., Date.now())`.
- Public list filters hidden + blocked names like daily `publicScores`.

- [ ] **Step 5: Redirect + client**

`netlify.toml` add:

```toml
[[redirects]]
  from = "/api/endless"
  to = "/.netlify/functions/endless"
  status = 200
  force = true
```

`src/game/endlessBoard.ts`: copy `leaderboard.ts` URL pattern (`SHARED_DAILY_ORIGIN` + `/api/endless`, then same-origin). `LOCAL_KEY = "jumpgrave-endless-board-v1"`. GET/POST parse `{ scores: EndlessScore[] }`. Apply `withoutHidden` using the same Hide set as Daily (`jumpgrave-hidden-names-v1`).

- [ ] **Step 6: `package.json` test** add `&& node scripts/endlessCheck.mjs`

Run: `npm test`

Expected: `endless api checks ok`.

- [ ] **Step 7: Commit** (skip unless asked)

---

### Task 4: Copy, keep-save, hop history

**Files:**
- Modify: `src/game/copy.ts` (`HOW_RULES`, `pauseLead`)
- Modify: `src/game/keepSave.ts` (`shouldOfferKeepSave`)
- Modify: `src/game/history.ts`
- Modify: `src/game/powerCheck.ts` (copy asserts)
- Modify: `index.html` How fallback, Privacy, Support
- Modify: `public/privacy.html`, `public/support.html` (same sentences)

**Interfaces:**
- Produces:
  - `pauseLead(mode: "run" | "daily" | "endless"): string`
  - Endless pause: `This run isn't the climb. Go home and Endless waits on this phone. The climb still waits on Home too.`
  - How rule 3 body: `New climb is a new path. Continue is the same climb you paused. Endless keeps going if you keep winning. You hold three treats, then swap one after each later board.`
  - How rule 4: nickname for today’s Daily list **and** the Endless list; captures still become Stars
  - `shouldOfferKeepSave(signedIn, mode)` true for `run` and `endless` when unsigned; still false for `daily`
  - `HopKind` adds `"endless-clear" | "endless-lose"`
  - `cleanHop` `board` clamp `Math.min(999, ...)`
  - `describeHop`: endless-clear `Cleared ${title} · round ${board}`; endless-lose `Endless · ${board} rounds`

- [ ] **Step 1: Failing asserts in `powerCheck.ts`**

```ts
assert(pauseLead("endless").includes("Endless waits"), "endless pause lead");
assert(!pauseLead("endless").includes("board isn't saved"), "endless is not daily pause");
assert(HOW_RULES[2]!.body.includes("Endless keeps going"), "how names Endless");
assert(HOW_RULES[3]!.body.includes("Endless"), "how names Endless list");
assert(!/\bpip\b/i.test(HOW_RULES.map((r) => r.body).join(" ")), "how still no pip");
assert(shouldOfferKeepSave(false, "endless") === true, "unsigned endless end offers keep-save");
assert(shouldOfferKeepSave(false, "daily") === false, "daily still no keep-save");
```

Import `pauseLead` if not already. Extend `shouldOfferKeepSave` type in the test call.

- [ ] **Step 2: Run `node --experimental-strip-types src/game/powerCheck.ts`**

Expected: FAIL on missing Endless strings / type error on `"endless"`.

- [ ] **Step 3: Patch copy, keepSave, history, HTML**

`pauseLead`:

```ts
export function pauseLead(mode: "run" | "daily" | "endless"): string {
  if (mode === "daily") return "This board isn't saved. The climb still waits on Home.";
  if (mode === "endless") {
    return "This run isn't the climb. Go home and Endless waits on this phone. The climb still waits on Home too.";
  }
  return "Nobody hops until you come back. Go home and this climb waits on this device. Sign in and it can wait on another phone too.";
}
```

`shouldOfferKeepSave(signedIn: boolean, mode: "run" | "daily" | "endless"): boolean {
  return !signedIn && (mode === "run" || mode === "endless");
}`

History `KINDS` include the two new kinds. `describeHop` branches before the daily-lose fallback.

Privacy: nickname also leaves the device if they pin an Endless round count. Support: Daily is fewest moves today; Endless is most rounds ever; climb is six boards.

- [ ] **Step 4: Run `npm test`**

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless asked)

---

### Task 5: Title, HUD, leaderboard markup

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/game/game.ts` (`renderTitle`, `renderHud`, `renderDaily` → also paint Endless list)

**Interfaces:**
- Consumes: `hasEndless`, `loadEndless` from `endlessSave.ts`; `fetchEndlessBoard` from `endlessBoard.ts`
- Produces: title buttons `#play-endless` `data-cmd="endless"` (or `endless-continue` when saved), `#play-endless-fresh` `data-cmd="endless-fresh"` hidden unless saved; daily screen `#endless-board` ol + `#endless-count`; HUD `#path` hidden for endless and daily; `#goal` = `Round N`

- [ ] **Step 1: Title HTML inside `.title-plays` after Daily**

```html
<button class="play-btn" id="play-endless" data-cmd="endless" type="button">
  <span class="play-face">
    <span id="play-endless-label">Endless</span>
    <small id="play-endless-sub">Keep winning</small>
  </span>
</button>
<button class="ghost hidden" id="play-endless-fresh" data-cmd="endless-fresh" type="button">New Endless</button>
```

When a wait exists, `renderTitle` sets `#play-endless` `data-cmd="endless-continue"`, label `Continue Endless`, sub `Round ${n}`, shows `#play-endless-fresh`. Match climb: `#play-main` + `#play-fresh`.

Daily screen after the Daily `<ol id="daily-board">`:

```html
<p class="kicker">Endless</p>
<p class="quiet" id="endless-count"></p>
<ol id="endless-board" class="leaderboard"></ol>
```

- [ ] **Step 2: CSS**

Keep `.title-plays` stacking. `#play-endless-fresh` uses the same `.hidden` as `#play-fresh`. `#path.hidden { display: none; }` already used for Daily — reuse.

- [ ] **Step 3: `renderTitle` Endless buttons**

```ts
const eMain = document.getElementById("play-endless");
const eLabel = document.getElementById("play-endless-label");
const eSub = document.getElementById("play-endless-sub");
const eFresh = document.getElementById("play-endless-fresh");
const eSaved = hasEndless();
if (eMain) eMain.setAttribute("data-cmd", eSaved ? "endless-continue" : "endless");
if (eLabel) eLabel.textContent = eSaved ? "Continue Endless" : "Endless";
if (eSub) eSub.textContent = eSaved ? `Round ${loadEndless()?.endlessRound ?? 1}` : "Keep winning";
if (eFresh) eFresh.classList.toggle("hidden", !eSaved);
```

`renderHud`:

```ts
const name =
  this.mode === "daily"
    ? this.dailyLabel
    : this.mode === "endless"
      ? `Round ${this.endlessRound}`
      : (this.pathNames[this.boardIndex] ?? "");
if (path) path.classList.toggle("hidden", this.mode === "daily" || this.mode === "endless");
```

`openDaily` also `fetchEndlessBoard()` into `this.endlessScores` and fill `#endless-board` / `#endless-count` (`Highest rounds on top` / empty copy: `Win boards in Endless and pin how far you got.`). Rows show name + rounds (not moves). Hide button still `data-cmd="report"`.

- [ ] **Step 4: Load `http://localhost:43181/` and confirm title shows Endless without starting a climb**

Expected: Endless button visible; climb Continue unchanged.

- [ ] **Step 5: Commit** (skip unless asked)

---

### Task 6: Game loop — start, remix, pick/drop, pause, pin

**Files:**
- Modify: `src/game/game.ts`
- Modify: `src/game/types.ts` only if `Game.mode` type lives there (it lives on the class: `mode: "run" | "daily"` → add `"endless"`)

**Interfaces:**
- Consumes: all Task 1–5 helpers
- Class fields: `endlessRound = 1`, `clears = 0`, `pendingTake: keyof Laws | null = null`, `endlessScores: EndlessScore[] = []`
- Commands: `endless` → `newEndless()`; `endless-continue` → `continueEndless()`; `endless-fresh` → `newEndless()`; `drop:${id}` on pick screen

- [ ] **Step 1: `newEndless` / `continueEndless` / `persistEndless`**

`newEndless`: `clearEndless()` only (never `clearClimb()`). `mode = "endless"`. `laws = emptyLaws()`. `endlessRound = 1`. `clears = 0`. `pendingTake = null`. `pathNames = climbNames(seed)`. `loadBoard()`. `show("playing")`. `persistEndless()`. No coach (`maybeCoach` stays `mode !== "run"`).

`continueEndless`: mirror `continueClimb` from `loadEndless()`. Restore `endlessRound`, `clears`, `pendingTake`. If `screen === "pick"` show pick (drop UI if `pendingTake`). Do not `queueCloud()`.

`persistEndless`: if `mode !== "endless" || this.end` return. Screens `playing` | `pick` | `pause`. `saveEndless({ ...climb-shaped fields, endlessRound, clears, pendingTake })`. **Do not** call `saveClimb` or `queueCloud`.

Change `persistClimb` guard: keep `if (this.mode !== "run" || this.end) return`.

Call `persistEndless()` from `loadBoard` when endless (replace the `persistClimb()` at end of `loadBoard` with:

```ts
if (this.mode === "endless") this.persistEndless();
else this.persistClimb();
```

- [ ] **Step 2: `loadBoard` spec index + lily + oops + AI**

```ts
const specIndex = this.mode === "endless" ? endlessSpecIndex(this.endlessRound) : this.boardIndex;
const boardRng = new Rng(hashSeed(this.runSeed + specIndex * 104729 + (this.mode === "endless" ? this.endlessRound * 13 : 0)));
const spec = boardSpec(specIndex, this.extraMen(), openKing, boardRng, size);
// lily:
this.mods.lily = null;
if (this.mode === "run" && this.boardIndex >= 2 && this.boardIndex <= 5) {
  this.mods.lily = pickLily(boardRng, this.board, this.mods);
}
if (this.mode === "endless" && endlessLily(this.endlessRound)) {
  this.mods.lily = pickLily(boardRng, this.board, this.mods);
}
this.oopsLeft = this.mode === "daily" ? 2 : 1;
```

Board name log: endless uses `this.pathNames[specIndex] ?? "Endless"`.

`aiStep` skill:

```ts
const skill =
  this.mode === "daily" ? 0.86 : this.mode === "endless" ? endlessSkill(this.endlessRound) : (CLIMB_SKILL[this.boardIndex] ?? 0.95);
```

- [ ] **Step 3: `boardCleared` never Crowns Endless**

Replace the early `finish(true)` condition so Endless always offers a pick (or loads next if pool empty — should not happen with 14 laws and cap 3):

```ts
if (this.mode === "endless") {
  void recordHop({
    kind: "endless-clear",
    title: this.pathNames[endlessSpecIndex(this.endlessRound)] ?? "Endless",
    board: this.endlessRound,
    hops: this.hops,
    moves: this.moves,
    stars: this.meta.notches,
  });
  const pool = unusedLaws(this.laws);
  window.setTimeout(() => {
    this.rng.shuffle(pool);
    this.offers = pool.slice(0, Math.min(3, pool.length));
    this.show("pick");
    this.persistEndless();
  }, 720);
  return;
}
```

Keep existing climb/daily branches.

- [ ] **Step 4: Pick vs drop**

`renderPick`: if `this.mode === "endless" && this.pendingTake`:

```ts
const held = LAW_DEFS.filter((d) => this.laws[d.id]);
const take = LAW_DEFS.find((d) => d.id === this.pendingTake);
box.innerHTML = `
  <p class="kicker">You won the board!</p>
  <h2>Drop one</h2>
  <p class="lead">You already hold three. Drop one to take ${take?.name ?? "the new treat"}.</p>
  <div class="col">
    ${held.map((o) => `<button type="button" class="pick-card" data-cmd="drop:${o.id}">...</button>`).join("")}
  </div>
`;
```

Else existing Pick a power cards. Endless lead: `Choose one treat before round ${this.endlessRound + 1}.`

`command` `law:`: if `mode === "endless"`:

```ts
const taken = endlessTake(this.laws, id);
if (!taken) return;
if (taken.needsDrop) {
  this.pendingTake = id;
  this.renderPick();
  this.persistEndless();
  return;
}
this.getting = true;
void this.playGet(...).then(() => {
  this.laws = taken.laws;
  this.clears += 1;
  this.endlessRound += 1;
  this.pendingTake = null;
  this.loadBoard();
  this.show("playing");
  this.persistEndless();
  this.getting = false;
  this.animating = false;
});
```

`command` `drop:`:

```ts
if (this.mode !== "endless" || this.screen !== "pick" || !this.pendingTake) return;
const next = endlessSwap(this.laws, this.pendingTake, dropId);
if (!next) return; // stay on Drop one
const takeDef = LAW_DEFS.find((d) => d.id === this.pendingTake);
this.getting = true;
void this.playGet(takeDef?.scene ?? "", takeDef?.name ?? "").then(() => {
  this.laws = next;
  this.pendingTake = null;
  this.clears += 1;
  this.endlessRound += 1;
  this.loadBoard();
  this.show("playing");
  this.persistEndless();
  this.getting = false;
  this.animating = false;
});
```

Refuse a fourth law: if `ownedLawIds(this.laws).length > 3` after a swap, do not `loadBoard`; stay on drop.

- [ ] **Step 5: Pause + finish + pin**

`show("pause")` lead: `pauseLead(this.mode === "daily" ? "daily" : this.mode === "endless" ? "endless" : "run")`.

Home from Endless pause: `show("title")` (wait already persisted). Do not `clearEndless`. Do not pin.

`abandon` / lose: `finish(false)`.

`finish` when `mode === "endless"`:

- `clearEndless()`
- Stars: `notchesFromRun` like climb (use `this.hops`)
- `end` with `board: this.clears` (rounds completed)
- `recordHop({ kind: "endless-lose", title: "Endless", board: this.clears, hops, moves, stars })`
- `const pin = endlessPinRounds(this.clears, "lose")` (Give up also `finish(false)` — same pin)
- if `pin != null` `void this.postEndless(pin)`
- keep-save: `shouldOfferKeepSave(!!session, "endless")`

`postEndless`: like `postScore` but `postEndlessScore(loadName(), pin)`. On failure, end copy: shared list did not update. Set `this.posted`.

`renderEnd` Endless branch: kicker `Endless`, h2 `${this.clears} rounds`, lead about the all-time list, `#endless-board` snippet, Play Endless again / Home. Not a Daily win pin form unless you reuse name form — nickname already on title; auto-post like Daily after win if `hasName()`, else small name form “Pin N rounds”. Match Daily honesty: if no name, form; if name, POST immediately in `finish`.

Simplest match to Daily lose (Daily lose does not post): Endless **does** post on lose. If `hasName()`, POST in `finish`. If not, show name form `Pin ${clears} rounds` then POST.

- [ ] **Step 6: Commands on title**

```ts
if (cmd === "endless") { this.newEndless(); return; }
if (cmd === "endless-continue") { this.continueEndless(); return; }
if (cmd === "endless-fresh") { this.newEndless(); return; }
```

`newEndless` while a wait exists is intentional (New Endless).

- [ ] **Step 7: Run `npm test` then playtest on localhost**

Expected tests pass.

Playtest (localhost only):

1. Title: Endless. Start run. Round 1, no lily, climb Continue still present if it was.
2. Clear 3 boards, hold 3 powers. Fourth clear → Drop one. After swap, still 3 chips.
3. Home. Continue Endless. Climb Continue still the old climb.
4. Give up on round 2 after 1 clear → pin 1 if named. 0 clears → no pin.
5. Daily preview still fewest moves; Endless block under it.
6. Wide Pond in kit → 10×10 next board; drop it → 8×8 next.

- [ ] **Step 8: Commit** (skip unless asked)

---

### Task 7: README / STORE

**Files:**
- Modify: `README.md` — one short Endless paragraph (keep winning, three treats, all-time rounds list). Do not promise a boss.
- Modify: `STORE.md` — Endless pins a nickname + round count; still no ads/IAP.

- [ ] **Step 1: Edit the two files** so Endless is named next to Daily and the climb.
- [ ] **Step 2: `npm test`**
- [ ] **Step 3: Commit** (skip unless asked)

---

## Self-review (spec coverage)

| Spec | Task |
| --- | --- |
| 3-slot fill then swap | 1, 6 |
| Warm-up rounds 1–3, remix table, lily from 4 | 1, 6 |
| No boss | (omitted on purpose) |
| Separate climb / Endless waits | 2, 6 |
| Pin on lose/Give up, not Home; ≥1 clear; better replaces | 1, 3, 6 |
| Shared all-time `/api/endless` | 3, 5 |
| How / pause / Privacy / Support copy | 4, 7 |
| Wide Pond size follows kit | 1, 6 |
| Keep-save on Endless end | 4, 6 |
| No hop-book Endless this pass | 6 (`persistEndless` no `queueCloud`) |
| HUD Round N, hide 1–6 path | 5 |
| Super King 7 unspoken; no pip | 4 |
| Tests in `npm test` | 1, 2, 3, 4 |
