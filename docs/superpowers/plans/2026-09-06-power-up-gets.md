# Power-up gets, climb laws, Hop Lily Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Pick a power feel like a get, ship Wide Pond / Nap Time / Back 2 Back with Trapdoor-on-sit and Super King capped at 7, then add Hop Lily and stronger setup holes.

**Architecture:** Keep Vite + TypeScript + DOM. Laws stay on `Laws` / `LAW_DEFS`. Overlay HTML lives in `getScenes.ts`. Turn extras (Back 2 Back, Nap Time, later lily hops) go through one pure `endYouTurn` in `tempo.ts` so `crownCheck`-style tests can lock order without booting `Game`. Board size is `mods.size` (8 or 10); `SIZE` remains the default 8.

**Tech Stack:** Vite, TypeScript, DOM/CSS, `npm test` (`tsc --noEmit`, `crownCheck.ts`, then `powerCheck.ts`). Dev server `npm run dev` on port 43181. Do not run `npm run publish`.

## Global Constraints

- Product title is King Me; package / localStorage / Netlify slug stay `jumpgrave`.
- Maple frog = you (`src/assets/piece-you.svg`); walnut frog = enemy (`src/assets/piece-them.svg`). Teal/copper crowns. Oak pond. No discs, shop, ads, DLC, Skip Jump, or Safe Camp.
- Jump stars only on real captures or pits. Empty diagonals = cream pips. Captures optional.
- Daily never offers climb laws, never becomes 10×10, never gets a Hop Lily.
- `Laws.freeJump` stays unused. Skip Jump stays gone.
- Trapdoor is once per board. Hole is the square the Enemy sat on (`move.capture`), not `move.to`.
- Super King (and enemy flying kings) slide at most 7 squares on any size.
- Motion off: no hop-in cartoons; get overlay is a name stamp only.
- Climb save key stays `jumpgrave-climb-v1`. Do not auto-publish.
- Commit messages: short imperative sentence with a period (repo style).
- Wave 1 must be playable before Wave 2 starts.

**Spec:** `docs/superpowers/specs/2026-09-06-power-up-gets-design.md`

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/game/types.ts` | `Laws` keys, `BoardMods.size` / nap / opening / lily, `boardSize()`, `inBoard(r,c,size)` |
| `src/game/copy.ts` | Short pick/HUD lines; new law sentences; keep long how-to copy |
| `src/game/laws.ts` | `LawDef.scene`; 14 defs; `unusedLaws` |
| `src/game/tempo.ts` | Pure `endYouTurn` / `noteCapture` / `takeLily` |
| `src/game/getScenes.ts` | Overlay markup per `scene` id |
| `src/game/rules.ts` | Size-aware loops, fly cap 7, `trapdoorHole(move)` |
| `src/game/setup.ts` | Scale rows for 10×10, lily pick, dark-square path for holes |
| `src/game/save.ts` | Size from board length; home rows `0..size-1` |
| `src/game/game.ts` | Pick overlay, trapdoor square, tempo, board grid, lily draw |
| `src/game/powerCheck.ts` | New asserts (do not dump everything into `crownCheck.ts`) |
| `src/style.css` | Pick hop-in, get overlay, `#board.size-10`, `.sq.lily` |
| `index.html` | `#get-overlay` host |
| `package.json` | Run `powerCheck.ts` in `npm test` |
| `src/assets/wide-pond-art.png` | Copy from brainstorm mockup if present |

Do not add React. Do not split `game.ts` in this pass unless a task cannot land without a tiny extract (`tempo.ts` / `getScenes.ts` are the extracts).

---

### Task 1: Types, empty defaults, test harness

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/powerCheck.ts`
- Modify: `package.json` (`scripts.test`)

**Interfaces:**
- Consumes: existing `Laws`, `BoardMods`, `emptyLaws()`, `emptyMods()`, `SIZE`, `inBoard`
- Produces: `Laws.widePond`, `Laws.napTime`, `Laws.back2Back`; `BoardMods.size`, `napUsed`, `napPending`, `openingHops`; `boardSize(mods)`; `inBoard(r, c, size?)`

- [ ] **Step 1: Write the failing test**

Create `src/game/powerCheck.ts`:

```ts
/** Run with: node --experimental-strip-types src/game/powerCheck.ts */
import { boardSize, emptyLaws, emptyMods, inBoard } from "./types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const laws = emptyLaws();
assert(laws.widePond === false, "widePond defaults off");
assert(laws.napTime === false, "napTime defaults off");
assert(laws.back2Back === false, "back2Back defaults off");
assert(laws.freeJump === false, "freeJump stays unused");

const mods = emptyMods();
assert(mods.size === 8, "default board size is 8");
assert(mods.napUsed === false, "napUsed defaults false");
assert(mods.napPending === false, "napPending defaults false");
assert(mods.openingHops === 0, "openingHops defaults 0");
assert(boardSize(mods) === 8, "boardSize reads 8");
assert(boardSize({ ...mods, size: 10 }) === 10, "boardSize reads 10");
assert(inBoard(9, 0, 10), "row 9 is on a 10-board");
assert(!inBoard(9, 0, 8), "row 9 is off an 8-board");
assert(!inBoard(8, 0), "inBoard without size still uses 8");

console.log("powerCheck ok");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (`widePond` / `boardSize` missing).

- [ ] **Step 3: Write minimal types**

In `src/game/types.ts`, add to `Laws`:

```ts
  widePond: boolean;
  napTime: boolean;
  back2Back: boolean;
```

Add to `BoardMods` (after `trapdoorUsed`):

```ts
  /** 8 unless Wide Pond made this climb 10×10. */
  size: number;
  napUsed: boolean;
  napPending: boolean;
  /** Remaining Back 2 Back opening hops this board (0 if the law is off). */
  openingHops: number;
```

Replace `inBoard` and add `boardSize`:

```ts
export function boardSize(mods: { size?: number }): number {
  return mods.size === 10 ? 10 : 8;
}

export function inBoard(r: number, c: number, size: number = SIZE): boolean {
  return r >= 0 && c >= 0 && r < size && c < size;
}
```

