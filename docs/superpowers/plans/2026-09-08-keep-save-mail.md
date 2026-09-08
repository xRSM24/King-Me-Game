# Keep-save hop book + news mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a climb Crown or loss (and on Save hops), ask **Keep your save? Enter your email!**, store the hop book on Netlify, and treat news mail as on unless they uncheck it.

**Architecture:** Keep the existing `/api/account/*` hop book. Add `mailOk` / `mailOkAt` on the account blob, a `mail-ok` email list blob for studio, and a `mail` op to toggle. Client copy and form markup live in `keepSave.ts` so `game.ts` only mounts it. No mailer, no Google/Apple, no magic links.

**Tech Stack:** Vite, TypeScript, DOM/CSS, Netlify Blobs (`jumpgrave-daily`), `npm test` (`tsc --noEmit`, `crownCheck.ts`, `powerCheck.ts`, `scripts/accountCheck.mjs`). Dev accounts: gitignored `data/accounts.json`. Live: `https://jumpgrave-ajrr1z.netlify.app`. Do not run `npm run publish`.

## Global Constraints

- Product title is King Me; package / localStorage / Netlify slug stay `jumpgrave`.
- Headline everywhere this ask appears: `Keep your save? Enter your email!`
- Play, Continue, Daily, and the climb stay free. Do not gate hops on email.
- News checkbox starts **checked**. Signup stores `mailOk: true` unless they uncheck. Login does not change `mailOk`. Old accounts with no field stay `false`.
- Password still required (min 8). Store salt+scrypt hash, never the raw password.
- Emails live in Netlify Blobs (or `data/accounts.json` on `npm run dev`). Device keeps `jumpgrave-session-v1` token only.
- Daily end has no keep-save form.
- Ask a grown-up. No shop, ads, DLC, tracking pixels, Sign in with Google/Apple.
- Maple/walnut frogs, oak/ivory/gold UI. No purple.
- Do not auto-publish. Do not commit android/ios/`play-feature.png` line-ending churn.
- Do not create git commits unless the user explicitly asked to commit in this session. If a task says Commit and they have not asked, skip that step.
- Playtest on `http://localhost:43181/`. Do not click New climb on `http://127.0.0.1:43181/` (real Continue save).

**Spec:** `docs/superpowers/specs/2026-09-08-keep-save-mail-design.md`

---

## File structure

| File | Responsibility |
| --- | --- |
| `shared/accountApi.mjs` | `signupMailOk`, `accountMailOk`, `mail-ok` blob helpers; signup/login/`mail`/insight |
| `scripts/accountCheck.mjs` | Memory-store tests for `handleAccount` mail rules |
| `src/game/account.ts` | `Session.mailOk`; `createAccount(..., mailOk)`; `setMailOk` |
| `src/game/keepSave.ts` | Headline, `shouldOfferKeepSave`, form HTML |
| `src/game/powerCheck.ts` | Client copy/offer tests |
| `src/game/game.ts` | Mount form on climb end + Save hops; Account news toggle; studio list |
| `src/style.css` | Keep-save form + checkbox |
| `index.html` | How to Play + in-app Privacy sentences |
| `public/privacy.html` | Live privacy |
| `STORE.md` | Nutrition: Developer communications unless they uncheck |

Do not add React. Do not add a mail-sending function.

---

### Task 1: Server mailOk + memory-store tests

**Files:**
- Modify: `shared/accountApi.mjs`
- Modify: `shared/accountApi.d.ts`
- Modify: `scripts/accountCheck.mjs`

