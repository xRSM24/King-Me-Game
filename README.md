# Jumpgrave

Kid-friendly **anime checkers** with a climb. You sit **ivory**. They sit **charcoal**. Hop, capture, pick a power, and try to beat **the Crown** in six boards.

## The goal

Every game: win six boards in a row.

You will lose sometimes. That is OK. Captures become **Stars**, a little permanent boost with a ceiling, so the next First Hop is kinder but you never skip the climb.

## How it feels

- The first board starts with a jump (the gold **star**).
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
