# Soulstack

A goofy costume-pile roguelike. You play **Pip**, a pajama ghost with no hearts — only a wobbly pile of outfits. Hold WASD to run. Bump costumes to boop them. Outfits you skip go to **King Empty**.

## The goal

Every run has the same job: **reach King Empty's Fort** (closet 10) and finish the fight.

You will get sent home a lot. That is the point. Stickers from those tries buy tiny permanent boosts. The stairs on each closet stay locked until you boop enough costumes, so you cannot skip the work.

## The loop

1. Run around a candy closet. Hold WASD or arrows (or tap the floor).
2. Bump a costume. When they flop, **Wear** or **Snack**.
3. Wear: put the outfit on. Snack: take coins, and King Empty keeps that costume.
4. Boop enough costumes on the floor. A glowing green hole pops open. Run onto it.
5. Closet 10 is King Empty — a giant raincoat made of every outfit you didn't wear.

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

Progress lives in the browser (`localStorage`). Stickers spend on permanent perks between runs.

## Controls

| Action | Keys |
| --- | --- |
| Run | Hold WASD, arrows, or vim hjkl |
| Walk toward a spot | Click the floor |
| Costume power | Space or F |
| Wear / Snack | 1 / 2 |
| Pause | Esc |

On a phone, hold the d-pad.

## License

All original code and writing in this repository are yours to use for this project.
