import { mergeEndlessRow, sortEndlessScores } from "../shared/endlessApi.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const a = mergeEndlessRow([], "Ivory", 4, 100);
assert(a[0].rounds === 4, "first pin");
const worse = mergeEndlessRow(a, "Ivory", 3, 200);
assert(worse[0].rounds === 4 && worse[0].at === 100, "worse does not replace");
const better = mergeEndlessRow(a, "ivory", 5, 300);
assert(better[0].rounds === 5 && better[0].at === 300, "better replaces same name");
const two = mergeEndlessRow(better, "Oak", 5, 400);
assert(two[0].name === "ivory" && two[1].name === "Oak", "tie keeps earlier at first");
const sorted = sortEndlessScores([
  { name: "A", rounds: 2, at: 1 },
  { name: "B", rounds: 9, at: 2 },
]);
assert(sorted[0].name === "B", "highest rounds first");
console.log("endless api checks ok");
