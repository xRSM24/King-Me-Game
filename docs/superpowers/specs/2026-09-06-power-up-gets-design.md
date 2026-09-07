# Power-up gets, three climb powers, Hop Lily, and setup hole guards

Date: 2026-09-06  
Product: King Me (Vite + TypeScript + DOM/CSS, package `jumpgrave`)

Ship as **two waves in this spec**. Wave 1 is the pick/get and the three climb laws. Wave 2 is Hop Lily and stronger setup holes. Do not start wave 2 until wave 1 is playable.

## Problem

Clearing a climb board opens **Pick a power**: three text buttons. Tapping one sets the law and loads the next board with no celebration. Kids do not feel like they got a power-up. Kinging already has a crown pop; picking a power does not.

Late climb boards can also stall: a 1-vs-3 chase, or a hole deal that walls a maple off from the far edge. Today `pickSafeHoles` / `unstickHoles` only ask whether a piece has a step *right now*, not whether it can still reach the king rank.

## Goals

- Pick cards feel grabby (hop in, squash on press).
- Tapping a power plays a short unique get-scene whose **picture is the power**.
- New powers register the same way as the existing 11 so later powers are not one-offs.
- Add three climb powers: Wide Pond, Nap Time, Back 2 Back.
- Add one on-board token, **Hop Lily**, so a late climb board can break a stagnant chase.
- Strengthen setup hole placement so the deal does not brick a maple from the far rank.
- Motion off skips cartoons. Daily has no pick and no lily. Skip Jump stays gone. No shop, ads, DLC, or cosmetics. localStorage keys stay `jumpgrave-*`.

## Non-goals

- Do not invent a fourth climb **law** in this pass. Hop Lily is a board token, not a pick-card power.
- Do not add a title-screen Easy / Hard. Climb already ramps First Hop → Crown. A new climb is a new path; the stage band stays easy → hard. Daily stays one shared UTC puzzle.
- Do not resize Daily boards.
- Do not rewrite frogs, jump rules, or force captures.
- Do not bring back Skip Jump or use `Laws.freeJump`.
- Do not promise a forced-win solver. “Winnable” means the **layout** does not brick you. You can still lose by play. Trapdoor mid-board may still hurt.
- Do not auto-publish.

## Player flow

1. Player clears a climb board. Existing “Board clear!” cheer still plays.
2. After the current ~720ms beat, **Pick a power** shows (not Daily; not the Crown finish).
3. Two or three unused powers appear as cards. Cards hop in staggered. Icon large, name loud, rule text quieter. Press: squash-and-stretch like a frog landing.
4. Tap locks the cards. A full-screen overlay (~2 seconds) plays that power’s scene. Stamp: **YOU GOT [NAME]!** Fanfare (`audio.fanfare`).
5. Overlay ends. Next board loads. If the pick was Wide Pond, that board and later climb boards are 10×10.
6. On climb boards **3–6** (`boardIndex` 2–5), that board also has one Hop Lily. First Hop and board 2 do not.
7. Continue / pause still works if they close on the pick screen. Native back on pick still does nothing.

Motion off (`reduceMotion` / Motion off): no hop-in, no cartoon. Stamp the name, then load the next board. Lily still sits on the felt; pickup has no sparkle.

## Overlay

Shared poster stage (not a new UI library, not React):

- King Me pond night background, Mochiy Pop One stamp, Zen Maru Gothic body.
- Scene art unique to the power (inline SVG / CSS / one illustration).
- Maple and walnut frogs stay the existing `piece-you` / `piece-them` look. Crowns stay teal/copper. No gold halo on the board.

Quality bar locked in brainstorm mockups: Nap Time sleep scene, Wide Pond framed painting, Back 2 Back two maples with ×2, rings, and jump-stars.

Hop Lily does **not** use this overlay. Landing on it is a tiny on-board squash + pip.

## Scene list (the picture is the power)

### New

