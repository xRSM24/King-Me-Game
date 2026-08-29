export interface Score {
  name: string;
  moves: number;
  at: number;
}

export interface DailyBoard {
  day: string;
  scores: Score[];
}

const LOCAL_KEY = "jumpgrave-daily-v1";
const NAME_KEY = "jumpgrave-player-name";

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || "Ivory";
  } catch {
    return "Ivory";
  }
}

export function hasName(): boolean {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    return !!tryName(raw ?? "");
  } catch {
    return false;
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

/** Letters, numbers, space, hyphen, apostrophe. 2–16 characters, or null if too short. */
export function tryName(raw: string): string | null {
  const t = raw.replace(/[^\p{L}\p{N} \-']/gu, "").replace(/\s+/g, " ").trim();
  if (t.length < 2) return null;
  return t.slice(0, 16);
}

export function commitName(raw: string): { name: string; saved: boolean } {
  const next = tryName(raw);
  if (!next) return { name: loadName(), saved: false };
  saveName(next);
  return { name: next, saved: true };
}

function readLocal(day: string): DailyBoard {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { day, scores: [] };
    const p = JSON.parse(raw) as DailyBoard;
    if (p.day !== day) return { day, scores: [] };
    return { day, scores: Array.isArray(p.scores) ? p.scores : [] };
  } catch {
    return { day, scores: [] };
  }
}

function writeLocal(board: DailyBoard): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(board));
  } catch {
    /* ignore */
  }
}

export function sortScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => a.moves - b.moves || a.at - b.at);
}

/** One shared board for every tester. Local preview posts here too. */
export const SHARED_DAILY_ORIGIN = "https://jumpgrave-ajrr1z.netlify.app";

function dailyUrls(day: string): string[] {
  const live = `${SHARED_DAILY_ORIGIN}/api/daily/${day}`;
  const same = `/api/daily/${day}`;
  try {
    if (typeof location !== "undefined" && location.origin === SHARED_DAILY_ORIGIN) return [same];
  } catch {
    /* no window */
  }
  return [live, same];
}

async function requestBoard(url: string, init?: RequestInit): Promise<DailyBoard> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error("no board");
  const data = (await res.json()) as DailyBoard;
  if (!Array.isArray(data.scores)) throw new Error("bad board");
  return { day: data.day, scores: sortScores(data.scores) };
}

export async function fetchBoard(day: string): Promise<DailyBoard> {
  for (const url of dailyUrls(day)) {
    try {
      const board = await requestBoard(url);
      writeLocal(board);
      return board;
    } catch {
      /* try the next host */
    }
  }
  return readLocal(day);
}

export async function postScore(day: string, name: string, moves: number): Promise<DailyBoard> {
  const clean = sanitizeName(name);
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: clean, moves }),
  };
  for (const url of dailyUrls(day)) {
    try {
      const board = await requestBoard(url, init);
      writeLocal(board);
      saveName(clean);
      return board;
    } catch {
      /* try the next host */
    }
  }
  const board = readLocal(day);
  const key = clean.toLowerCase();
  const rest = board.scores.filter((s) => s.name.toLowerCase() !== key);
  const prev = board.scores.find((s) => s.name.toLowerCase() === key);
  if (!prev || moves < prev.moves) rest.push({ name: clean, moves, at: Date.now() });
  else rest.push(prev);
  const next = { day, scores: sortScores(rest) };
  writeLocal(next);
  saveName(clean);
  return next;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function sanitizeName(raw: string): string {
  return tryName(raw) ?? "Ivory";
}
