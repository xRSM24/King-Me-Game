# Clearer copy + Daily preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace player-facing **pip** with **spot**, split the overloaded word **hop**, shorten How, rename File lanes, preview Daily before play, compact twist names, fix Daily pause and sign-in copy, and drop the “up to 7” King range from player text — without changing how pieces move.

**Architecture:** Copy lives in `src/game/copy.ts` (HUD, chase, pause, captures, Super/Long King). Keep-save button copy stays in `keepSave.ts`. Board names/lanes in `setup.ts`. Playing/Daily HUD cards become `<details>` chips. Title Daily uses `data-cmd="daily"`. King slide range stays 7 in `rules.ts`.

**Tech Stack:** Vite, TypeScript, DOM/CSS, `npm test`.

## Global Constraints

- Product title is King Me; package / localStorage / Netlify slug stay `jumpgrave`.
- Quiet landings are **spots**, never **pips**, in player-facing copy.
- Climb HUD count is **captures**, not hops. Chase clock is **turns with no jump**.
- Super King / Long King player text: slide any empty squares on that diagonal. Do not mention 7. Do not change the 7-square rule in code.
- How to Play is four short rules. Oops, chase, Daily, and save stay taught in-game / on those screens.
- Title **Daily Challenge** opens the Daily preview (leaderboard), not play.
- Playtest on `http://localhost:43181/`. Do not click New climb on `http://127.0.0.1:43181/`.
- Do not commit unless the user asked. Do not `npm run publish`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/game/copy.ts` | spot HUD, chase turns, pause lead, capture count, King slide copy |
| `src/game/keepSave.ts` | `I already have a save` |
| `src/game/history.ts` | climb history says captures |
| `src/game/setup.ts` | Left/Right side; First Hop has no extra felt cards |
| `src/game/game.ts` | HUD captures; pause lead; compact mod chips; Daily title already wired via HTML |
| `index.html` | How (4 rules); coach; Daily `data-cmd`; pause lead id |
| `src/style.css` | tap-to-open mod chips |
| `src/game/powerCheck.ts` | copy tests |
| `README.md`, `src/game/daily.ts` | matching player copy |

---

### Task 1: Copy helpers and HUD strings

**Files:**
- Modify: `src/game/copy.ts`, `src/game/keepSave.ts`, `src/game/history.ts`, `src/game/powerCheck.ts`

- [ ] **Step 1:** Fail tests for spot, turns, captures, save button, pause lead, no “up to 7” in King desc.
- [ ] **Step 2:** Implement the strings and helpers.
- [ ] **Step 3:** `node --experimental-strip-types src/game/powerCheck.ts` passes.

### Task 2: Boards, HUD, How, Daily preview, chips

**Files:**
- Modify: `src/game/setup.ts`, `src/game/game.ts`, `index.html`, `src/style.css`, `src/game/daily.ts`, `README.md`

- [ ] **Step 1:** Wire copy into HUD, pause, history, How, Daily button, chips, lanes.
- [ ] **Step 2:** `npm test` passes.
- [ ] **Step 3:** Browser-check localhost: How, First Hop (no File/pip), Daily preview then play (name chips), Daily pause, Save hops button.