| Name | Pick / HUD description | Get-scene |
| --- | --- | --- |
| Wide Pond | Boards are now 10x10 | Framed painterly wide pond / oak felt (locked illustration direction). |
| Nap Time | The enemy falls asleep for one turn | Walnut frogs slumped, closed eyes, Zzz. |
| Back 2 Back | Player begins with 2 moves | Two maple frogs hop together, ×2 stamp, gold rings, jump-stars. |

Stamp spelling: **BACK 2 BACK**.

### Existing 11

Player-facing pick / HUD names and descriptions below replace the long live copy. **Rules stay as they are today** except Trapdoor (hole where the Enemy sat) and Super King (always max 7 squares, even on 10×10). How-to / Daily enemy mods can keep the longer sentences.

| Name | Pick / HUD description | Get-scene |
| --- | --- | --- |
| Jump Back | Player may hop backwards | Maple hops backward. All 4 diagonals flash. |
| Super King | Player's king may move up to 7 spaces at once. | Teal-copper crown pops. King slides a long empty diagonal. |
| Buddy Up | Player gets a new piece after an enemy is captured | A new maple pops onto the back row and waves. |
| Second Chance | If player loses, one king comes back to join the player | A crowned maple hops back onto the far row after a wipe. |
| Starting King | One player piece starts as a King | One maple already wears the crown before the board begins. |
| Extra Piece | Player gets one extra piece to start | One extra maple sits on an empty dark square. |
| Hop Party | Every 4 enemy captures creates a king for the player | Party sparkles; a random non-King maple gets crowned. |
| Far Jump | One non-king piece may jump further each turn | Maple leaps extra far over an Enemy onto the far star. |
| Double Crown | When a player piece becomes king, a non-king next to it becomes king. | Two teal-copper crowns pop on neighbor frogs. |
| Trapdoor | When a piece is captured, that space becomes a hole | The square the Enemy sat on drops to a hole. A star sits past it. |
| Scout | One player piece begins closer to the middle of the board | One maple starts closer to the middle. |

Rename **Start as King** → **Starting King** on the pick card, HUD, and get stamp.

**Super King range:** always at most **7** empty diagonal squares, on 8×8 and on 10×10. Do not scale to `size − 1`. Card text stays “up to 7 spaces at once.”

**Trapdoor (rule change):** once this board, after you capture, the hole is the square the **Enemy sat on** (`move.capture`), not the square you land on. You sit past them; that mid square is now a pit. Nobody may sit there. Jump over it onto the star past it. Still once per board — do not fill the felt with holes.

No generic “frog hops in a circle” for every power.

## New rules

Climb only. The three laws appear in the unused-law pick pool like the 11. Daily Challenge never offers them and never changes size.

### Wide Pond

- After this power is owned, **this climb’s remaining boards are 10×10**, including the board that loads right after the get.
- Daily stays 8×8. A climb that never picked it stays 8×8. A paused climb saved as 8×8 stays 8×8 until they pick Wide Pond on a later clear.
- Kinging still uses `campsFromRows` / `wouldCrown` / `manStep` on the **current** size. Far edge is the far edge of this board. Never crown on home ranks.
- Jump stars still only on real captures and pits. Captures stay optional. Empty diagonals stay cream pips.
- Super King (and Daily enemy flying Kings) still slide at most 7 squares on a 10×10. The extra files are for walking and short hops, not a 9-square king ride.
- Setup, holes, AI, hints, CSS grid, and keyboard focus must read `mods.size` (8 or 10), not a hardcoded 8.
- Persist `mods.size` on the climb save. Infer size from the saved board array if `size` is missing (old saves = 8). Home-row validation must allow rows `0 .. size-1`, not `0 .. 7` only.

### Nap Time

- Once per climb board: after the player **captures** (not a quiet slide, not a pit leap), the Enemy skips their next reply. That is their “asleep for one turn.”
- If the player keeps a combo after that capture, the skip happens when that player turn would have handed to the Enemy — after lily extras and leftover Back 2 Back if those are still running (see tempo order).
- Does not stack: one skip stored per board. A second capture the same board does not bank another nap.
- AI is unchanged on the turns they do play (still prefer captures).
- Track `mods.napUsed` (or equivalent) on the board, same persistence style as `trapdoorUsed`.