**Interfaces:**
- Consumes: existing `handleAccount`, `writeAccount`, `publicMe`, `AccountStore`
- Produces:
  - `signupMailOk(body: unknown): boolean` — `false` only if `body.mailOk === false`; otherwise `true`
  - `accountMailOk(account: unknown): boolean` — `true` only if `account.mailOk === true` (missing → `false`)
  - `MAIL_OK_KEY = "mail-ok"` blob: `string[]` of emails currently `mailOk`
  - `setMailListed(store, email, on): Promise<void>`
  - `handleAccount` signup writes `mailOk` / `mailOkAt`; login ignores `body.mailOk`; new `op: "mail"` POST `{ mailOk }`; insight studio body `{ stats, mailOk, mailList }`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/accountCheck.mjs` (keep existing asserts). Import `handleAccount`, `signupMailOk`, `accountMailOk` from `../shared/accountApi.mjs`. Import `studioEmail` from `../shared/auth.mjs`.

```js
function memStore() {
  const bag = {};
  return {
    async getJSON(key) {
      return Object.hasOwn(bag, key) ? bag[key] : null;
    },
    async setJSON(key, value) {
      bag[key] = value;
    },
    async delete(key) {
      delete bag[key];
    },
  };
}

assert(signupMailOk({ mailOk: false }) === false, "explicit false stays false");
assert(signupMailOk({}) === true, "omitted signup mailOk is true");
assert(signupMailOk({ mailOk: true }) === true, "explicit true stays true");
assert(accountMailOk({}) === false, "old account with no field is false");
assert(accountMailOk({ mailOk: true }) === true, "stored true reads true");

const store = memStore();
const signed = await handleAccount({
  op: "signup",
  method: "POST",
  body: { email: "ada@hop.example", password: "longenough", mailOk: true, name: "Ada", history: [], meta: {}, updatedAt: 1 },
  auth: "",
  store,
});
assert(signed.status === 200, "signup 200");
assert(signed.body.mailOk === true, "publicMe includes mailOk true");
assert((await store.getJSON("mail-ok")).includes("ada@hop.example"), "mail-ok list has ada");

const quiet = await handleAccount({
  op: "signup",
  method: "POST",
  body: { email: "oak@hop.example", password: "longenough", mailOk: false, history: [], meta: {}, updatedAt: 1 },
  auth: "",
  store,
});
assert(quiet.body.mailOk === false, "unchecked signup is hops only");
assert(!(await store.getJSON("mail-ok")).includes("oak@hop.example"), "mail-ok list skips oak");

const loginFlip = await handleAccount({
  op: "login",
  method: "POST",
  body: { email: "oak@hop.example", password: "longenough", mailOk: true, history: [], meta: {}, updatedAt: 2 },
  auth: "",
  store,
});
assert(loginFlip.body.mailOk === false, "login does not turn news on");

const token = signed.body.token;
const toggled = await handleAccount({
  op: "mail",
  method: "POST",
  body: { token, mailOk: false },
  auth: `Bearer ${token}`,
  store,
});
assert(toggled.body.mailOk === false, "mail op can turn news off");
assert(!(await store.getJSON("mail-ok")).includes("ada@hop.example"), "mail-ok drops ada");

const studio = await handleAccount({
  op: "signup",
  method: "POST",
  body: { email: studioEmail(), password: "longenough", mailOk: true, history: [], meta: {}, updatedAt: 3 },
  auth: "",
  store,
});
const insight = await handleAccount({
  op: "insight",
  method: "POST",
  body: { token: studio.body.token },
  auth: `Bearer ${studio.body.token}`,
  store,
});
assert(insight.status === 200, "studio insight 200");
assert(typeof insight.body.mailOk === "number", "studio mailOk count");
assert(Array.isArray(insight.body.mailList), "studio mailList is an array");
```

Wrap new `handleAccount` calls in an `async function accountMailChecks()` and `await` it at the bottom because `accountCheck.mjs` is currently top-level sync.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node scripts/accountCheck.mjs`

Expected: FAIL / `signupMailOk is not a function`.

- [ ] **Step 3: Implement helpers + handleAccount**

In `shared/accountApi.mjs`:

