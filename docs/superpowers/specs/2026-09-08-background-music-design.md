# Background music — sparkle intro + play motif

Date: 2026-09-08  
Product: King Me (Vite + TypeScript + DOM/CSS, package `jumpgrave`)

## Problem

Hops, captures, and fanfares already chirp through Web Audio. The table is silent between those hits. The title and a long think wait need a light bed so the pond feels alive, without a file, a license, or a second volume knob.

## Goals

- A **super light sparkly** looping intro on the title (and whenever they go Home).
- A **soft but catchy** motif starts when they tap **New climb**, **Continue**, or **Daily Challenge**.
- One **Sound** button still hushes hops and music together.
- Music is synthesized in the existing `AudioSys`. No mp3/ogg, no new library, no extra button.
- Hops stay louder than the bed.

## Non-goals

- Do not ship an audio file or license a track.
- Do not add a separate Music toggle.
- Do not change Motion off (hops and petals only).
- Do not duck or stop music on pause, end, How to Play, Save hops, or Daily leaderboard — only **Home** returns to sparkle.
- Do not auto-publish. Do not mix Android/iOS line-ending churn into this work.

## Player flow

1. First tap on the title unlocks Web Audio (already true for hops). If they are on the title, the sparkle starts.
2. Sparkle loops quietly: high short bells/sine, very low gain, same phrase every time.
3. **New climb** (`new` / `fresh`), **Continue** (`continue` / `new` when a climb is waiting), or **Daily Challenge** (`daily-play`) fades sparkle out (~0.5s) and fades the motif in.
4. Motif loops: quiet bass + a short melody. Soft, catchy, same every time. Hops, captures, fanfare play on top, louder.
5. Pause, end (Crown or loss), Daily end, menus opened from a live board: **motif keeps going**.
6. **Home** / **Go home** (`title`, `home`): fade motif out, fade sparkle back in.
7. **Sound off**: master gain 0 — instant silence. The scheduled bed stays armed. **Sound on**: they hear whichever bed the current screen owns.
8. Leaderboard (`daily` without play) stays on sparkle if they never started a board this visit.

## Data

No new `localStorage` key. `meta.mute` already covers music.

## Architecture

`AudioSys` gains a music bus (`GainNode` under `master`) and two named beds:

| Bed | Id | Feel |
| --- | --- | --- |
| Sparkle | `sparkle` | High, short, twinkly. Title / Home. |
| Motif | `motif` | Quiet bass + little melody. Live climb or Daily. |

Public API (names can match this intent):

- `startBed("sparkle" | "motif")` — no-op if that bed is already the current one; otherwise crossfade ~0.5s.
- Existing `setMuted` / `unlock` unchanged in meaning. `unlock` starts `sparkle` only when the game says the title is showing (Game calls `startBed` after unlock / `show`).

`Game` calls `startBed("sparkle")` from title `show("title")` and from boot-on-title. It calls `startBed("motif")` from `newRun`, `continueClimb`, and `newDaily` (the three play entries). Do not start motif from `openDaily` (leaderboard only).

Beds are note tables (freq, duration, wait, type, gain), scheduled on a loop with `AudioContext.currentTime`. Tests assert the tables and the start/home routing helpers, not a live `AudioContext`.

## Copy

How to Play **Keys and comfort** (or a new short bullet): title sparkles; New climb, Continue, or Daily Challenge starts the tune; Sound off hushes hops and music.

No STORE.md change (no audio file collected).

## Errors

If `AudioContext` cannot be created, stay silent (same as hops today). Do not show an error toast.

## Tests

- Sparkle notes and motif notes are different lists; sparkle uses higher/quieter hits.
- `nextBed("sparkle", "new" | "continue" | "daily-play" | "fresh") === "motif"`.
- `nextBed(any, "title" | "home") === "sparkle"`.
- `nextBed("sparkle", "daily") === "sparkle"` (leaderboard, no play).
- `nextBed("motif", "pause" | "how" | "end" | "account") === "motif"`.
- Mute still zeros master; no file path appears in the audio module.

## Out of this spec

Composing a recorded song later. Per-board themes. Separate music volume.