In `emptyLaws()` add `widePond: false`, `napTime: false`, `back2Back: false`.

In `emptyMods()` add `size: SIZE`, `napUsed: false`, `napPending: false`, `openingHops: 0`.

- [ ] **Step 4: Hook the harness and pass**

In `package.json` `scripts.test`, after `crownCheck.ts` add:

`&& node --experimental-strip-types src/game/powerCheck.ts`

Run: `npm test`

Expected: PASS (`powerCheck ok` in the log). Fix any `Laws` exhaustiveness errors (`tsc --noEmit`) by spreading `emptyLaws()` everywhere that constructs a full `Laws` object by hand.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/powerCheck.ts package.json
git commit -m "Add climb law flags and board size on mods."
```

---

### Task 2: Pick / HUD copy and registry scenes

**Files:**
- Modify: `src/game/copy.ts`
- Modify: `src/game/laws.ts`

**Interfaces:**
- Consumes: `Laws` keys from Task 1
- Produces: `LawDef.scene: string`; `LAW_DEFS` length 14; names/descriptions below; `PICK_*` short strings

Pick / HUD copy (use these exact strings on cards and the climb HUD):

| `id` | `name` | `desc` | `scene` |
| --- | --- | --- | --- |
| `backJump` | Jump Back | Player may hop backwards | `backJump` |
| `flyingKings` | Super King | Player's king may move up to 7 spaces at once. | `flyingKings` |
| `recruit` | Buddy Up | Player gets a new piece after an enemy is captured | `recruit` |
| `lastRites` | Second Chance | If player loses, one king comes back to join the player | `lastRites` |
| `openKing` | Starting King | One player piece starts as a King | `openKing` |
| `extraMan` | Extra Piece | Player gets one extra piece to start | `extraMan` |
| `hopCrown` | Hop Party | Every 4 enemy captures creates a king for the player | `hopCrown` |
| `farJump` | Far Jump | One non-king piece may jump further each turn | `farJump` |
| `doubleCrown` | Double Crown | When a player piece becomes king, a non-king next to it becomes king. | `doubleCrown` |
| `trapdoor` | Trapdoor | When a piece is captured, that space becomes a hole | `trapdoor` |
| `scout` | Scout | One player piece begins closer to the middle of the board | `scout` |
| `widePond` | Wide Pond | Boards are now 10x10 | `widePond` |
| `napTime` | Nap Time | The enemy falls asleep for one turn | `napTime` |
| `back2Back` | Back 2 Back | Player begins with 2 moves | `back2Back` |

Keep the longer `JUMP_BACK_YOU_DESC` / `OPEN_KING_YOU_DESC` / `TRAPDOOR_DESC` / etc. for how-to and Daily enemy cards. Do not point `LAW_DEFS.desc` at those long strings anymore.

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { LAW_DEFS, unusedLaws } from "./laws.ts";

assert(LAW_DEFS.length === 14, "fourteen climb powers");
assert(LAW_DEFS.every((d) => d.scene === d.id), "scene id matches law id");
const names = LAW_DEFS.map((d) => d.name);
assert(names.includes("Starting King"), "Start as King renamed Starting King");
assert(!names.includes("Start as King"), "old Start as King name is gone");
assert(names.includes("Wide Pond"), "Wide Pond is in the pool");
assert(names.includes("Nap Time"), "Nap Time is in the pool");
assert(names.includes("Back 2 Back"), "Back 2 Back is in the pool");
const superKing = LAW_DEFS.find((d) => d.id === "flyingKings")!;
assert(superKing.desc.includes("7"), "Super King card says 7");
const owned = { ...emptyLaws(), backJump: true };
assert(
  unusedLaws(owned).every((d) => d.id !== "backJump"),
  "owned laws drop out of the pick pool",
);
assert(unusedLaws(emptyLaws()).length === 14, "fresh climb can offer all fourteen");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (`scene` missing and/or still 11 defs).

- [ ] **Step 3: Copy + LAW_DEFS**

In `src/game/copy.ts` add:

```ts
export const PICK_JUMP_BACK = "Player may hop backwards";
export const PICK_SUPER_KING = "Player's king may move up to 7 spaces at once.";
export const PICK_BUDDY_UP = "Player gets a new piece after an enemy is captured";
export const PICK_SECOND_CHANCE = "If player loses, one king comes back to join the player";
export const PICK_STARTING_KING = "One player piece starts as a King";
export const PICK_EXTRA_PIECE = "Player gets one extra piece to start";
export const PICK_HOP_PARTY = "Every 4 enemy captures creates a king for the player";
export const PICK_FAR_JUMP = "One non-king piece may jump further each turn";
export const PICK_DOUBLE_CROWN = "When a player piece becomes king, a non-king next to it becomes king.";
export const PICK_TRAPDOOR = "When a piece is captured, that space becomes a hole";
export const PICK_SCOUT = "One player piece begins closer to the middle of the board";
export const PICK_WIDE_POND = "Boards are now 10x10";
export const PICK_NAP_TIME = "The enemy falls asleep for one turn";
export const PICK_BACK_2_BACK = "Player begins with 2 moves";
```

Update `TRAPDOOR_DESC` (how-to / longer) so it matches the new rule even if Daily never offers Trapdoor as a law:

```ts
export const TRAPDOOR_DESC =
  "Once this board, after you capture, the square the Enemy sat on becomes a hole. Nobody may sit there. Jump over it onto the star past it.";
```

In `src/game/laws.ts`:

```ts
export interface LawDef {
  id: keyof Laws;
  name: string;
  desc: string;
  icon: string;
  scene: string;
}
```

Set each existing def’s `desc` to the matching `PICK_*`, `name: "Starting King"` for `openKing`, `scene` equal to `id`. Append:

```ts
  { id: "widePond", name: "Wide Pond", desc: PICK_WIDE_POND, icon: "🏞️", scene: "widePond" },
  { id: "napTime", name: "Nap Time", desc: PICK_NAP_TIME, icon: "😴", scene: "napTime" },
  { id: "back2Back", name: "Back 2 Back", desc: PICK_BACK_2_BACK, icon: "✌️", scene: "back2Back" },