```js
export const MAIL_OK_KEY = "mail-ok";

export function signupMailOk(body) {
  return body?.mailOk !== false;
}

export function accountMailOk(account) {
  return !!(account && typeof account === "object" && account.mailOk === true);
}

export async function loadMailList(store) {
  const raw = await store.getJSON(MAIL_OK_KEY);
  return Array.isArray(raw) ? raw.map(String) : [];
}

export async function setMailListed(store, email, on) {
  const e = String(email || "").toLowerCase();
  const cur = await loadMailList(store);
  const next = on ? [...new Set([...cur, e])] : cur.filter((x) => x !== e);
  await store.setJSON(MAIL_OK_KEY, next);
}
```

Signup account object: add `mailOk: signupMailOk(body)`, `mailOkAt: Date.now()`. After `writeAccount`, `await setMailListed(store, email, account.mailOk)`.

`publicMe`: add `mailOk: accountMailOk(account)`.

Login: do **not** read `body.mailOk`. Do not change `account.mailOk`.

New branch before the 404:

```js
if (action === "mail" && verb === "POST") {
  const session = await requireSession(store, auth, body?.token);
  if (session.error) return { status: session.status, body: { error: session.error } };
  const on = !!body?.mailOk;
  session.account.mailOk = on;
  session.account.mailOkAt = Date.now();
  await writeAccount(store, session.account);
  await setMailListed(store, session.account.email, on);
  return { status: 200, body: publicMe(session.account, session.save, session.token) };
}
```

Insight studio success body:

```js
const list = await loadMailList(store);
return {
  status: 200,
  body: { stats: await statsOf(store), mailOk: list.length, mailList: list },
};
```

Delete account: `await setMailListed(store, session.account.email, false)` before deletes.

Update `shared/accountApi.d.ts` with `signupMailOk`, `accountMailOk`, `MAIL_OK_KEY`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node scripts/accountCheck.mjs`

Expected: `account checks passed` and exit 0.

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add shared/accountApi.mjs shared/accountApi.d.ts scripts/accountCheck.mjs
git commit -m "Store hop-book news mail as mailOk, default on for new signups."
```

---

### Task 2: Client session + createAccount mailOk

**Files:**
- Modify: `src/game/account.ts`
- Modify: `src/game/powerCheck.ts`

**Interfaces:**
- Consumes: `publicMe.mailOk`, `/api/account/mail`
- Produces:
  - `Session.mailOk: boolean`
  - `sessionMailOk(raw): boolean`
  - `createAccount(email: string, password: string, mailOk?: boolean): Promise<Session>` — default `mailOk` true
  - `signIn` unchanged (no mailOk in the body)
  - `setMailOk(on: boolean): Promise<Session | null>`

- [ ] **Step 1: Write the failing test**

In `src/game/powerCheck.ts`:

```ts
import { sessionMailOk } from "./account.ts";
assert(sessionMailOk(null) === false, "no session is not news mail");
assert(sessionMailOk({ mailOk: true }) === true, "session mailOk true");
assert(sessionMailOk({}) === false, "missing mailOk is false");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: FAIL missing `sessionMailOk` export.

- [ ] **Step 3: Implement**

`Session` add `mailOk: boolean`. `loadSession` / `remember`: `mailOk: !!p.mailOk` / `!!reply.mailOk`.

```ts
export function sessionMailOk(raw: { mailOk?: boolean } | null | undefined): boolean {
  return raw?.mailOk === true;
}

export async function createAccount(email: string, password: string, mailOk = true): Promise<Session> {
  const data = await requestAccount("signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, mailOk, ...packLocal() }),
  });
  const session = remember(data);
  if (!session) throw new Error("Could not open the hop book.");
  return session;
}

export async function setMailOk(on: boolean): Promise<Session | null> {
  const session = loadSession();
  if (!session) return null;
  const data = await requestAccount("mail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ token: session.token, mailOk: on }),
  });
  return remember(data);
}
```

`signIn` body must **not** send `mailOk`.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: pass.

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/game/account.ts src/game/powerCheck.ts
git commit -m "Send mailOk on hop-book signup and keep it on the session."
```

