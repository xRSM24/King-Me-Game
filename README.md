# Soulstack

A goofy costume-pile roguelike. You play **Pip**, a pajama ghost with no hearts — only a wobbly pile of outfits. Hold WASD to run. Hold Space to shoot. Outfits you skip go to **King Empty**.

## The goal

Every run has the same job: **follow the trail to King Empty** and finish the fight.

The map is one sandbox with a winding linear path. Side rooms hide coins, shops, and fountains. The main rooms get more crowded and meaner the closer you get. First tries should send you home several times before you even reach the boss. That is the point.

## Guns

Each costume shoots a different pattern:

| Costume | Gun | Pattern |
| --- | --- | --- |
| Pip | Pin Pop | One shot forward |
| Squeak | Crumb Fan | Three-way spread |
| Sir Clank | Pan Blast | Close shotgun |
| Twang | Rubber Bolt | Fast bolt, extra sting |
| Nib | Sneak X | Two diagonal shots |
| Bubbles | Soap Ring | Eight-way ring |
| Chili | Chili Stream | Twin spicy jets |
| Sir Boop | Boop Cross | Four shots, plus sign |
| King Empty | Empty Ring | A leftover-hat ring |

Damage and fire rate are balanced around Pip's starter pin. Bigger patterns hit more people; slower or shorter shots keep them honest.

## XP without god-mode

Kills give **run XP**, which levels the current gun **this life only** (cap 8). Death resets that.

Death also grants **Spark**, a permanent gun bonus with three brakes:

1. **Diminishing returns.** Each death grants `~6 + 0.22×run XP`, then scales by `90 / (90 + current Spark)`. Later deaths help less.
2. **Soft ceiling.** Spark bonus is `1 - e^(-Spark / n)`, approaching **+30% damage** and **+18% fire rate**. It never goes higher.
3. **No farm.** Rooms spawn a fixed swarm and never respawn. Trail HP and swarm size scale faster than Spark, so the last stretch still hurts.

Stickers still buy Lucky Pins and pile size between runs. Spark is only for guns.

## The loop

1. Run the candy trail. Hold WASD or arrows (or tap the floor).
2. Hold Space (or Pew on a phone) to auto-fire the costume on top of the pile.
3. When a costume flops, **Wear** or **Snack**.
4. Wear: put the outfit on and use its gun. Snack: take coins, and King Empty keeps that costume.
5. Follow the trail. King Empty waits at the end, wearing every outfit you skipped.

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

Progress lives in the browser (`localStorage`). Stickers and Spark both persist between runs.

## Controls

| Action | Keys |
| --- | --- |
| Run | Hold WASD, arrows, or vim hjkl |
| Walk toward a spot | Click the floor |
| Shoot | Hold Space or F |
| Wear / Snack | 1 / 2 |
| Pause | Esc |

On a phone, hold the d-pad and hold **Pew**.

## License

All original code and writing in this repository are yours to use for this project.
