# App Store and Google Play

Checkmate! is a **native wrapper** around the bundled game (Capacitor), not a window onto the website. The climb, Stars, Oops, and How to Play run with the radio off. Daily Challenge scores still talk to `https://jumpgrave-ajrr1z.netlify.app` so everyone shares one fewest-moves list.

This Linux workspace cannot sign an iPhone build. Archive on a Mac with Xcode. Android can be built on any machine with Android Studio.

There are **no ads and no in-app purchases**. That is on purpose for a kids’ game. Apple and Google do not require monetization.

## What reviewers will look for

- Bundle ID `app.checkmate.climb` (change it in `capacitor.config.ts` if you already used that id).
- Privacy URL (must be **public**, even if the game site is passworded): `https://jumpgrave-ajrr1z.netlify.app/privacy.html`
- Support URL: `https://jumpgrave-ajrr1z.netlify.app/support.html`
- Contact: ravioli2332@gmail.com
- Age rating **4+**. Not the Kids Category unless you also add the Kids Category extra contracts.
- User-generated content: nicknames on the daily board. Mean words are blocked. **Hide** removes a name from the shared list.
- Encryption question: **No** — only HTTPS to the leaderboard (exempt). The iOS target sets `ITSAppUsesNonExemptEncryption` to false.
- App Tracking Transparency: do **not** add it. We do not track.

### App Privacy labels (nutrition)

| Type | Linked to identity | Used for tracking | Why |
| --- | --- | --- | --- |
| Name (nickname) | No | No | Optional daily leaderboard |
| Gameplay (climb, Stars) | No | No | Stays on the device |
| Location, contacts, photos, IDFA | — | — | Not collected |

## Mac: iPhone / iPad

1. Apple Developer Program ($99 / year).
2. On a Mac: `npm install && npm run icons && npm run sync && npm run ios`
3. In Xcode: signing team, unique bundle id if needed, iPhone + iPad (portrait).
4. Screenshots: 6.7" iPhone and 13" iPad, dark felt, title + a mid-climb board. No lorem.
5. Review notes: “The six-board climb works offline. Daily pins need a network. Type a nickname only if you want it on today’s board. Hide reports a name. No account, no ads, no IAP.”
6. Archive → App Store Connect.

## Google Play (Android)

The Android project is already in `android/`. Package name **`app.checkmate.climb`**. Target SDK **35**. You do **not** need a Mac. You do need Android Studio (or the SDK) on your computer, a Play Console account, and a **public** privacy URL.

Play still does not require ads or IAP.

### 1. Account

Play Console is a one-time ~$25 fee (not yearly). Sign in with a Google account at [play.google.com/console](https://play.google.com/console).

If this is a **personal** developer account created after 13 Nov 2023, Google will not let you go public until a **closed test** has at least **12 testers opted in for 14 days in a row**. Friends and family with Google accounts are enough. Organization / D-U-N-S accounts skip that gate.

### 2. Build an AAB (not an APK)

Play rejects a raw APK for new apps. You upload an Android App Bundle.

```bash
npm install
npm run android
```

In Android Studio: **Build → Generate Signed App Bundle**. First time, create a keystore (`checkmate.jks`) and keep that file and its passwords somewhere safe — losing it means you cannot update the listing. On the first upload, enroll in **Play App Signing** (default).

High-res icon: `public/icon-512.png` (512×512). Feature graphic: `resources/play-feature.png` (1024×500). Phone screenshots: title screen + a mid-climb board, portrait, no status-bar clutter.

### 3. Store listing (paste)

- **App name:** Checkmate!
- **Short description (80):** `Kid-friendly checkers. Six boards to the Crown. No ads.`
- **Full description:**

```
Hop your pieces. Capture the Enemy. Pick a power. Beat the Crown in six boards.

Checkmate! is a checkers climb for families. Each New climb rolls a fresh path. Continue waits if you close the app. Today’s Daily Challenge is the same hard board for everyone, with a fewest-moves list.

The climb works with the radio off. Daily pins need a network so the shared board stays fair.

No ads. Nothing to buy. No account. Type a nickname only if you want it on today’s list. Hide takes a mean name off the board.

Colorblind and Motion toggles live on the title. One Oops take-back per climb board.
```

- **Category:** Games → Board
- **Tags:** checkers, board, puzzle, kids, family
- **Contact:** ravioli2332@gmail.com
- **Privacy:** `https://jumpgrave-ajrr1z.netlify.app/privacy.html` (must load **without** a Netlify login)
- **Support:** `https://jumpgrave-ajrr1z.netlify.app/support.html`

Skip **Designed for Families / Kids** unless you want the extra kids-program forms. A 3+ / Everyone rating is enough.

### 4. Content rating

IARC questionnaire: this is a board game, no violence beyond capturing pieces, no user chat, optional nickname on a scoreboard, no location, no ads. Expect **Everyone / PEGI 3**. Declare **no ads**.

### 5. Data safety (Play’s privacy form)

| Question | Answer |
| --- | --- |
| Does the app collect data? | Yes (only if they pin a Daily score) |
| Name | Collected, **not** linked to identity, **not** for ads, ephemeral-ish public scoreboard |
| Gameplay / app activity | Collected **on device** (climb, Stars). Not shared off the device |
| Location, contacts, photos, files, audio, health, financial, device IDs | Not collected |
| Data sold / used for ads / tracking | No |
| Encrypted in transit | Yes (HTTPS) |
| Users can request deletion | Yes — email ravioli2332@gmail.com |

Internet permission is only for the daily board. The climb does not need it.

### 6. Closed test, then production

1. Finish the listing, rating, and Data safety (Play blocks a release until those are done).
2. **Testing → Closed testing** → upload the AAB → add tester Gmail addresses → send them the opt-in link. They must open it and install from Play, not a sideloaded APK.
3. Keep **12+ opted in for 14 days**. If someone drops off, the clock can reset.
4. Dashboard → **Apply for production access**. Say: families play the six-board climb; testers used Hide and Daily; no account; no ads.
5. Production release: same AAB or a new one with `versionCode` bumped (`android/app/build.gradle`).

### 7. Review notes (paste)

The six-board climb works offline. Daily Challenge pins need a network to `jumpgrave-ajrr1z.netlify.app`. Nicknames are optional and filtered. Hide reports a name. No ads, no IAP, no login. Back key opens Menu, then Home.

## After you ship a binary

Keep `npm run publish` for the website and the daily API. Store builds ship the `dist` folder from `npm run sync`. Bump `version` in `package.json` and the native version codes together.
