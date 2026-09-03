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

## Android / Play Console

1. Play Console account (one-time fee).
2. `npm run android` then Generate Signed Bundle (AAB).
3. Content rating questionnaire: everyone / PEGI 3. Declare no ads.
4. Privacy policy URL same as above.
5. Data safety: optional nickname for a public scoreboard; other saves on-device.

## After you ship a binary

Keep `npm run publish` for the website and the daily API. Store builds ship the `dist` folder from `npm run sync`. Bump `version` in `package.json` and the native version codes together.
