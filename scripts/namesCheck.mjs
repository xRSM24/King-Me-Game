import { isBlockedName, nameProblem, tryName } from "../shared/names.mjs";

function assert(ok, msg) {
  if (!ok) {
    console.error(`fail: ${msg}`);
    process.exitCode = 1;
  }
}

assert(tryName("Ivory") === "Ivory", "Ivory is allowed");
assert(tryName("A") === null, "one letter is too short");
assert(tryName("  bo  ") === "bo", "trim works");
assert(tryName("f u c k") === null, "spaced slur is blocked");
assert(tryName("sh1t") === null, "leetspeak shit is blocked");
assert(nameProblem("shit")?.includes("kinder"), "blocked names get a kinder hint");
assert(!isBlockedName("Cassie"), "Cassie is not ass");
assert(!isBlockedName("Skill"), "Skill is not blocked");
assert(tryName("Michelle") === "Michelle", "Michelle is allowed");

if (process.exitCode) {
  console.error("names check failed");
} else {
  console.log("names check ok");
}
