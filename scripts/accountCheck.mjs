import { checkPassword, hashPassword, makeToken, normalizeEmail, readToken, verifyPassword } from "../shared/auth.mjs";
import { bumpStats, emptyStats, mergeHistory, mergeProgress } from "../shared/accountApi.mjs";

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

if (process.exitCode) {
  console.error("account checks failed");
  process.exit(1);
}
console.log("account checks passed");
