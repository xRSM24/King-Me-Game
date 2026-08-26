# Jumpgrave

A roguelike of **English draughts**. You sit ivory. The house sits charcoal. Hop, capture, rewrite the laws, and try to reach the **Black Crown** before the felt is empty.

## The goal

Every run is the same job: win six boards in a row.

You will be wiped. That is the point. Captures become **Notches**, a permanent opening bonus with diminishing returns and a hard ceiling, so later deaths help less and you never own the table.

## The laws

After each win you pick one rule that lasts the rest of the run:

- **Backbite** — your men may jump backward
- **Long Crown** — kings slide any empty diagonal
- **Press Gang** — captures try to seat a new man on your back row
- **Last Rites** — once per run, a wipe saves a king
- **Borrowed Crown** — a man starts crowned each board
- **Spare Checker** — +1 starting man
- **Mercy Rule** — jumps are optional for you
- **Hop Fever** — every 4 captures crowns a random man

Later boards field more charcoal than Notches can ever match.

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
| Select a piece | Click / tap it |
| Hop | Click a highlighted square |
| Multi-jump | Keep hopping the same piece |
| Pause | Menu |

On a phone, tap the dark squares.

## License

All original code and writing in this repository are yours to use for this project.
