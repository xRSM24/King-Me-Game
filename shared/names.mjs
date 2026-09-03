/** Kid-safe nicknames. Shared by the game, the Vite preview board, and Netlify. */

export const NAME_MAX = 16;

const BLOCKED = new Set(
  [
    "anal",
    "anus",
    "arse",
    "ass",
    "asshole",
    "bastard",
    "bitch",
    "blowjob",
    "boob",
    "boobs",
    "clit",
    "cock",
    "coon",
    "crap",
    "cunt",
    "dick",
    "dildo",
    "dyke",
    "fag",
    "faggot",
    "fuck",
    "fucker",
    "fucking",
    "homo",
    "horny",
    "jizz",
    "kike",
    "nazi",
    "nigga",
    "nigger",
    "orgasm",
    "penis",
    "piss",
    "porn",
    "pussy",
    "rape",
    "rapist",
    "retard",
    "sex",
    "sexy",
    "shit",
    "slut",
    "spic",
    "suck",
    "tits",
    "tranny",
    "twat",
    "vagina",
    "wank",
    "whore",
  ].map((w) => w.toLowerCase()),
);

export function foldName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/[^a-z0-9]/g, "");
}

export function isBlockedName(raw) {
  const folded = foldName(raw);
  if (!folded) return false;
  if (BLOCKED.has(folded)) return true;
  for (const word of BLOCKED) {
    if (word.length >= 5 && folded.includes(word)) return true;
  }
  const tokens = String(raw)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => foldName(t))
    .filter(Boolean);
  return tokens.some((t) => BLOCKED.has(t));
}

export function tidyName(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^\p{L}\p{N} \-']/gu, "").replace(/\s+/g, " ").trim();
}

/** Letters, numbers, space, hyphen, apostrophe. 2–16 characters, or null. */
export function tryName(raw) {
  const t = tidyName(raw).slice(0, NAME_MAX);
  if (t.length < 2) return null;
  if (isBlockedName(t)) return null;
  return t;
}

export function nameProblem(raw) {
  const t = tidyName(raw);
  if (!t) return "Type a name — two letters at least.";
  if (t.length < 2) return "A bit longer — two letters at least.";
  if (isBlockedName(t)) return "Pick a kinder name. No mean words.";
  return null;
}

export function sanitizeName(raw) {
  return tryName(raw) ?? "Ivory";
}