```

`keyof Laws` includes `freeJump`. Do **not** add a `LAW_DEFS` entry for `freeJump`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/copy.ts src/game/laws.ts src/game/powerCheck.ts
git commit -m "Shorten pick copy and register three climb powers."
```

---

### Task 3: Size-aware rules and Super King cap 7

**Files:**
- Modify: `src/game/types.ts` (`BoardSetup.size?` if missing)
- Modify: `src/game/rules.ts` (`campsFromRows`, `modsFromSpec`, `manStep`, `backRow`, `playable`, `piecesOf`, `addSlide`, `setupBoard`, `crownSide`, `recruitMan`, `reviveKing`)
- Modify: `src/game/powerCheck.ts`
- Modify: `src/game/crownCheck.ts` only if a SIZE loop breaks 8×8 tests

**Interfaces:**
- Consumes: `boardSize()`, `inBoard(r,c,size)`
- Produces: `campsFromRows(youRows, themRows, size?)`; `playable` uses `boardSize(mods)`; `FLY_SLIDE_MAX = 7`; `setupBoard` builds `spec.size ?? 8` rows

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import {
  campsFromRows,
  legalMoves,
  setupBoard,
  wouldCrown,
  type Board,
} from "./rules.ts";
import { SIZE } from "./types.ts";
import type { Piece } from "./types.ts";

function blankSize(n: number): Board {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => null));
}

const tenCamps = campsFromRows([9, 8], [0, 1], 10);
assert(tenCamps.youKingRow === 0, "10-board: you still king on the far top");
assert(tenCamps.themKingRow === 9, "10-board: Enemy kings on row 9");
assert(wouldCrown("you", 0, { ...emptyMods(), size: 10, ...tenCamps }), "you crown on row 0 of a 10-board");
assert(!wouldCrown("you", 9, { ...emptyMods(), size: 10, ...tenCamps }), "you do not crown on your 10-board home");
assert(wouldCrown("them", 9, { ...emptyMods(), size: 10, ...tenCamps }), "Enemy crowns on row 9");

const fly = { ...emptyLaws(), flyingKings: true };
const ten = { ...emptyMods(), size: 10, ...tenCamps };
let b = blankSize(10);
b[9]![0] = { id: 1, side: "you", king: true } satisfies Piece;
const slides = legalMoves(b, "you", fly, null, ten, true);
assert(slides.some((m) => m.to.r === 2 && m.to.c === 7), "Super King can slide 7 on a 10-board");
assert(
  slides.every((m) => Math.max(Math.abs(m.to.r - 9), Math.abs(m.to.c - 0)) <= 7),
  "Super King never slides 8+ empty squares",
);
assert(!slides.some((m) => m.to.r === 0 && m.to.c === 9), "9-square king ride is illegal");

const spec8 = {
  you: 1,
  them: 1,
  youRows: [7, 6],
  themRows: [0, 1],
  themKings: 0,
  openKing: false,
  holes: [],
  bounce: false,
  themFly: false,
  blurb: "",
  feltMods: [],
  size: 8 as const,
};
const laid8 = setupBoard(spec8, () => 1);
assert(laid8.length === 8, "setupBoard default size 8");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (`campsFromRows` third arg and/or king still slides past 7).

- [ ] **Step 3: Size + fly cap**

Add optional `size?: number` to `BoardSetup` in `types.ts`.

In `rules.ts`:

```ts
export const FLY_SLIDE_MAX = 7;
```

Change `campsFromRows` to take `size = SIZE` and use `size` everywhere it currently uses `SIZE` (mid, king rows).

`modsFromSpec` must pass `boardSize({ ...emptyMods(), ...extra, size: extra.size })` (or `extra.size ?? SIZE`) into `campsFromRows`.

`manStep`: `goal < boardSize(mods) / 2 ? -1 : 1`.

`backRow`: `manStep(side, mods) < 0 ? boardSize(mods) - 1 : 0`.

`playable`: `inBoard(r, c, boardSize(mods)) && isDark(r, c) && !isHole(mods, r, c)`.

`piecesOf`, `setupBoard`, `crownSide`, `recruitMan`, `reviveKing`: loop `board.length` or `boardSize(mods)`, never a hardcoded 8 when `mods.size === 10`.

`addSlide` flying branch:

```ts
const size = boardSize(mods);
for (const d of ALL) {
  for (let k = 1; k <= FLY_SLIDE_MAX; k++) {
    const r = from.r + d.r * k;
    const c = from.c + d.c * k;
    if (!inBoard(r, c, size) || !isDark(r, c)) break;
    if (isHole(mods, r, c)) continue;
    if (board[r]![c]) break;
    out.push({ from, to: { r, c } });
  }
}
```

`setupBoard`: `const size = spec.size === 10 ? 10 : SIZE;` then allocate `size`×`size`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS. Existing `crownCheck` Super King / race tests still pass on 8×8.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/rules.ts src/game/powerCheck.ts src/game/crownCheck.ts
git commit -m "Cap Super King at 7 and honor board size."
```

---

### Task 4: Trapdoor holes the Enemy’s square

**Files:**
- Modify: `src/game/rules.ts`
- Modify: `src/game/game.ts` (trapdoor block ~1382)
- Modify: `src/game/crownCheck.ts` (landing-hole asserts ~211–217)
- Modify: `src/game/powerCheck.ts`

**Interfaces:**
- Consumes: `Move.capture`
- Produces: `trapdoorHole(move: Move): Pos | null` — `move.capture` if present, else `null`

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { applyMove, trapdoorHole } from "./rules.ts";

const take = { from: { r: 5, c: 2 }, to: { r: 3, c: 4 }, capture: { r: 4, c: 3 } };
assert(trapdoorHole(take)?.r === 4 && trapdoorHole(take)?.c === 3, "hole is where the Enemy sat");
assert(trapdoorHole({ from: { r: 5, c: 2 }, to: { r: 4, c: 3 } }) == null, "slides make no trapdoor");
```

