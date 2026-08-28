# Jumpgrave

Kid-friendly **anime checkers** with a climb. You sit **ivory**. They sit **charcoal**. Hop, capture, pick a power, and try to beat **the Crown** in six boards.

## Play with a friend

This Cursor Preview is only on this machine. Friends need the **public Netlify URL**.

Once Netlify is connected, every push to `main` republishes that URL:

1. Create a free [Netlify](https://app.netlify.com) account.
2. Add a personal access token: [User settings → Applications](https://app.netlify.com/user/settings#applications) → New access token. Name it Jumpgrave.
3. Put `NETLIFY_AUTH_TOKEN` in this Cloud Agent environment (and `NETLIFY_SITE_ID` after the first publish, optional).
4. Run `npm run publish` once. The script creates the site, prints the `https://….netlify.app` link, and deploys.
5. After that, each push to `main` from here (or GitHub Actions, if this repo is on GitHub) rebuilds the same link.

Friends always open that one Netlify URL. They do not use `127.0.0.1`.

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

- The first board starts with a jump (the gold **star**), but the squares change every climb.
- Later boards pile on charcoal, holes, bouncing jumps, and flying kings.
- Pieces hop. Captures pop. Double jumps cheer.
- One **Oops** per climb board if you tap the wrong square. Today's board gives you **two**.
- Each board is a different puzzle: a race to crown, holes in the felt, a shadow king, backward jumps, then the Crown.

## Today's board

One hard felt per UTC day. Same pieces for everybody. No powers. **Two Oops.** Clear it, pin your **move count** (a multi-jump is one move). On Netlify the leaderboard is shared; locally, scores live at `GET/POST /api/daily/YYYY-MM-DD` (saved under `data/`).

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
| Take-back | Oops (×1 on the climb, ×2 on today) |
| Pause | Menu |

## License

All original code and writing in this repository are yours to use for this project.
