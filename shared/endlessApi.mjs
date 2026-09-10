export const MAX_ENDLESS_ROUNDS = 999;
export const ENDLESS_LIST_CAP = 80;

export function sortEndlessScores(scores) {
  return [...scores].sort((a, b) => b.rounds - a.rounds || a.at - b.at);
}

export function mergeEndlessRow(scores, name, rounds, at) {
  const key = String(name).toLowerCase();
  const rest = scores.filter((score) => String(score.name).toLowerCase() !== key);
  const previous = scores.find((score) => String(score.name).toLowerCase() === key);
  if (!previous || rounds > previous.rounds) rest.push({ name, rounds, at });
  else rest.push(previous);
  return sortEndlessScores(rest).slice(0, ENDLESS_LIST_CAP);
}