In `src/game/crownCheck.ts` change the Trapdoor block so it asserts the **capture** square `{ r: 4, c: 3 }`, not the landing `{ r: 3, c: 4 }`. Keep “the capturer sits on the landing.” Update the log/assert strings to say sit-square.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (`trapdoorHole` is not exported).

- [ ] **Step 3: Implement**

In `rules.ts`:

```ts
export function trapdoorHole(move: Move): Pos | null {
  return move.capture ?? null;
}
```

In `game.ts` replace the trapdoor hole push:

```ts
const pit = trapdoorHole(move);
if (this.laws.trapdoor && !this.mods.trapdoorUsed && pit) {
  this.mods.holes = [...this.mods.holes, { r: pit.r, c: pit.c }];
  this.mods.trapdoorUsed = true;
  this.pushLog("Trapdoor! That square is a hole now.");
}
```

Import `trapdoorHole` from `./rules.ts`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/rules.ts src/game/game.ts src/game/crownCheck.ts src/game/powerCheck.ts
git commit -m "Put the Trapdoor hole on the captured square."
```

---

### Task 5: Wide Pond boards (10×10 setup, CSS, save)

**Files:**
- Modify: `src/game/setup.ts` (`darkPlayable`, `inLane`, `boardSpec`, `firstHop` row lists)
- Modify: `src/game/save.ts` (`asRows`, `campsForSave`)
- Modify: `src/game/game.ts` (`loadBoard`, `renderBoard`)
- Modify: `src/style.css`
- Modify: `src/game/powerCheck.ts`

**Interfaces:**
- Consumes: `Laws.widePond`, `boardSize`, `setupBoard` size
- Produces: `scaleRowsForSize(rows, size)`, `holeBand(size)`, `boardSpec(..., size?)` returning `BoardSetup.size`; climb `loadBoard` sets `mods.size` to 10 when `laws.widePond`

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { boardSpec, scaleRowsForSize } from "./setup.ts";
import { Rng } from "./rng.ts";
import { modsFromSpec } from "./rules.ts";

assert(scaleRowsForSize([7, 6], 10).join(",") === "9,8", "bottom home rows shift on 10");
assert(scaleRowsForSize([0, 1, 2], 10).join(",") === "0,1,2", "top rows stay");
assert(scaleRowsForSize([7, 6], 8).join(",") === "7,6", "8-board rows unchanged");

const spec10 = boardSpec(1, 0, false, new Rng(99), 10);
assert(spec10.size === 10, "boardSpec stores size 10");
assert(spec10.youRows.every((r) => r <= 9), "you rows fit a 10-board");
const laid10 = setupBoard(spec10, () => 1);
assert(laid10.length === 10 && laid10[0]!.length === 10, "laid 10×10");
const m10 = modsFromSpec(spec10, { size: 10 });
assert(m10.size === 10, "mods keep size 10");
assert(m10.themKingRow === 9 || m10.youKingRow === 9, "one far edge is row 9");
```

Remove the `assert.deepEqual?.["skip"];` line — that is a reminder not to leave it in. Use `join` as above.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (`scaleRowsForSize` / extra `boardSpec` arg missing).

- [ ] **Step 3: Setup + save + render**

`src/game/setup.ts`:

```ts
export function scaleRowsForSize(rows: number[], size: number): number[] {
  if (size === 8) return rows.slice();
  const delta = size - 8;
  return rows.map((r) => (r >= 4 ? r + delta : r));
}

export function holeBand(size: number): number[] {
  const last = size - 3;
  const out: number[] = [];
  for (let r = 2; r <= last; r++) out.push(r);
  return out;
}
```

`darkPlayable(rows, holes = [], size = 8)`: loop `c` from `0` to `size - 1`.

`inLane(p, lane, size = 8)`:

```ts
const split = size / 2;
if (lane === "left") return p.c < split;
if (lane === "right") return p.c >= split;
if (lane === "center") return p.c >= split - 2 && p.c <= split + 1;
return true;
```

`pickSpots` / `pickSafeHoles` / `unstickHoles` / `pickHoles`: pass `boardSize(mods)` (or the `size` argument) into `darkPlayable` and use `holeBand(size)` instead of `[2,3,4,5]`.

`boardSpec(index, extraYou, openKing, rng, size = 8)`: after choosing `youRows` / `themRows` (including First Hop `[7,6]` / `[0,1]`), set `youRows = scaleRowsForSize(youRows, size)` and the same for `themRows`. Set `size` on the returned spec. `setupBoard(draft)` must see `draft.size`.

`loadBoard` in `game.ts`:

```ts
const size = this.laws.widePond ? 10 : 8;
const spec = boardSpec(this.boardIndex, this.extraMen(), openKing, boardRng, size);
this.mods = modsFromSpec(spec, { size });
if (this.laws.back2Back) this.mods.openingHops = 2;
```

(Opening hops also land in Task 6; setting them here is fine if Task 6 tests assume `loadBoard` — if Task 6 is next, you may leave `openingHops` for Task 6.)

`renderBoard`: `const n = boardSize(this.mods);` loop `r,c < n`. Toggle class `size-10` on `#board` when `n === 10`.

`src/style.css`:

```css
#board.size-10 {
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
}
```

`save.ts` `asRows(v, fallback, size = SIZE)`: keep rows with `n >= 0 && n < size`.

`campsForSave`: infer `size` from `p.board.length` when loading (10 if the packed board has 10 rows, else 8). Stop clamping king rows with `=== SIZE - 1` only; use `size - 1`. Spread loaded `mods.size`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/setup.ts src/game/save.ts src/game/game.ts src/style.css src/game/powerCheck.ts src/game/types.ts
git commit -m "Deal Wide Pond as a 10 by 10 climb board."
```

---

### Task 6: Nap Time and Back 2 Back tempo

**Files:**
- Create: `src/game/tempo.ts`
- Modify: `src/game/game.ts` (`afterYou`, `playYou` capture path, `loadBoard`)
- Modify: `src/game/powerCheck.ts`

**Interfaces:**
- Consumes: `BoardMods.openingHops`, `napPending`, `napUsed`; `Laws.napTime`, `Laws.back2Back`
- Produces:

```ts
export interface YouBurst {
  lilyHops: number;
  openingHops: number;
  napPending: boolean;
  napUsed: boolean;
}

