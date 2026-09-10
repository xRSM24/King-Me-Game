# Endless mode

Date: 2026-09-10  
Product: King Me (Vite + TypeScript + DOM/CSS, package `jumpgrave`)

## Problem

The climb stops at six boards (`PATH_END`). Powers stack for the whole climb (14 laws). Daily is one shared UTC puzzle with no picks and a fewest-moves list. There is no way to keep hopping after a Crown, and no list for “how far did you get?”

A naive Endless that kept every pick would own the full kit around board 14 and stop being a challenge.

## Goals

- **Endless** continues as long as the player keeps winning boards.
- Hold at most **3** climb powers. First three clears fill the kit. Later clears **swap** (take one unused, drop one held).
- After a short warm-up, boards are **late-climb remixes** (denser felt, holes, Hop Lily, rising AI). No secret boss. No extra named Enemy twist clock.
- Shared leaderboard section titled **Endless**: all-time, **highest rounds** on top, same nickname as Daily. Pin on lose or Give up (not Home). Home pauses.
- Climb Continue and Endless Continue are **separate waits**. Daily still does not save a board.
- Same hop rules as today: optional captures, gold star to land a jump, cream spots to slide, Super King range still 7 in rules and still not said as “7” in player copy. No shop, ads, DLC. Package / localStorage prefix stays `jumpgrave-*`. Do not auto-publish.

## Non-goals

- No secret boss, Crown Guard, or boss-only law.
- Do not change the six-board Crown path, Daily’s UTC fewest-moves clock, or force captures.
- Do not add Easy/Hard on the title.
- Do not put the paused Endless run on the hop book in this pass (phone key only). Climb cloud wait stays as it is.
- Do not invent a fourth mode screen library or React.
- Do not auto-publish Netlify.

## Player flow

### Title

- New primary button **Endless**. Subtext: `Keep winning`.
- If `jumpgrave-endless-v1` exists: **Continue Endless**. Subtext: `Round N` (the current unfinished round).
- Climb **Continue** / **New climb** / **Daily Challenge** unchanged.
- **New Endless** (the Endless button while a wait exists) replaces only the Endless wait, using the same confirm pattern New climb uses for a climb wait. It never clears `jumpgrave-climb-v1`.
- More → **Leaderboard** opens the existing daily screen, which now has two blocks: Daily (fewest moves today) and **Endless** (all-time rounds).

### A run

1. Tap Endless (or Continue Endless). Mode is `endless`. HUD shows **Round N**, not `1 / 6`. The six climb dots are hidden.
2. **Rounds 1–3:** easy-band boards (First Hop / early climb). No Hop Lily. Oops **1**. Each clear → Pick a power (three unused cards) → keep the pick → next round. Get-scenes and Motion off match the climb.
3. **Round 4+:** remix per the Pressure table (climb board 3 band first, then 4–6). Holes, extra pieces, Hop Lily, sharper AI as `N` rises. Seed is new every round. Flavor names (Copper Well, …) are labels, not “board 5 of 6.”
4. **Kit full (3 powers):** clear → pick one of three unused → then **Drop one** (the three you hold). Cannot keep four. Stamp **YOU GOT [NAME]!** for the taken power, then load the next round with the new three.
5. **Menu / Home:** pause. Lead: this Endless run waits on this phone; the climb still waits on Home too. Give up ends the run (see Pin).
6. **Win a board:** `endlessRound` becomes `N+1`. Record hop history (`endless-clear`). Do not pin yet.
7. **Lose** (wipe with no Oops / no Second Chance, or chase ends against you) or **Give up:** end screen, Stars from this try, optional keep-save form like a **climb** loss (not like Daily). Pin if `clears >= 1`. Clear the Endless wait. Climb wait untouched.

A **round** is one board. **Clears** = boards won this run. Dying or giving up on round 12 with 11 clears pins **11**. Give up on round 1 with 0 clears does **not** pin.

Second Chance: same as climb. A comeback is not a pin. A second wipe without it ends the run.

## Kit (three treats)

- Pool: all 14 `LAW_DEFS`. Daily still never offers them.
- `unusedLaws` for offers excludes currently held ids. After a drop, that id is unused again and can show up later.
- While held, each law matches climb: Super King max 7 empty diagonal squares; Nap Time one skip per board after a capture; Trapdoor once per board on the Enemy sit square; Back 2 Back two opening hops per board; Wide Pond size 10 while held.
- **Wide Pond:** if it is in the kit, this round and later rounds are 10×10. If dropped, the **next** board is 8×8. Size follows the kit, not a permanent unlock.
- The Enemy does not copy the kit. Pressure is remix + AI / density, not Enemy Super King from your pick.
- Felt chips: board twists plus the three held powers (same `<details>` chips as climb).
- Pick Continue / pause on the drop step persists `offers`, `pendingLaw`, and `screen: "pick"` so a refresh does not grant four powers.

## Pressure

| Rounds | Layout | Lily | AI |
| --- | --- | --- | --- |
| 1 | `boardSpec` index 0 (First Hop) | no | climb First Hop band (`CLIMB_SKILL[0]`) |
| 2–3 | `boardSpec` index 1 (early climb) | no | climb board-2 band (`CLIMB_SKILL[1]`) |
| 4–6 | `boardSpec` index 2 (climb board 3) | yes | `CLIMB_SKILL[2]` (0.48) |
| 7–10 | index 3 | yes | `CLIMB_SKILL[3]` (0.66) |
| 11–16 | index 4 | yes | `CLIMB_SKILL[4]` (0.82) |
| 17+ | index 5 (climb board 6 band); extra Enemy from that tier | yes | `CLIMB_SKILL[5]` (0.95), never 1.0 |

