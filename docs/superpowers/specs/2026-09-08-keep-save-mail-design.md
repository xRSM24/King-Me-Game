# Keep your save — hop book + optional news mail

Date: 2026-09-08  
Product: King Me (Vite + TypeScript + DOM/CSS, package `jumpgrave`)

## Problem

Continue, Stars, and the climb already live on this phone with no login. The optional hop book (grown-up email + password) already stores that progress on Netlify so another phone can sign in. Almost nobody opens **Save hops**, so almost no emails exist. The product goal is to collect **parent emails** for two jobs: restore hops, and mail about Daily and King Me news unless they uncheck the box.

Play must stay free. Kids must not be asked for their own inbox. News mail uses `mailOk`. New keep-save signups start with the news box **checked**. They can uncheck it before Keep my save, or turn news off later in Account.

## Goals

- Headline everywhere this ask appears: **Keep your save? Enter your email!**
- After a **climb** Crown or a **climb** loss, if they are not signed in, show that ask on the end screen (not Daily).
- **Save hops** uses the same headline and the same form.
- Creating an account still requires email + password (restore). Password is how the hop book opens on another phone. This slice does not add magic links or Google/Apple.
- A separate checkbox, **checked by default**: `Email me about Daily and King Me news.` They may uncheck it. Not required to create the book.
- Signed-in Account can turn news on or off later.
- Privacy page, How to Play, Support, and Play Store nutrition text name both uses.
- Studio (ravioli2332 hop-data) sees a **count** of news yeses and a **private** opted-in email list so you can mail people yourself. No in-app mailer, no cron, no Mailchimp.

## Non-goals

- Do not lock Play, Continue, Daily, or the climb behind email.
- Do not flip existing hop books to news (JSON with no `mailOk` stays false until they change it in Account or sign up again). New Keep my save signups follow the checkbox, which starts checked.
- Do not build scheduled Daily emails, unsubscribe HTTP, or a third-party ESP in this slice.
- Do not add Sign in with Google / Apple.
- Do not collect a child’s email on purpose. Copy still says ask a grown-up.
- Do not put emails on the public Daily board or anonymous hop-stats.
- Do not auto-publish Netlify. Do not mix Android/iOS line-ending churn into this work.
- No shop, ads, DLC, or tracking pixels.

## Player flow

### Not signed in — climb end (win or lose)

1. Current end copy and stats stay.
2. If `loadSession()` is null, the end body includes the keep-save form **above** Play again / Home.
3. Headline: `Keep your save? Enter your email!`
4. Lead (one line): `Ask a grown-up. This phone already has the climb. The book lets hops follow another phone.`
5. Fields: email, password (min 8, same rules as today).
6. Checkbox, **checked**: `Email me about Daily and King Me news.`
7. Buttons: `Keep my save` (signup) and `I have a book` (login). Login does not change news; the account’s stored `mailOk` wins.
8. Ghost: `Not now` — dismisses only this form (Play again / Home still work). Next finished climb asks again.
9. Success: same as today’s hop book (session + merge save). End screen swaps the form for `Saving hops for {email}.` If `mailOk`: `We'll email Daily and King Me news. Turn that off in Account.` If they unchecked: `Hops only — no news mail.`
10. Failure: inline note, stay on end. Do not wipe the climb result.

### Not signed in — Save hops (title More / pause)

Same headline, lead, fields, checkbox, Keep my save / I have a book. Back still exists. No `Not now` (they opened it on purpose).

### Signed in

- End screen does **not** ask again.
- Account screen: email shown; toggle **News mail** on/off (saves `mailOk` on the next sync). Copy: `On: Daily and King Me news. Off: hops only.`
- Title chip stays `Saving hops for {email}.`

### Daily end

No keep-save form. Daily already pins a **nickname**, not a hop book. Mixing two emails on one screen would confuse a Daily pin with a save.

## Data

Account blob (Netlify Blobs store `jumpgrave-daily`, keys `acct:…` / `acct-id:…`) gains:

- `mailOk`: boolean
- `mailOkAt`: number (ms) when they last changed it, or `0`

Signup: send the checkbox boolean. Checked (the default) → `true`. Unchecked → `false`. If an old client omits `mailOk` on **signup**, store `true` (same as the checked box). Accounts already in the store with no field still read as **false**.

Login POST ignores the checkbox (stored `mailOk` wins).

Signed-in toggle: existing `sync` (or a small `mail` op) writes `mailOk` / `mailOkAt`. Do not require password again for the toggle.

`publicMe` returns `mailOk` so the client can paint the toggle.

Studio `insight` / hop-data:

- Add `mailOk` count (how many accounts have `mailOk === true`).
- Studio-only list of opted-in emails (the session email must be `studioEmail()`). Not shown for anyone else. Not written to public hop-stats.

Delete account still removes the blob (email leaves the news list).

## Privacy and stores

Update `public/privacy.html` (and in-app Privacy if it duplicates):

- Hop book email: restore climb, Stars, hop log.
- News: on for a new keep-save unless they uncheck the box. Can turn off in Account or email ravioli2332@gmail.com.
- We do not sell the list. News is developer mail, not ads.
- Children: grown-up email. Play does not need an account.

Play / App Store nutrition (`STORE.md`):

- Email linked to identity: hop book (App functionality) and, unless they uncheck news, Developer communications. Not tracking.

How to Play **Save your hops** bullet: mention the end-screen ask and that news starts checked; uncheck to keep hops only.

## UI

Oak / ivory / gold. No purple. Headline in Mochiy (h2). Form matches existing `.account-form` / `.name-form` patterns. Checkbox is a real `<input type="checkbox" checked>` with a `<label>`. They can uncheck it.

`Keep my save` is the primary button. `I have a book` is ghost. Password stays required for both signup and login.

## Errors

Same network copy as today (`Hop book is offline.`, `That email already has a hopper.`, etc.). Checkbox state is preserved on a failed signup.

## Tests

- Signup with `mailOk: true` (or omitted on signup) stores true.
- Signup with `mailOk: false` stores false.
- Old account JSON without the field reads as false.
- Login does not flip `mailOk` from the client body.
- `normalizeEmail` / password rules unchanged.
- Studio list empty unless studio session.
- Client helper: climb end should offer keep-save only when `!session && mode === "run"`.

## Out of this spec

Sending the actual news mail. Unsubscribe URL. Physical postal address on a campaign (required when you *send*; add it the day you send, not in this slice).