---

### Task 3: keepSave copy + form HTML

**Files:**
- Create: `src/game/keepSave.ts`
- Modify: `src/game/powerCheck.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `KEEP_SAVE_HEAD = "Keep your save? Enter your email!"`
  - `KEEP_SAVE_LEAD = "Ask a grown-up. This phone already has the climb. The book lets hops follow another phone."`
  - `KEEP_SAVE_NEWS = "Email me about Daily and King Me news."`
  - `shouldOfferKeepSave(signedIn: boolean, mode: "run" | "daily"): boolean`
  - `keepSaveFormHtml(opts: { idPrefix: string; showNotNow: boolean }): string`

- [ ] **Step 1: Write the failing test**

In `src/game/powerCheck.ts`:

```ts
import { KEEP_SAVE_HEAD, keepSaveFormHtml, shouldOfferKeepSave } from "./keepSave.ts";

assert(KEEP_SAVE_HEAD === "Keep your save? Enter your email!", "keep-save headline is locked");
assert(shouldOfferKeepSave(false, "run") === true, "unsigned climb end offers keep-save");
assert(shouldOfferKeepSave(true, "run") === false, "signed-in climb end does not ask again");
assert(shouldOfferKeepSave(false, "daily") === false, "daily end has no keep-save");
const html = keepSaveFormHtml({ idPrefix: "keep", showNotNow: true });
assert(html.includes(KEEP_SAVE_HEAD), "form stamps the headline");
assert(html.includes("type=\"checkbox\"") && html.includes("checked"), "news box starts checked");
assert(html.includes("Not now"), "end form can dismiss");
assert(!keepSaveFormHtml({ idPrefix: "acct", showNotNow: false }).includes("Not now"), "Save hops has no Not now");
```

- [ ] **Step 2: Run to verify fail**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: missing module `keepSave.ts`.

- [ ] **Step 3: Implement `src/game/keepSave.ts`**

```ts
export const KEEP_SAVE_HEAD = "Keep your save? Enter your email!";
export const KEEP_SAVE_LEAD =
  "Ask a grown-up. This phone already has the climb. The book lets hops follow another phone.";
export const KEEP_SAVE_NEWS = "Email me about Daily and King Me news.";

export function shouldOfferKeepSave(signedIn: boolean, mode: "run" | "daily"): boolean {
  return !signedIn && mode === "run";
}

export function keepSaveFormHtml(opts: { idPrefix: string; showNotNow: boolean }): string {
  const p = opts.idPrefix;
  return `
    <form id="${p}-save-form" class="account-form keep-save">
      <h2>${KEEP_SAVE_HEAD}</h2>
      <p class="lead">${KEEP_SAVE_LEAD}</p>
      <label for="${p}-email">Email</label>
      <input id="${p}-email" name="email" type="email" autocomplete="username" inputmode="email" required maxlength="80" />
      <label for="${p}-password">Password</label>
      <input id="${p}-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="64" />
      <label class="keep-news"><input id="${p}-news" name="news" type="checkbox" checked /> ${KEEP_SAVE_NEWS}</label>
      <div class="account-actions">
        <button name="intent" value="signup" type="submit">Keep my save</button>
        <button class="ghost" name="intent" value="login" type="submit">I have a book</button>
      </div>
      ${opts.showNotNow ? `<button class="ghost" data-cmd="skip-keep-save" type="button">Not now</button>` : ""}
      <p class="quiet" id="${p}-save-note"></p>
    </form>`;
}
```

These strings are constants with no user input. Do not interpolate player names here.

- [ ] **Step 4: Run tests**

Run: `node --experimental-strip-types src/game/powerCheck.ts`

Expected: `powerCheck ok`.

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/game/keepSave.ts src/game/powerCheck.ts
git commit -m "Add the Keep your save form copy and markup."
```

---

### Task 4: Save hops + Account news toggle

