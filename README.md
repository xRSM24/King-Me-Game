# Jumpgrave

Kid-friendly **anime checkers** with a climb. You sit **ivory**. They sit **charcoal**. Hop, capture, pick a power, and try to beat **the Crown** in six boards.

## Play with a friend

This Preview is only on your machine. A friend cannot open `127.0.0.1`. Send them a **public link** or the repo.

### Fastest: a public URL (Netlify Drop)

On your computer:

```bash
npm install
npm run build
```

Open [https://app.netlify.com/drop](https://app.netlify.com/drop), drag the `dist` folder onto the page, and send them the `https://….netlify.app` link. They play in the browser. No install.

The climb, daily board, drag-hops, and anime table all work. Today's fewest-moves list is **per browser** on a static host (no shared server). If you both play on this same `npm run dev` machine, you share one leaderboard.

### They have Node

If they can clone the repo:

```bash
git clone https://origin.cursor.com/git/khepri-sun/tmp-2bcbb7e9070a385f.git jumpgrave
cd jumpgrave
npm install
npm run dev
```

Invite them on Origin if the repo is private.

## The goal

Every game: win six **new** boards in a row. Each climb rolls a fresh path. Later felts bring more charcoal, nastier rules, and a sharper house.

You will lose sometimes. That is OK. Captures become **Stars**, a little permanent boost with a ceiling, so the next First Hop is kinder but you never skip the climb.

## How it feels

- The first board starts with a jump (the gold **star**), but the squares change every climb.
- Later boards pile on charcoal, holes, bouncing jumps, and flying kings.
- Pieces hop. Captures pop. Double jumps cheer.
- One **Oops** per board if you tap the wrong square.
- Each board is a different puzzle: a race to crown, holes in the felt, a shadow king, backward jumps, then the Crown.

## Today's board

One hard felt per UTC day. Same pieces for everybody. No powers, no Oops. Clear it, pin your **move count** (a multi-jump is one move). The shared leaderboard is sorted fewest moves first; a name keeps only its best.

```bash
npm run dev
```

Scores live at `GET/POST /api/daily/YYYY-MM-DD` (saved under `data/`). If the API is down, this browser still remembers scores locally.

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
| Take-back | Oops (once per board) |
| Pause | Menu |

## License

All original code and writing in this repository are yours to use for this project.