export function burstFromMods(mods: BoardMods): YouBurst;
export function applyBurst(mods: BoardMods, burst: YouBurst): void;
export function noteCapture(burst: YouBurst, napLaw: boolean): YouBurst;
export function endYouTurn(
  burst: YouBurst,
  opts: { tookLily?: boolean },
): { burst: YouBurst; next: "you" | "them" };
```

Wave 1 never sets `tookLily`. Keep `lilyHops` on the struct (always 0) so Wave 2 does not rewrite the signature.

Tempo after a maple turn whose combo/Skip jump is done:

1. If `tookLily`, set `lilyHops = 2` and if `openingHops > 0` decrement opening (landing counts). Return `"you"` while `lilyHops > 0` or leftover opening or nap.
2. Else if `lilyHops > 0`, decrement lily; stay `"you"` if lily, leftover opening, or nap remain.
3. Else if `openingHops > 0`, decrement; stay `"you"` if opening remains, else nap-or-them.
4. Else if `napPending`, clear it, set `napUsed`, return `"you"` (Enemy skipped).
5. Else `"them"`.

Do not refill opening hops. Pit leaps and quiet slides do not call `noteCapture`.

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { endYouTurn, noteCapture, type YouBurst } from "./tempo.ts";

function burst(p: Partial<YouBurst> = {}): YouBurst {
  return {
    lilyHops: 0,
    openingHops: 0,
    napPending: false,
    napUsed: false,
    ...p,
  };
}

let n = endYouTurn(burst({ openingHops: 2 }), {});
assert(n.next === "you" && n.burst.openingHops === 1, "Back 2 Back: first hop then you again");
n = endYouTurn(n.burst, {});
assert(n.next === "them" && n.burst.openingHops === 0, "Back 2 Back: second hop then Enemy");

let nap = noteCapture(burst(), true);
assert(nap.napPending, "capture arms Nap Time");
nap = noteCapture(nap, true);
assert(nap.napPending && !nap.napUsed, "second capture does not bank another nap");
n = endYouTurn(nap, {});
assert(n.next === "you" && n.burst.napUsed && !n.burst.napPending, "Enemy skips once, then you");
n = endYouTurn(n.burst, {});
assert(n.next === "them", "after the skip, Enemy plays");

const slide = noteCapture(burst(), false);
assert(!slide.napPending, "no nap law means no skip");

n = endYouTurn(burst({ openingHops: 2 }), { tookLily: true });
assert(n.next === "you" && n.burst.lilyHops === 2 && n.burst.openingHops === 1, "lily grant after landing; leftover opening");
n = endYouTurn(n.burst, {});
assert(n.burst.lilyHops === 1 && n.burst.openingHops === 1, "first lily extra");
n = endYouTurn(n.burst, {});
assert(n.burst.lilyHops === 0 && n.next === "you" && n.burst.openingHops === 1, "then leftover Back 2 Back");
n = endYouTurn(n.burst, {});
assert(n.next === "them" && n.burst.openingHops === 0, "then Enemy");
```

The lily asserts are Wave 2 rules. Implementing them in `endYouTurn` now is required so Wave 2 only wires landing. If you stub `tookLily` as ignored, the last block fails — implement the full function in this task.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (module missing).

- [ ] **Step 3: tempo.ts + afterYou**

Create `src/game/tempo.ts`:

```ts
import type { BoardMods } from "./types.ts";

export interface YouBurst {
  lilyHops: number;
  openingHops: number;
  napPending: boolean;
  napUsed: boolean;
}

export function burstFromMods(mods: BoardMods): YouBurst {
  return {
    lilyHops: mods.lilyHops ?? 0,
    openingHops: mods.openingHops,
    napPending: mods.napPending,
    napUsed: mods.napUsed,
  };
}

export function applyBurst(mods: BoardMods, burst: YouBurst): void {
  mods.lilyHops = burst.lilyHops;
  mods.openingHops = burst.openingHops;
  mods.napPending = burst.napPending;
  mods.napUsed = burst.napUsed;
}

export function noteCapture(burst: YouBurst, napLaw: boolean): YouBurst {
  if (!napLaw || burst.napUsed || burst.napPending) return burst;
  return { ...burst, napPending: true };
}

export function takeLily(burst: YouBurst): YouBurst {
  return { ...burst, lilyHops: 2 };
}

function handoff(burst: YouBurst): { burst: YouBurst; next: "you" | "them" } {
  if (burst.napPending) {
    return { burst: { ...burst, napPending: false, napUsed: true }, next: "you" };
  }
  return { burst, next: "them" };
}

export function endYouTurn(
  burst: YouBurst,
  opts: { tookLily?: boolean } = {},
): { burst: YouBurst; next: "you" | "them" } {
  let b = { ...burst };
  if (opts.tookLily) {
    b = takeLily(b);
    if (b.openingHops > 0) b = { ...b, openingHops: b.openingHops - 1 };
    if (b.lilyHops > 0 || b.openingHops > 0) return { burst: b, next: "you" };
    return handoff(b);
  }
  if (b.lilyHops > 0) {
    b = { ...b, lilyHops: b.lilyHops - 1 };
    if (b.lilyHops > 0 || b.openingHops > 0) return { burst: b, next: "you" };
    return handoff(b);
  }
  if (b.openingHops > 0) {
    b = { ...b, openingHops: b.openingHops - 1 };
    if (b.openingHops > 0) return { burst: b, next: "you" };
    return handoff(b);
  }
  return handoff(b);
}
```

Add `lily: Pos | null` and `lilyHops: number` to `BoardMods` / `emptyMods()` here (`lily: null`, `lilyHops: 0`).

In `game.ts` `loadBoard`, after `modsFromSpec`:

```ts
if (this.laws.back2Back) this.mods.openingHops = 2;
this.mods.napUsed = false;
this.mods.napPending = false;
this.mods.lilyHops = 0;
```

Add `lily: null` and `lilyHops: 0` to `BoardMods` / `emptyMods()` in this task if they are not there yet, so `applyBurst` can write them. Task 9 only *places* the lily.

