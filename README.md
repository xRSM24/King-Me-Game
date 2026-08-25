# Soulstack

A turn-based roguelike about stolen lives. You have no health bar. You are a stack of faces. Hits peel them off. The lives you refuse to wear wait for you at the bottom of the dungeon.

This is the first complete slice of a game that could later ship on Steam: short runs, a collection of identities and resonances, and a boss that is built from *your* greed.

## The loop

1. Descend into a shifting crypt.
2. Bump into the living. When they fall, **Wear** them or **Harvest** them.
3. Wear: you become them. Buried lives grant echoes. Combinations **resonate**.
4. Harvest: you take the gold. The Hollow keeps the face.
5. Overflow the stack, and the bottom life falls into the Hollow's grave too.
6. Floor 6 is The Hollow — a boss made of everything you sold.

Wear-heavy runs make a weaker god and a weirder you. Harvest-heavy runs buy stitches and flasks, then fight a nightmare wearing your receipts. That choice is the game.

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

Progress lives in the browser (`localStorage`). Remembrance spends on permanent perks between runs. Daily runs use a shared UTC seed.

## Controls

| Action | Keys |
| --- | --- |
| Move | WASD, arrows, vim hjkl, or click a tile |
| Wait / Scrounge | Z or `.` |
| Soul power | Space or F |
| Wear / Harvest | 1 / 2 |
| Pause | Esc |

On a phone, a d-pad and Power button appear.

## Identities

Vagabond, Rat, Guard, Archer, Thief, Priest, Pyromancer, Knight — and The Hollow. Each changes how you move and fight, not just your numbers. Buried, they leak echoes. Together, they unlock resonances such as Packrat, Deathwind, and Saint of Bones.

## Steam-shaped later

The mechanical identity is already something you can pitch: *a roguelike where the final boss is the loot you passed up.* A later build would add more faces, floor events, sound by a composer, controller support, Steam Cloud, and daily leaderboards. This repository is the playable thesis.

## License

All original code and writing in this repository are yours to use for this project.