**Files:**
- Modify: `src/game/game.ts` (`renderAccount`, `submitAccount`, `bind` submit)
- Modify: `src/style.css` (`.keep-news`, `.keep-save`)

**Interfaces:**
- Consumes: `keepSaveFormHtml`, `createAccount`, `signIn`, `setMailOk`, `loadSession().mailOk`
- Produces: unsigned Account screen uses keep-save form (`idPrefix: "acct"`, `showNotNow: false`). Signed-in Account shows a News mail checkbox bound to `setMailOk`.

- [ ] **Step 1: No extra unit test.** Gate: `npm test` still green; Task 8 browser.

- [ ] **Step 2: Wire unsigned `renderAccount`**

Replace the unsigned heading/form with `keepSaveFormHtml({ idPrefix: "acct", showNotNow: false })` plus Hop history / Back below.

Submit: if `e.target.id === "acct-save-form"` or `"keep-save-form"`, preventDefault, read email/password/news, `intent` from submitter.

```ts
private newsChecked(prefix: string): boolean {
  const el = document.getElementById(`${prefix}-news`);
  return el instanceof HTMLInputElement ? el.checked : true;
}

private async submitKeepSave(prefix: string, intent: string): Promise<void> {
  const emailEl = document.getElementById(`${prefix}-email`);
  const passEl = document.getElementById(`${prefix}-password`);
  const note = document.getElementById(`${prefix}-save-note`);
  const email = emailEl instanceof HTMLInputElement ? emailEl.value : "";
  const password = passEl instanceof HTMLInputElement ? passEl.value : "";
  const mailOk = this.newsChecked(prefix);
  this.accountBusy = true;
  if (note) {
    note.textContent = "Opening the hop book…";
    note.classList.remove("danger");
  }
  try {
    if (intent === "signup") await createAccount(email, password, mailOk);
    else await signIn(email, password);
    this.meta = loadMeta();
    this.applyPrefs();
    this.paintAccount();
    if (this.screen === "account") this.renderAccount();
    if (this.screen === "end") this.renderEnd();
    this.cheer("Hops can follow you.");
  } catch (err) {
    if (note) {
      note.textContent = err instanceof Error ? err.message : "Could not open the hop book.";
      note.classList.add("danger");
    }
  } finally {
    this.accountBusy = false;
  }
}
```

Signed-in Account: after the lead, add a News mail checkbox (`id="acct-news-toggle"`) checked iff `session.mailOk`. On `change`, `await setMailOk(el.checked)` then `renderAccount()`. Guard `accountBusy`.

- [ ] **Step 3: CSS**

```css
.keep-save h2 {
  text-align: left;
}
.keep-news {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  color: var(--ivory);
  font-weight: 700;
  text-align: left;
}
.keep-news input {
  margin-top: 4px;
  width: 1.15rem;
  height: 1.15rem;
  flex: 0 0 auto;
}
```

- [ ] **Step 4: Run `npm test`**

Expected: pass.

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add src/game/game.ts src/style.css
git commit -m "Put Keep your save on the hop book and a news toggle on Account."
```

---

### Task 5: Climb end form + Not now

**Files:**
- Modify: `src/game/game.ts` (`renderEnd`, `command`, submit bind, `finish`)

**Interfaces:**
- Consumes: `shouldOfferKeepSave(!!loadSession(), this.mode)`, `keepSaveFormHtml({ idPrefix: "keep", showNotNow: true })`
- Produces: climb end shows the form above Play again / Home when unsigned. `skip-keep-save` hides the form this visit. Daily unchanged.

- [ ] **Step 1:** Add `keepSaveSkip = false` on `Game`. `finish()` sets `this.keepSaveSkip = false`.

- [ ] **Step 2: `renderEnd` climb branch**

After the stats list, if `shouldOfferKeepSave(!!loadSession(), "run") && !this.keepSaveSkip`, append `keepSaveFormHtml({ idPrefix: "keep", showNotNow: true })`.

If signed in, append `Saving hops for {email}.` plus `We'll email Daily and King Me news. Turn that off in Account.` or `Hops only — no news mail.` using `session.mailOk`.