On capture in `playYou` (not `overHole`):

```ts
if (move.capture) {
  const burst = noteCapture(burstFromMods(this.mods), this.laws.napTime);
  applyBurst(this.mods, burst);
}
```

At the end of `playYou` when it currently calls `this.afterYou()` (combo over):

```ts
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
```

Keep `afterYou()` as the Enemy handoff (chase, outcome, `scheduleAi`). Do not call `endYouTurn` twice.

Oops already clones `snapshotMods`; ensure those four fields copy with the rest of `BoardMods`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/tempo.ts src/game/game.ts src/game/powerCheck.ts src/game/types.ts
git commit -m "Give Nap Time and Back 2 Back a turn order."
```

---

### Task 7: Pick juice, get overlay, fourteen scenes

**Files:**
- Create: `src/game/getScenes.ts`
- Modify: `index.html` (add `#get-overlay` inside `#frame`)
- Modify: `src/style.css`
- Modify: `src/game/game.ts` (`renderPick`, `command` `law:`)
- Modify: `src/game/powerCheck.ts`
- Copy if present: `.superpowers/brainstorm/visual-1/content/wide-pond-art.png` → `src/assets/wide-pond-art.png`

**Interfaces:**
- Consumes: `LawDef.scene`, `LAW_DEFS`
- Produces: `sceneMarkup(scene: string, name: string): string`; overlay stamp **YOU GOT [NAME]!**; Back 2 Back stamp spelling **BACK 2 BACK**

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { sceneMarkup } from "./getScenes.ts";

for (const d of LAW_DEFS) {
  const html = sceneMarkup(d.scene, d.name);
  assert(html.includes("YOU GOT"), `${d.id} stamps YOU GOT`);
  assert(html.includes(d.id === "back2Back" ? "BACK 2 BACK" : d.name.toUpperCase()) || html.includes(d.name), `${d.id} shows the name`);
}
assert(sceneMarkup("missing", "Trapdoor").includes("YOU GOT TRAPDOOR"), "unknown scene still stamps");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL (`getScenes.ts` missing).

- [ ] **Step 3: Scenes + overlay + pick CSS**

`getScenes.ts` is imported by `powerCheck.ts` (Node, not Vite). Do **not** `import` `.png` or `?raw` SVG. Copy the markup from `src/assets/piece-you.svg` and `piece-them.svg` into string constants `MAPLE_SVG` and `WALNUT_SVG`. Wide Pond painting is a CSS background on `.get-wide-art` (`url("./assets/wide-pond-art.png")` in `style.css`) so Node tests never load the file.

```ts
function poster(scene: string, stamp: string, body: string): string {
  return `<div class="get-poster get-${scene}" role="dialog" aria-live="assertive">
    <div class="get-art">${body}</div>
    <p class="get-stamp">YOU GOT ${stamp}!</p>
  </div>`;
}

function frog(svg: string, extra = ""): string {
  return `<span class="get-frog ${extra}">${svg}</span>`;
}

export function sceneMarkup(scene: string, name: string): string {
  const stamp = scene === "back2Back" ? "BACK 2 BACK" : name.toUpperCase();
  const you = frog(MAPLE_SVG);
  const them = frog(WALNUT_SVG);
  const sleep = frog(WALNUT_SVG, "asleep");
  const king = frog(MAPLE_SVG, "crowned");
  const art: Record<string, string> = {
    backJump: `<div class="get-felt">${you}<i class="pip n"></i><i class="pip e"></i><i class="pip s"></i><i class="pip w"></i></div>`,
    flyingKings: `<div class="get-felt long"><i class="slide"></i>${king}</div>`,
    recruit: `<div class="get-felt row">${you}${frog(MAPLE_SVG, "wave")}</div>`,
    lastRites: `<div class="get-felt far">${king}</div>`,
    openKing: `<div class="get-felt">${king}</div>`,
    extraMan: `<div class="get-felt extra">${you}${you}</div>`,
    hopCrown: `<div class="get-felt party"><i class="spark"></i>${king}</div>`,
    farJump: `<div class="get-felt leap">${you}${them}<i class="star"></i></div>`,
    doubleCrown: `<div class="get-felt">${king}${king}</div>`,
    trapdoor: `<div class="get-felt pit"><i class="hole"></i><i class="star"></i>${you}</div>`,
    scout: `<div class="get-felt mid">${you}</div>`,
    widePond: `<figure class="get-wide-frame"><div class="get-wide-art" role="img"></div></figure>`,
    napTime: `<div class="get-felt sleep">${sleep}${sleep}<i class="zzz">Zzz</i></div>`,
    back2Back: `<div class="get-felt pair"><i class="ring"></i>${you}${you}<b class="times">×2</b><i class="star"></i></div>`,
  };
  return poster(scene, stamp, art[scene] ?? "");
}
```

No shared “frog hops in a circle” clip. Closed-eye sleep is CSS on `.get-frog.asleep`. `.get-frog.crowned::after` is the teal/copper crown, not a gold halo on the play board. Copy `wide-pond-art.png` into `src/assets/` when it exists so the CSS background paints.

`index.html` inside `#frame`:

```html
<div id="get-overlay" class="hidden" aria-hidden="true"></div>
```

`style.css` (append): overlay `position:absolute; inset:0; z-index:40`; pond-night background; `.get-stamp` uses Mochiy Pop One; body Zen Maru Gothic; ~2s is timing in JS not CSS required.

Pick cards in `renderPick`:

```html
<button type="button" class="pick-card" data-cmd="law:${o.id}" style="animation-delay:${i * 70}ms">
  <span class="pick-icon">${o.icon}</span>
  <b class="mod-head">${o.name}</b>
  <small class="mod-desc">${o.desc}</small>
</button>
```

CSS `.pick-card` hop-in (`@keyframes pick-hop`), squash `:active { transform: scale(0.94, 1.06); }`. `html.calm .pick-card { animation: none; }`.

`command("law:")`:

