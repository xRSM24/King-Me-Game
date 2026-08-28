# Jumpgrave

Kid-friendly **anime checkers** with a climb. You sit **ivory**. They sit **charcoal**. Hop, capture, pick a power, and try to beat **the Crown** in six boards.

## Play with a friend

Share this live link (anyone can open it, no Netlify login):

**https://jumpgrave-ajrr1z.netlify.app**

This Cursor Preview is only on this machine. Friends should use that Netlify URL, not `127.0.0.1`.

Each `npm run publish` (and GitHub Actions on `main`, if this repo is on GitHub with `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` secrets) rebuilds the same link. The publish script also turns off team-login protection so the URL stays public.

The daily fewest-moves board is **shared** on Netlify (everyone on the link sees the same list). On a static Drop without functions, each browser keeps its own list.

### Local

```bash
npm install
npm run dev
```

Open the URL Vite prints (this project pins **http://127.0.0.1:43181**).

## The goal

Every game: win six **new** boards in a row. Each climb rolls a fresh path. Later felts bring more charcoal, nastier rules, and a sharper house.

You will lose sometimes. That is OK. Captures become **Stars**, a little permanent boost with a ceiling, so the next First Hop is kinder but you never skip the climb.

## How it feels

- The first climb shows a one-time coach: drag the gold ring onto the star.
- Later boards pile on charcoal, holes, bouncing jumps, and flying kings.
- Combos yell their names. Crowns fanfare. Beating the Crown bursts petals.
- One **Oops** per climb board if you tap the wrong square (it boings). Today's board usually gives you **two**, unless a daily twist says otherwise.
- Close the tab mid-climb: **Continue** waits on the title. Give up from Menu if you want Stars now.
- Colorblind and Motion toggles live on the title. Arrows + Enter hop on a keyboard.
- Pick a **name** on the title (That's me). It stays on this device and sits on today's leaderboard. No email or password yet.

## Today's board

One hard felt per UTC day. Same pieces **and the same modifiers** for everybody. Some twists help ivory, some help the house. **Oops count follows the twist.** Clear it, pin your **move count** (a multi-jump is one move). On Netlify the leaderboard is shared; locally, scores live at `GET/POST /api/daily/YYYY-MM-DD` (saved under `data/`).

## Powers

After each win you pick one that lasts the rest of the run:

- **Jump Back** — your men may jump backward
- **Super King** — kings slide any empty diagonal
- **Buddy Up** — captures try to seat a new friend
- **Second Chance** — once, losing everyone saves a king
- **Start Crowned** — a man starts as a king
- **Extra Man** — +1 starting checker
- **Skip the Jump** — jumps are optional for you
- **Hop Party** — every 4 captures crowns a friend

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
| Take-back | Oops (×1 on the climb, daily follows today's twist) |
| Pause / save | Menu → Go home (climb waits) |
| Keyboard | Arrows, Enter, Escape |

## License

All original code and writing in this repository are yours to use for this project.
