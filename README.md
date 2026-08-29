# Checkmate!

Kid-friendly checkers with a climb. You hop **player pieces**. The other side is the **Enemy**. Capture, pick a power, and try to beat **the Crown** in six boards.

## Play with a friend

Share this live link (anyone can open it, no Netlify login):

**https://jumpgrave-ajrr1z.netlify.app**

This Cursor Preview is only on this machine. Friends should use that Netlify URL, not `127.0.0.1`.

Each `npm run publish` (and GitHub Actions on `main`, if this repo is on GitHub with `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` secrets) rebuilds the same link. The publish script also turns off team-login protection so the URL stays public.

The daily fewest-moves board is **shared** for everyone who tests Checkmate! — the live site, this preview, and a friend on their phone all sit on the same list. On a Drop with no functions, the game falls back to that same Netlify board; only a total API outage keeps scores in the local browser.

### Local

```bash
npm install
npm run dev
```

Open the URL Vite prints (this project pins **http://127.0.0.1:43181**).

## The goal

Every game: win six boards in a row. **New climb** rolls a fresh path (new files, new felt color, new names). **Continue** is the same climb you paused. Later felts bring more Enemy pieces, nastier rules, and a sharper Enemy.

You will lose sometimes. That is OK. Captures become **Stars**, a little permanent boost with a ceiling, so the next First Hop is kinder but you never skip the climb.

## How it feels

- The first climb shows a one-time coach: drag the gold ring onto the star.
- Later boards pile on Enemy pieces, holes, bouncing jumps, and flying Kings.
- Combos yell their names. Crowns fanfare. Beating the Crown bursts petals.
- One **Oops** per climb board. Watch the Enemy hop, then take yours back if it stung. Today's board usually gives you **two**, unless a daily modifier says otherwise.
- Close the tab mid-climb: **Continue** waits on the title. Give up from Menu if you want Stars now.
- Colorblind and Motion toggles live on the title. Arrows + Enter hop on a keyboard.
- Pick a **name** on the title (That's me). It stays on this device and sits on today's leaderboard. No email or password yet.

## Today's board

One hard felt per UTC day, **the same for you and your friends**, so the fewest-moves board is fair. Same pieces **and the same modifiers** for everybody. Some modifiers help you, some help the Enemy. **Oops count follows the modifier.** Clear it, pin your **move count** (a multi-jump is one move). Testers share one list at **https://jumpgrave-ajrr1z.netlify.app** — local `npm run dev` posts there too.

A climb is not shared. Tap **New climb** for a path nobody else has.

## Powers

After each win you pick one that lasts the rest of the run:

- **Jump Back** — your pieces may jump all 4 diagonals (not just toward the Enemy). Quiet slides still go forward 1 square.
- **Super King** — your Kings slide any empty diagonal, up to 7 squares (a normal King steps 1)
- **Buddy Up** — after each capture, a new player piece sits on an empty square of your back row (the edge you started from)
- **Second Chance** — once this climb, if you lose every piece, one King comes back on the far row and hops every diagonal
- **Start as King** — every board, one of your pieces starts already a King
- **Extra Piece** — +1 player piece at the start of every board
- **Skip the Jump** — tap **Skip jump** to walk 1 square instead of capturing, or to stop a combo; the Enemy still must jump
- **Hop Party** — every 4 captures this climb, one random non-King player piece becomes a King

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (this project pins **http://127.0.0.1:43181**).

```bash
npm run build
npm run preview
```

Progress lives in the browser (`localStorage`).

## Controls

| Action | How |
| --- | --- |
| Select / slide | Drag a gold ring onto a pip |
| Hop | Drop on a cream pip, or tap then tap |
| Capture | Drop on a gold star |
| Skip a jump | Skip jump (only with that power) — walk instead, or stop a combo |
| Take-back | Oops after the Enemy hops (×1 on the climb, daily follows today's modifier) |
| Pause / save | Menu → Go home (climb waits) |
| Today's board | Title → Today's board (same felt for everyone today) |
| Keyboard | Arrows, Enter, Escape |

## License

All original code and writing in this repository are yours to use for this project.