### Back 2 Back

- At the **start of each climb board** after this power is owned, the player begins with 2 moves: they finish one hop (combo and Skip jump still work as today), then may hop again — same frog or another — before the Enemy replies.
- After those two opening moves, play is normal (you, Enemy, you…).
- Does not grant two moves after every later turn. Oops still restores the last hop, not the whole opening pair.
- Track remaining opening hops on the board (2 at setup, consume when a player turn ends). Persist so Continue mid-opening still works.
- Landing on a Hop Lily does **not** refill opening hops. Leftover only.

### Hop Lily (wave 2, not a law)

On-board pickup. Not in the pick pool. No **YOU GOT** overlay.

- **Name / HUD:** Hop Lily — “Hop on: 2 extra hops.”
- **Who:** Only maple gets the extras. Daily never has a lily.
- **When:** Every climb board **3–6** (`boardIndex` 2–5). First Hop and board 2 never. Exactly one lily, guaranteed on those boards.
- **Where:** After pieces and holes are placed, pick a random empty dark square. Prefer the hole band (rows 2–5 on 8×8; on 10×10 the same relative middle, rows `2` through `size-3`). If that band has no empty dark square, pick any other empty dark square on the board. Do not sit on a frog or a hole. Do not skip the lily.
- **Enemy:** Walnut may land on the square. They get no extras. The lily stays under them. When they leave, maple can still take it.
- **Take:** Any maple landing — hop or king slide — takes the lily. That landing hop/slide does **not** spend the 2 extras. The lily is gone after maple lands.
- **Pickup juice:** Tiny squash + pip on the landing frog. Motion off: no sparkle; extras still grant.
- **Save:** Climb mods store `lily` (square or none) and `lilyHops` (0–2 extras left). Continue mid-burst keeps leftover extras. Daily save never writes these.

**Tempo order** after a maple turn that would hand to the Enemy:

1. Finish keep-jumping / Skip jump as today.
2. If that landing took the lily, set `lilyHops` to 2 (the landing itself already happened and does not consume these).
3. Spend `lilyHops` — each extra is a full maple turn (combo and Skip jump still work).
4. Spend leftover Back 2 Back opening hops (no refill).
5. If Nap Time is owed this board, Enemy skips their next reply.
6. Enemy plays.

The landing turn still counts as one Back 2 Back opening hop if the opening is active. Example: opening hop 1 lands on the lily → then 2 lily hops → then 1 leftover opening hop → then Nap Time if earned → then Enemy.

### Setup hole guards (wave 2)

Setup only. Trapdoor still always holes the Enemy’s sit square, even if that leaves you stuck.

- Keep placing holes on empty dark squares in the hole band, still skipping a candidate that leaves any piece with **zero legal moves** (`pickSafeHoles` / `unstickHoles` today).
- Add a longer look: holes are walls on the dark-square graph. Other frogs count as **passable** (they will move). After the deal, every maple must have a path of dark squares to the far king rank (`youKingRow` / current size).
- If a candidate hole would cut any maple off from that rank, skip that square.
- If the rolled hole count cannot be placed without cutting a maple off, drop holes until every maple has a path — same spirit as today’s unstick drop.
- One function for climb and Daily. Do not fork a climb-only hole picker.
- On 10×10, the far rank and the hole band use the current size.

This does not prove a forced win. It only refuses a deal that walls a maple off from the far edge.

## Architecture

Keep Vite + DOM. Do not add React or a new animation library.

**Power registry** (extend `LawDef` in `src/game/laws.ts`, or a sibling module the pick/overlay import):

- `id`, `name`, `desc`, `icon` (already exist)
- `scene`: id of the overlay clip (CSS class + DOM recipe)

`unusedLaws` includes the three new ids. `emptyLaws()` defaults them `false`. `loadClimb` already spreads `{ ...emptyLaws(), ...(p.laws ?? {}) }`, so old climbs do not crash.

