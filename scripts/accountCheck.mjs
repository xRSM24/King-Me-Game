import { checkPassword, hashPassword, makeToken, normalizeEmail, readToken, studioEmail, verifyPassword } from "../shared/auth.mjs";
import {
  accountMailOk,
  bumpStats,
  emptyStats,
  handleAccount,
  MAIL_OK_KEY,
  mergeHistory,
  mergeProgress,
  setMailListed,
  signupMailOk,
} from "../shared/accountApi.mjs";

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok  ${msg}`);
}

assert(normalizeEmail("  Ada@Hop.example ") === "ada@hop.example", "email folds");
assert(normalizeEmail("nope") === "", "bad email rejected");
assert(checkPassword("short") !== "", "short password rejected");
assert(checkPassword("longenough") === "", "8-char password ok");

const { salt, hash } = hashPassword("longenough");
assert(verifyPassword("longenough", salt, hash), "password verifies");
assert(!verifyPassword("wrongwrong", salt, hash), "wrong password fails");

const token = makeToken("hopper-1", "unit-secret");
assert(readToken(token, "unit-secret") === "hopper-1", "token reads");
assert(readToken(token, "other-secret") === "", "bad secret fails");
assert(readToken("not.a.token", "unit-secret") === "", "junk token fails");

const merged = mergeProgress(
  { meta: { notches: 4, wins: 1 }, climb: { v: 1 }, history: [], name: "Ivory", updatedAt: 20, clearClimb: false },
  { meta: { notches: 9, wins: 0 }, climb: { v: 9 }, history: [], name: "Oak", updatedAt: 10 },
);
assert(merged.meta.notches === 9, "stars take the max");
assert(merged.meta.wins === 1, "wins take the max");
assert(merged.climb.v === 1, "newer climb wins");

const cleared = mergeProgress(
  { meta: {}, climb: null, history: [], name: "", updatedAt: 50, clearClimb: true },
  { meta: {}, climb: { v: 9 }, history: [], name: "", updatedAt: 10 },
);
assert(cleared.climb == null, "clearClimb drops the paused run");

const restored = mergeProgress(
  { meta: {}, climb: null, history: [], name: "", updatedAt: 50, clearClimb: false },
  { meta: {}, climb: { v: 3 }, history: [], name: "", updatedAt: 10 },
);
assert(restored.climb.v === 3, "empty phone keeps the cloud climb");

const hops = mergeHistory(
  [{ id: "a", at: 1, kind: "climb-win", title: "Crown", board: 6, hops: 10, moves: 10, stars: 1 }],
  [{ id: "a", at: 1, kind: "climb-win", title: "Crown", board: 6, hops: 10, moves: 10, stars: 1 }, { id: "b", at: 2, kind: "daily-win", title: "Daily", board: 1, hops: 4, moves: 8, stars: 1 }],
);
assert(hops.length === 2, "history unions by id");

const stats = bumpStats(emptyStats(), "signup");
assert(stats.accounts === 1 && stats.signups === 1, "signup counts");

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

async function accountMailChecks() {
  const rival = "rival@hop.example";
  let clobbered = false;
  const raceStore = {
    bag: {},
    async getJSON(key) {
      return Object.hasOwn(this.bag, key) ? this.bag[key] : null;
    },
    async setJSON(key, value) {
      this.bag[key] = value;
      if (key === MAIL_OK_KEY && !clobbered && !value.includes(rival)) {
        this.bag[key] = [rival];
        clobbered = true;
      }
    },
    async delete(key) {
      delete this.bag[key];
    },
  };
  await setMailListed(raceStore, "Ada@Hop.example", true);
  const racedList = await raceStore.getJSON(MAIL_OK_KEY);
  assert(racedList.includes("ada@hop.example"), "mail-ok retry restores ada after clobber");
  assert(racedList.includes(rival), "mail-ok retry preserves rival after clobber");

  let noOpWrites = 0;
  const noOpStore = {
    bag: {},
    async getJSON(key) {
      return Object.hasOwn(this.bag, key) ? this.bag[key] : null;
    },
    async setJSON(key, value) {
      noOpWrites += key === MAIL_OK_KEY ? 1 : 0;
      this.bag[key] = value;
    },
  };
  await setMailListed(noOpStore, "ada@hop.example", true);
  noOpStore.bag[MAIL_OK_KEY] = [...noOpStore.bag[MAIL_OK_KEY], rival];
  await setMailListed(noOpStore, "ada@hop.example", true);
  assert(noOpWrites === 1, "matching mail-ok membership does not write");
  assert(noOpStore.bag[MAIL_OK_KEY].includes(rival), "mail-ok no-op preserves rival");

  const signupListFailureStore = memStore();
  const signupListSetJSON = signupListFailureStore.setJSON;
  signupListFailureStore.setJSON = async function setJSON(key, value) {
    if (key === MAIL_OK_KEY) throw new Error("mail-ok unavailable");
    await signupListSetJSON.call(this, key, value);
  };
  const signedDespiteListFailure = await handleAccount({
    op: "signup",
    method: "POST",
    body: { email: "willow@hop.example", password: "longenough", mailOk: true, history: [], meta: {}, updatedAt: 1 },
    auth: "",
    store: signupListFailureStore,
  });
  assert(signedDespiteListFailure.status === 200, "signup survives mail-ok write failure");
  assert(signedDespiteListFailure.body.mailOk === true, "signup preserves public mailOk after list failure");

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

  const deleted = await handleAccount({
    op: "signup",
    method: "POST",
    body: { email: "elm@hop.example", password: "longenough", mailOk: true, history: [], meta: {}, updatedAt: 3 },
    auth: "",
    store,
  });
  assert((await store.getJSON(MAIL_OK_KEY)).includes("elm@hop.example"), "mail-ok lists elm before delete");
  const deleteResult = await handleAccount({
    op: "delete",
    method: "POST",
    body: { token: deleted.body.token, password: "longenough" },
    auth: `Bearer ${deleted.body.token}`,
    store,
  });
  assert(deleteResult.status === 200, "delete opted-in account 200");
  assert(!(await store.getJSON(MAIL_OK_KEY)).includes("elm@hop.example"), "delete removes opted-in email from mail-ok");

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
}

await accountMailChecks();

if (process.exitCode) {
  console.error("account checks failed");
  process.exit(1);
}
console.log("account checks passed");