`command("skip-keep-save")`: `this.keepSaveSkip = true; this.renderEnd();`

Submit bind: `keep-save-form` → `submitKeepSave("keep", intent)`.

- [ ] **Step 3: Run `npm test`**

Expected: pass.

- [ ] **Step 4: Commit (only if the user asked)**

```bash
git add src/game/game.ts
git commit -m "Ask Keep your save on the climb end screen."
```

---

### Task 6: Privacy, How to Play, STORE.md

**Files:**
- Modify: `public/privacy.html`
- Modify: `index.html` (How to Play Save hops bullet; in-app Privacy if it still says password-hash only)
- Modify: `STORE.md`

**Copy:**

Hop book: grown-up email, password hash, nickname, Stars, paused climb, hop log — so another phone can sign in.

News: a new keep-save starts with news mail on. Uncheck the box, or turn News mail off in Account, or email ravioli2332@gmail.com. We do not sell the list. News is developer mail, not ads.

How to Play: after a Crown or a loss you may see Keep your save? Enter your email! News starts checked; uncheck to keep hops only.

STORE.md email row: Collected if they create an account. Linked. App functionality (restore). Developer communications unless they uncheck news. Not tracking.

- [ ] **Step 1: Edit the three files.** No unit test.

- [ ] **Step 2: Commit (only if the user asked)**

```bash
git add public/privacy.html index.html STORE.md
git commit -m "Say hop-book news mail starts on and how to turn it off."
```

---

### Task 7: Studio hop-data shows opted-in emails

**Files:**
- Modify: `src/game/account.ts` (`fetchInsight` return shape)
- Modify: `src/game/game.ts` `renderStudio`

**Interfaces:**
- Consumes: insight `{ stats, mailOk?: number, mailList?: string[] }`
- Produces: studio page shows `mailOk` count and an escaped `<ul>` of `mailList`. Lead: `Opted-in news mail. Do not paste this in public.` Empty: `Nobody asked for news mail yet.`

```ts
export async function fetchInsight(): Promise<{
  stats: InsightStats;
  mailOk: number;
  mailList: string[];
} | null>
```

- [ ] **Step 1: Change the signature and `renderStudio` together so `tsc` stays green.**

- [ ] **Step 2: Run `npm test`**

Expected: pass.

- [ ] **Step 3: Commit (only if the user asked)**

```bash
git add src/game/account.ts src/game/game.ts
git commit -m "Show studio the opted-in news mail list."
```

---

### Task 8: Browser check on localhost

**Files:** none except fixes if the pass finds a bug.

- [ ] **Step 1:** Open `http://localhost:43181/` (not 127.0.0.1). Reach a climb end (loss is enough).
- [ ] **Step 2:** Confirm headline `Keep your save? Enter your email!`, news box checked, Not now hides the form, Play again still works.
- [ ] **Step 3:** More → Save hops: same headline, no Not now, box checked.
- [ ] **Step 4:** Do not create a hop book with a real inbox unless the user provides one. Localhost fakes go to gitignored `data/accounts.json`.
- [ ] **Step 5:** Daily Challenge end must **not** show the keep-save form.

If something fails, fix in the matching task file and re-run `npm test`.

---

## Spec coverage

| Spec | Task |
| --- | --- |
| Headline locked | 3 |
| Climb end win/loss unsigned | 5 |
| Save hops same form | 4 |
| Password required | 1, 3, 4 |
| News checked by default; uncheck → mailOk false | 1, 3 |
| Login does not flip mailOk | 1 |
| Old accounts missing field → false | 1 |
| Account toggle | 4 |
| Daily no form | 3, 5 |
| Privacy / How / STORE | 6 |
| Studio count + private list | 7 |
| No mailer | (non-goal, no task) |
| localhost vs 127.0.0.1 | 8 |
