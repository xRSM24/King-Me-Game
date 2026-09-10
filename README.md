# King Me

Kid-friendly checkers with a climb. You hop **player pieces**. The other side is the **Enemy**. Capture, pick a power, and try to beat **the Crown** in six boards.

There are no ads and nothing to buy. The six-board climb works offline. Daily Challenge and the Endless all-time list need a network so everyone shares one board or rounds list.

## App Store / Play Store

This repo is ready to archive as a native app (Capacitor). iPhone: on a Mac, `npm install && npm run ios`. Android / Play: on any computer with Android Studio, `npm run android`. Listing copy, Data safety answers, and the 12-tester closed-test gate are in **STORE.md**.

Privacy (must stay publicly reachable for store review): **https://jumpgrave-ajrr1z.netlify.app/privacy.html**

## Play on a phone

The live site:

**https://jumpgrave-ajrr1z.netlify.app**

Or wait for the App Store / Play build from **STORE.md**. Add to Home Screen still works.

If Netlify is **private**, the website will ask you to sign in before the board loads. A store binary does **not** need that login to play the climb — only Daily and Endless pins talk to the site.

- **Site password** (best for family): type the password you set under Site configuration → Access control / Password protection.
- **Team login / SSO**: log in with the same Netlify account that owns the site.

The privacy and support pages must be public when you submit the app, even if the game itself stays passworded.

This Cursor Preview (`127.0.0.1`) only works on the machine running `npm run dev`.

Progress is stored on that device. Deleting the app or clearing the site data erases the local climb. An optional account (grown-up email + password) keeps Stars, a paused climb, and hop history so another phone can sign in.

## Play with a friend

Share the same live link:

**https://jumpgrave-ajrr1z.netlify.app**

If the site is private, they need the password (or a Netlify team login). This Cursor Preview is only on this machine — friends should use the Netlify URL, not `127.0.0.1`.

Each `npm run publish` rebuilds the same link. GitHub Actions no longer deploys on every `main` push (that burned Netlify credits). Run the **Publish King Me** workflow by hand, or `npm run publish`, when you actually want the live site updated.

## Netlify credits

Free is **300 credits a month**, then the site pauses until the next cycle. Netlify will not charge you. The low-credits warning is that cap, not a paid plan.

What spends them:

- **15 credits** per production deploy (`npm run publish`, or auto-deploy from Git)
- A little for Daily Challenge and Endless list function calls and page bandwidth

Playing the climb in the **app** or on `npm run dev` does not use Netlify credits. Only the live website, the shared daily board, and the Endless list do.

If you are low: in Netlify → Project configuration → Build & deploy, turn **off** auto-publish on git. One live deploy a week is plenty. Other sites on the same Netlify team share the same 300.

The daily fewest-moves board is **shared** for everyone who tests King Me — the live site, this preview, and a friend on their phone all sit on the same list. On a Drop with no functions, the game falls back to that same Netlify board; only a total API outage keeps scores in the local browser.

### Local

```bash
npm install
npm run dev
```

Open the URL Vite prints (this project pins **http://127.0.0.1:43181**).

## The goal

Every game: win six boards in a row. **New climb** rolls a fresh path (new sides, new felt color, new names). **Continue** is the same climb you paused. Later felts bring more Enemy pieces, nastier rules, and a sharper Enemy.

You will lose sometimes. That is OK. Captures become **Stars**, a little permanent boost with a ceiling, so the next First Hop is kinder but you never skip the climb.

## How it feels

- The first climb shows a one-time coach: drag your piece over the Enemy onto the star. That is a jump.
- Later boards pile on Enemy pieces, holes, bouncing jumps, and flying Kings.
- Combos yell their names. Crowns fanfare. Beating the Crown bursts petals.
- Captures are optional. A star appears only on a landing past an Enemy (or a pit). Other directions stay slide spots. After a capture, that frog may slide or Skip jump instead of taking the next Enemy.
- One **Oops** per climb board. Watch the Enemy hop, then take yours back if it stung. Today's board usually gives you **two**, unless a daily modifier says otherwise.
- When only Kings are left, if nobody jumps for 10 turns, whoever has more pieces wins — a lone King cannot run forever.
- Close the tab mid-climb: **Continue** waits on the title. Give up from Menu if you want Stars now.
- Colorblind and Motion toggles live on the title. Arrows + Enter hop on a keyboard.
- Pick a **name** on the title (That's me). It stays on this device and sits on today's leaderboard.
- Optional **account** (Save hops) keeps Stars and hop history if you switch phones. Play still works offline; the hop book waits until you are back online.

## Today's board

One hard felt per UTC day, **the same for you and your friends**, so the fewest-moves board is fair. Same pieces **and the same modifiers** for everybody. Some modifiers help you, some help the Enemy. **Oops count follows the modifier.** Clear it, pin your **move count** (a multi-jump is one move). Testers share one list at **https://jumpgrave-ajrr1z.netlify.app** — local `npm run dev` posts there too.

A climb is not shared. Tap **New climb** for a path nobody else has.

## Endless

Keep winning boards as long as you can. After each win you pick a treat for your kit — hold at most **three** (fill, then swap). Lose or Give up to pin your **round count** on the all-time list (most rounds cleared wins). **Continue Endless** on the title is a separate wait from climb **Continue**. Home pauses Endless; it does not pin.

## Powers

After each win you pick one that lasts the rest of the run:

- **Jump Back** — your pieces may jump all 4 diagonals (not just toward the Enemy). Quiet slides still go forward 1 square.
- **Super King** — your Kings slide any empty diagonal (a normal King steps 1)
- **Buddy Up** — after each capture, a new player piece sits on an empty square of your back row (the edge you started from)
- **Second Chance** — once this climb, if you lose every piece, one King comes back on the far row and hops every diagonal
- **Starting King** — every board, one of your pieces starts already a King
- **Extra Piece** — +1 player piece at the start of every board
- **Hop Party** — every 4 captures this climb, one random non-King player piece becomes a King
- **Far Jump** — once each turn, one regular piece may jump farther: over an Enemy, skip the next empty square, and land on the next dark square
- **Double Crown** — when one of your pieces becomes a King, a regular piece next to it becomes a King too
- **Trapdoor** — once this board, after you capture, the square you land on becomes a hole. Nobody may sit there after that. Jump over it onto the star past it
- **Scout** — one of your regular pieces starts closer to the middle

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

Progress lives in the browser (`localStorage`). Sign in and it also lives in the hop book (Netlify Blobs). Local `npm run dev` keeps accounts in `data/accounts.json` (gitignored).

## Controls

| Action | How |
| --- | --- |
| Select / slide | Drag a gold ring onto a spot |
| Hop | Drop on a cream spot, or tap then tap |
| Capture | Drop on a gold star past an Enemy (optional). A star is only that jump, not every diagonal. |
| Pit | Drop on the star past a black pit |
| Stop a combo | Slide onto a spot, or Skip jump |
| Take-back | Oops after the Enemy hops (×1 on the climb, daily follows today's modifier) |
| Pause / save | Menu → Go home (climb waits) |
| Today's board | Title → Daily Challenge (preview first, then hop today's board) |
| Endless | Title → Endless (Home waits; pin on lose or Give up) |
| Keyboard | Arrows, Enter, Escape |

## License

All original code and writing in this repository are yours to use for this project.