- Layout still must not brick a player piece off the far rank (existing hole-path guards). Play can still lose.
- Chase clock is the climb rule (`CHASE_HOPS` quiet turns, then most pieces).
- Oops is **1** per board (climb), not Daily’s 2/3.
- Stars: on run end, add notches from this run’s captures the same way a climb loss/win does, even if they lose.

## Endless list

- Block title: **Endless**. Sort: **highest `rounds` first**, then earlier `at` (match Daily’s `a.at - b.at` after the primary key).
- Same nickname (`jumpgrave-player-name`), Hide, blocked names, report, as Daily.
- **Write** only on lose or Give up with `rounds >= 1`. Home does not write. Continue Endless does not write.
- One row per name (case-insensitive key). If the new `rounds` is **greater** than the stored row, replace it and set a new `at`. Equal or worse: keep the old row.
- No UTC day. No midnight reset. Cap stored `rounds` at 1–999. Keep at most 80 public rows (same cap as Daily).
- Network: GET/POST `https://jumpgrave-ajrr1z.netlify.app/api/endless` (local `npm run dev` posts there too, like Daily). If POST fails, keep the end screen result and say the shared list did not update.
- Paths are **not** shared. Only the round count is compared.
- Hide/report reuse `/api/report` and `hidden-names`; filtered names drop from both Daily and Endless public lists.

## Copy

- How rule 3 body adds Endless without a fifth rule: `New climb is a new path. Continue is the same climb you paused. Endless keeps going if you keep winning. You hold three treats, then swap one after each later board.`
- How rule 4 names both lists: nickname for **today’s Daily list** and the **Endless** list. Captures still become Stars.
- `pauseLead("endless")`: `This run isn't the climb. Go home and Endless waits on this phone. The climb still waits on Home too.`
- `pauseLead("daily")` unchanged. Climb pause unchanged.
- Title hint may stay Daily-focused; Endless is the button.
- Support: one line that Daily is fewest moves today, Endless is most rounds ever, climb is six boards.
- Privacy: Endless pins a nickname and a round count (no extra personal data).
- Player-facing: your pieces / Enemy, spots, captures, hops, Stars. Do not say pip. Super King / Long King do not say 7.

## Architecture

Keep Vite + DOM. Third mode: `mode: "run" | "daily" | "endless"`.

**Units**

| Unit | Does | Depends on |
| --- | --- | --- |
| `endless` round spec | Maps `endlessRound` + laws + rng → `boardSpec` index, lily yes/no, AI skill, oops 1 | `setup.ts` `boardSpec` / `pickLily` |
| Endless save | Pack/unpack paused run to `jumpgrave-endless-v1`; never read/write climb key | same fields as climb plus `endlessRound`, `clears` |
| Endless board client | GET/POST all-time scores; local cache `jumpgrave-endless-board-v1` | names, Hide, `SHARED_DAILY_ORIGIN` |
| `netlify/functions/endless.mjs` | All-time blob (not a day key). POST updates if `rounds` is strictly greater | `tryName`, hidden-names, same CORS as Daily |
| Pick/drop | Fill until 3; then take + drop | `unusedLaws`, existing get overlay |
| `game.ts` | Mode branches for HUD, lily (`endless` and round ≥ 4), pin, dual Continue | above |

**Save (`jumpgrave-endless-v1`)**

Same shape as `ClimbSave` plus:

- `endlessRound: number` (1-based current board)
- `clears: number` (boards won this run)

`screen` may be `"playing"` | `"pick"`. Pick must store held `laws`, `offers`, and whether the player still owes a drop (`dropIds: (keyof Laws)[]` or equivalent) so Continue Endless cannot skip the drop.

**Blobs**

- Store name: `jumpgrave-endless`. One JSON key `scores` (array of rows). Do not write Endless rows into Daily day keys.
- Row: `{ name: string, rounds: number, at: number }`.
- Redirect: `/api/endless` → `endless` function (GET list, POST `{ name, rounds }`).

**Account / hop book**

This pass does not add Endless to the account blob. Signed-in copy on pause may still say the climb can follow another phone; Endless pause copy says this phone.

**Keep-save**

Endless end (win does not exist as a terminal Crown; only lose / Give up) uses the climb-end keep-save form when not signed in. Daily end still does not.

## Error handling

- Kit of 4 is a bug: refuse to apply a fourth law; stay on Drop one.
- Wide Pond drop mid-run: do not resize the current board; load the next spec at 8×8.
- Failed Endless POST: end screen stays; local best in `jumpgrave-endless-board-v1` may remember this device’s best for the UI if the shared GET fails, but the shared list is source of truth when live.
- Old clients without Endless: ignore the new button’s absence; climb/Daily unchanged.
- Missing scene id: stamp the name and continue (same as climb).

## Testing

Add checks (sibling of `powerCheck.ts` or extend it):

- Fresh Endless kit starts empty; after three fills, `ownedCount === 3`.
- A fourth pick requires a drop; after drop, still exactly 3 and the new id is on, the dropped id is off.
- `jumpgrave-climb-v1` fixture unchanged after saving Endless.
- Lily false for rounds 1–3; lily allowed for round 4+ spec.
- Wide Pond on → `size === 10`; after drop, next spec `size === 8`.
- Pin helper: Home → no post; lose with 0 clears → no post; lose with 4 clears → post 4; worse later run does not replace 4; better 5 replaces.
- `pauseLead("endless")` does not use Daily’s “board isn't saved” line.
- How + pause copy: no `pip`, no Super King `7`.
- `npm test` remains `tsc --noEmit` plus existing checks plus these.

## Out of this pass

Secret boss every N, hop-book sync of Endless waits, seasonal Endless reset, changing Daily, changing `PATH_END`, auto-publish.