**Pick screen** (`renderPick` / `#pick-body`): hop-in cards, then `data-cmd="law:…"`. Do not jump straight to `loadBoard`. Play the overlay, then apply the law, increment board, load, show playing.

**Overlay host**: one DOM node (new element under `#frame` or on the pick veil). Play scene by `scene` id. On end or Motion off timeout, continue. Do not block forever if audio is muted.

**Board size**: replace implicit `SIZE === 8` in rules, setup, save, AI, and `#board` CSS with the current mods size. `SIZE` may remain the default 8 constant.

**Hop Lily**: extend `BoardMods` with `lily` (pos or none) and `lilyHops` (integer). Place in climb `loadBoard` / `boardSpec` after holes, only when `mode === "run"` and `boardIndex` is 2–5. Draw on the cell; a walnut on that cell does not hide the lily. Turn-end in `game.ts` follows the tempo order above. Oops restores lily square and hop counts with the rest of the undo stack.

**Hole path check**: extend `pickSafeHoles` / `unstickHoles` in `src/game/setup.ts`. Dark-square BFS to the far king rank; frogs passable, holes are walls.

**Audio**: use existing `fanfare` on get. Optional short sleep/grow/pair cues later; not required for wave 1. Lily pickup may reuse a short hop tick; not a fanfare.

## Error handling

- If a scene id is missing, stamp the name and continue (never stuck on pick).
- If Wide Pond setup cannot place pieces on 10×10, fall back to the same placement rules scaled to 10, not an 8×8 board.
- Continue on pick with offers saved (already in `ClimbSave.offers` / `screen: "pick"`).
- If lily placement finds no empty dark square (should not happen on a legal deal), skip the lily rather than overlap a frog. This is a last-resort guard, not the normal mid-band fallback.
- Old climb saves without `lily` / `lilyHops` / `size` / new laws load as “none / 0 / 8 / false.”

## Testing

Wave 1 — extend `src/game/crownCheck.ts` (or a sibling check) for: 10×10 kinging on the far edge only; Super King cannot slide 8+ on a 10×10; Trapdoor holes `move.capture` not `move.to`; Nap Time skips one Enemy turn after a capture and not after a slide; Back 2 Back allows two opening hops then Enemy; unused `freeJump` still unused.

Wave 2 — lily on climb `boardIndex` 2–5 only; Daily none; landing hop or king slide grants 2 extras after combo / Skip jump; leftover Back 2 Back does not refill; Nap Time skip runs after lily extras and leftover opening hops; persist `lily` + `lilyHops` on Continue; a hole set that isolates a maple from the far rank is rejected or dropped.

- `npm test` must pass after each wave.
- Browser wave 1 (port 43181): clear a climb board (or a debug jump to pick), confirm empty-direction pips still cream, pick a power, see the matching get (or the name stamp if Motion off), then the next board. Wide Pond next board is 10×10.
- Browser wave 2: start a climb at board 3+, see one lily, land (hop and slide), get two extras, confirm Daily has none, deal a known isolating hole set and see it moved or dropped.
- Do not publish.

## Ship order

Wave 1

1. Pick-card juice + overlay host + registry hook.
2. Fourteen scenes (11 existing + 3 new pictures). New laws can show in pick only after their rules exist, or show as locked-off until step 3 — prefer step 3 immediately after the host so pick never offers an unwired law.
3. Wire Wide Pond, Nap Time, Back 2 Back, Trapdoor-on-capture-square, Super King cap of 7 on any size, HUD cards, and saves.
4. Verify in the browser on port 43181.

Wave 2 (after wave 1 is playable)

5. Hop Lily placement, render, tempo order, save / Oops.
6. Stronger setup hole path check (climb and Daily share it).
7. Verify lily + hole deals in the browser on port 43181.

## Out of scope reminders

- Player piece remains the cute maple frog; Enemy remains the mean walnut frog.
- No Trapdoor-filled boards. No Safe Camp. No Skip Jump.
- No title-screen difficulty select.
- Contact / privacy stay on the live host; do not commit Netlify tokens.