```ts
if (this.screen === "pick" && id in this.laws) {
  this.laws[id] = true;
  const def = LAW_DEFS.find((d) => d.id === id);
  void this.playGet(def?.scene ?? "", def?.name ?? id).then(() => {
    this.boardIndex += 1;
    this.loadBoard();
    this.show("playing");
    this.persistClimb();
  });
}
```

```ts
private async playGet(scene: string, name: string): Promise<void> {
  const host = document.getElementById("get-overlay");
  if (!host) return;
  const stamp = scene === "back2Back" ? "BACK 2 BACK" : name.toUpperCase();
  if (this.meta.reduceMotion) {
    host.innerHTML = `<p class="get-stamp">${`YOU GOT ${stamp}!`}</p>`;
    host.classList.remove("hidden");
    this.audio.fanfare();
    await new Promise((r) => setTimeout(r, 700));
    host.classList.add("hidden");
    host.innerHTML = "";
    return;
  }
  host.innerHTML = sceneMarkup(scene, name);
  host.classList.remove("hidden");
  this.audio.fanfare();
  await new Promise((r) => setTimeout(r, 2000));
  host.classList.add("hidden");
  host.innerHTML = "";
}
```

Ignore extra taps while overlay is up (`this.animating = true` or a `this.getting` flag). Native back on pick still no-ops. Continue still saves `screen: "pick"`.

Do not offer a law in pick until its rules exist — Tasks 3–6 already wired Wide Pond / Nap / Back 2 Back / Trapdoor / Super King.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/getScenes.ts src/game/game.ts src/style.css index.html src/game/powerCheck.ts src/assets/wide-pond-art.png
git commit -m "Play a get scene when a climb power is picked."
```

---

### Task 8: Wave 1 browser check

**Files:** none required unless a bug is found.

- [ ] **Step 1: Run `npm test`**

Expected: PASS.

- [ ] **Step 2: Play on 43181**

`npm run dev` (port 43181). New climb, clear a board (or debug jump to pick if one exists). Confirm:

- Empty-direction pips stay cream; stars only on captures/pits.
- Pick cards hop in; press squashes.
- Each of several powers shows its own picture (or name stamp if Motion off), then the next board.
- Wide Pond next board is 10×10; Super King does not ride 8+; Trapdoor hole is the walnut’s square.
- Daily is still 8×8 and has no pick.
- Continue on the pick screen still resumes.

Do not publish.

- [ ] **Step 3: Commit only if you fixed bugs**

```bash
git commit -m "Fix pick overlay issues found in play."
```

Wave 1 is done. Stop here if the user only asked for gets + three powers.

---

### Task 9: Hop Lily placement (Wave 2)

**Files:**
- Modify: `src/game/setup.ts` (`pickLily`)
- Modify: `src/game/game.ts` (`loadBoard`, `renderBoard`)
- Modify: `src/style.css` (`.sq.lily`)
- Modify: `src/game/powerCheck.ts`
- Modify: `src/game/types.ts` only if Task 6 missed `lily` / `lilyHops`
- Modify: `src/game/daily.ts` only if it would accidentally place a lily (it must not)

**Interfaces:**
- Consumes: `boardIndex`, `mode`, `holeBand`, `boardSize`
- Produces: `pickLily(rng, board, mods): Pos | null`; `mods.lily`; HUD name **Hop Lily**, line **Hop on: 2 extra hops.**

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { pickLily } from "./setup.ts";

const open = blankSize(8);
const base = { ...emptyMods(), holes: [{ r: 3, c: 4 }] };
const lily = pickLily(new Rng(1), open, base);
assert(lily, "an empty 8-board gets a lily");
assert(isDark(lily!.r, lily!.c), "lily sits on dark");
assert(!(lily!.r === 3 && lily!.c === 4), "lily is not a hole");

const packed = blankSize(8);
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    if (isDark(r, c) && !(r === 7 && c === 0)) packed[r]![c] = { id: 1, side: "them", king: false };
  }
}
const fallback = pickLily(new Rng(2), packed, emptyMods());
assert(fallback && fallback.r === 7 && fallback.c === 0, "if mid is full, any empty dark");
```

Also: `emptyMods().lily == null` and `lilyHops === 0`.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL (`pickLily` / `lily` missing).

- [ ] **Step 3: Place and draw**

`emptyMods`: `lily: null`, `lilyHops: 0`.

```ts
export function pickLily(rng: Rng, board: Board, mods: BoardMods): Pos | null {
  const size = boardSize(mods);
  const emptyDark = (rows: number[]): Pos[] =>
    darkPlayable(rows, mods.holes, size).filter((p) => !at(board, p));
  const mid = emptyDark(holeBand(size));
  rng.shuffle(mid);
  if (mid[0]) return mid[0];
  const rows = Array.from({ length: size }, (_, r) => r);
  const any = emptyDark(rows);
  rng.shuffle(any);
  return any[0] ?? null;
}
```

`loadBoard`: if `this.mode === "run" && this.boardIndex >= 2 && this.boardIndex <= 5`, `this.mods.lily = pickLily(boardRng, this.board, this.mods)` after pieces exist (`applyStartLaws` first). Daily: `lily = null`.

`renderBoard`: if `mods.lily` matches the cell, add class `lily` even when a walnut sits there. Pickup juice is Task 10.

CSS: a small pond lily on the square (not a third frog). `html.calm .sq.lily` still visible, no sparkle.

Climb HUD: if `mods.lily` or `lilyHops > 0`, show a card “Hop Lily” / “Hop on: 2 extra hops.” Not a `LAW_DEFS` entry.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/setup.ts src/game/game.ts src/style.css src/game/powerCheck.ts
git commit -m "Sit a Hop Lily on climb boards three through six."
```

---

### Task 10: Hop Lily landing and juice (Wave 2)

**Files:**
- Modify: `src/game/game.ts` (landing, pickup class, `afterYou` already uses `tookLily`)
- Modify: `src/style.css` (squash + pip; `html.calm` skips sparkle)
- Modify: `src/game/powerCheck.ts` if you add a small `takeLily` persist helper test

**Interfaces:**
- Consumes: `endYouTurn(..., { tookLily })`, `mods.lily`
- Produces: maple hop or king slide onto `lily` clears `lily`, grants 2 extras via tempo; walnut landing does not clear it

Task 6 already tested leftover Back 2 Back and Nap after lily. This task only wires the board.

- [ ] **Step 1: Write the failing test**

If `takeLily` is not already in `tempo.ts`, add and test:

```ts
import { takeLily } from "./tempo.ts";
const g = takeLily(burst());
assert(g.lilyHops === 2, "takeLily grants two");
```

If Task 6 already covers `tookLily`, skip a new assert and go to implementation.

- [ ] **Step 2: Run test to verify it fails only if you added `takeLily`**

- [ ] **Step 3: Wire landing**

In `playYou`, after `applyMove`, if `this.turn` maple and `this.mods.lily` and `samePos(move.to, this.mods.lily)`:

```ts
this.mods.lily = null;
```

Pass `tookLily: true` into `endYouTurn` only for **you**, never for Enemy. Enemy on the lily square: leave `mods.lily` set.

Pickup: add `just-lily` on the landing `.man` for ~400ms (reuse `just-landed` squash). Cheer optional `"Hop Lily!"` — no `#get-overlay`, no fanfare. `html.calm`: skip extra animation.

Persist `lily` + `lilyHops` through `persistClimb` (mods already packed). Oops uses `snapshotMods`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/game.ts src/style.css src/game/tempo.ts src/game/powerCheck.ts
git commit -m "Grant two extra hops when maple lands on the lily."
```

---

### Task 11: Setup hole path to the far rank (Wave 2)

**Files:**
- Modify: `src/game/setup.ts` (`pickSafeHoles`, `unstickHoles`)
- Modify: `src/game/powerCheck.ts`
- Modify: `src/game/crownCheck.ts` only if existing unstick asserts need a path that still has a legal step

**Interfaces:**
- Consumes: `youKingRow`, holes, board
- Produces: `maplePathToKingRank(board, mods, from: Pos): boolean` — dark-square BFS, 4 diagonal neighbors, holes are walls, other pieces **passable**, goal any dark square with `r === mods.youKingRow`

Keep today’s “zero legal moves” rejection. Add the path check for **maple only** (Enemy may still be awkward). If the rolled hole count cannot be placed, drop holes until every maple has a path.

Daily uses the same functions.

- [ ] **Step 1: Write the failing test**

Append to `src/game/powerCheck.ts`:

```ts
import { maplePathToKingRank, pickSafeHoles } from "./setup.ts";

const wall = blankSize(8);
wall[7]![0] = { id: 1, side: "you", king: false };
const isolated = {
  ...emptyMods(),
  youKingRow: 0,
  youHome: [6, 7],
  themKingRow: 7,
  themHome: [0, 1],
  holes: [
    { r: 6, c: 1 },
    { r: 5, c: 0 },
    { r: 5, c: 2 },
    { r: 4, c: 1 },
    { r: 3, c: 0 },
    { r: 3, c: 2 },
    { r: 2, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 2 },
  ],
};
assert(
  !maplePathToKingRank(wall, isolated, { r: 7, c: 0 }),
  "a maple boxed from row 0 has no path",
);
const safe = pickSafeHoles(new Rng(3), 8, wall, emptyLaws(), { ...isolated, holes: [] });
assert(
  maplePathToKingRank(wall, { ...isolated, holes: safe }, { r: 7, c: 0 }),
  "pickSafeHoles will not wall the maple off row 0",
);
```

If this exact hole set does not box the piece on the dark graph, change the fixtures until `maplePathToKingRank` is false before pick and true after. Do not weaken the test to “maybe.”

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL (`maplePathToKingRank` missing) or pick still returns an isolating set.

- [ ] **Step 3: BFS + pick/unstick**

Implement BFS. Neighbors: `{r±1,c±1}` on-board, dark, not a hole. Occupied squares are allowed.

In `pickSafeHoles`, after the existing `trappedByHoles` skip, also skip if any maple fails `maplePathToKingRank`.

In `unstickHoles`, treat “maple has no path” like a trap: move or drop holes until every maple has a path **and** nobody has zero legal moves.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS. Existing `unstickHoles` crownCheck cases still pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/setup.ts src/game/powerCheck.ts src/game/crownCheck.ts
git commit -m "Keep setup holes from walling a maple off the far rank."
```

---

### Task 12: Wave 2 browser check

- [ ] **Step 1: `npm test`**

Expected: PASS.

- [ ] **Step 2: Play on 43181**

- New climb boards 1–2 have no lily; boards 3–6 have one.
- Daily has none.
- Land with a hop and with a king slide; get two extras; combo then extras; leftover Back 2 Back does not refill.
- Walnut can sit on the lily; it stays.
- Motion off: lily visible, no sparkle, extras still work.
- Continue mid-burst keeps leftover extras.
- A climb deal no longer walls a maple behind holes at setup. Trapdoor still always holes the sit square.

Do not publish.

- [ ] **Step 3: Commit only if you fixed bugs**

```bash
git commit -m "Fix Hop Lily issues found in play."
```

---

## Self-review (spec coverage)

| Spec item | Task |
| --- | --- |
| Pick hop-in / squash | 7 |
| Unique get overlay, YOU GOT stamp, fanfare, ~2s | 7 |
| Motion off stamp only | 7 |
| 14 scenes, picture is the power | 7 |
| Starting King rename + short HUD copy | 2 |
| Wide Pond 10×10 + save size | 3, 5 |
| Super King max 7 | 3 |
| Trapdoor on `move.capture` | 4 |
| Nap Time after capture, not slide/pit | 6 |
| Back 2 Back two opening hops, leftover only | 6 |
| Tempo: combo → lily → leftover B2B → nap → Enemy | 6, 10 |
| Hop Lily boards 3–6, Daily none, enemy sit keeps it | 9–10 |
| Mid band then any empty dark | 9 |
| Tiny pickup, no overlay | 10 |
| Setup hole path, Trapdoor still hurts | 11 |
| No title Easy/Hard, no fourth law | (non-goal; no task) |
| `freeJump` unused | 1, 2 |
| Browser 43181, no publish | 8, 12 |
