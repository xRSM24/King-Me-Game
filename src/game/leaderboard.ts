import { nameProblem, sanitizeName, tidyName, tryName } from "../../shared/names.mjs";

export { nameProblem, sanitizeName, tryName };

export interface Score {
  name: string;
  moves: number;
  at: number;
}

export interface DailyBoard {
  day: string;
  scores: Score[];
  live?: boolean;
}

const LOCAL_KEY = "jumpgrave-daily-v1";
const NAME_KEY = "jumpgrave-player-name";
const HIDDEN_KEY = "jumpgrave-hidden-names-v1";

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

export function commitName(raw: string): { name: string; saved: boolean; problem: string | null } {
  const problem = nameProblem(raw);
  const next = tryName(raw);
  if (!next) return { name: loadName(), saved: false, problem: problem ?? "Pick a kinder name." };
  saveName(next);
  return { name: next, saved: true, problem: null };
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
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ day: board.day, scores: board.scores }));
  } catch {
    /* ignore */
  }
}

function hiddenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.map((n) => String(n).toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

function rememberHidden(name: string): void {
  const key = tidyName(name).toLowerCase();
  if (!key) return;
  const next = hiddenSet();
  next.add(key);
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
  } catch {
    /* ignore */
  }
}

export function sortScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => a.moves - b.moves || a.at - b.at);
}

function withoutHidden(scores: Score[]): Score[] {
  const hide = hiddenSet();
  if (!hide.size) return scores;
  return scores.filter((s) => !hide.has(s.name.toLowerCase()));
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

function reportUrls(): string[] {
  const live = `${SHARED_DAILY_ORIGIN}/api/report`;
  const same = `/api/report`;
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
  return { day: data.day, scores: sortScores(data.scores), live: true };
}

export async function fetchBoard(day: string): Promise<DailyBoard> {
  for (const url of dailyUrls(day)) {
    try {
      const board = await requestBoard(url);
      writeLocal(board);
      return { ...board, scores: withoutHidden(board.scores), live: true };
    } catch {
      /* try the next host */
    }
  }
  const local = readLocal(day);
  return { ...local, scores: withoutHidden(local.scores), live: false };
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
      return { ...board, scores: withoutHidden(board.scores), live: true };
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
  return { ...next, scores: withoutHidden(next.scores), live: false };
}

export async function reportName(raw: string): Promise<boolean> {
  const name = tidyName(raw);
  if (name.length < 2) return false;
  rememberHidden(name);
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  };
  for (const url of reportUrls()) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return true;
    } catch {
      /* try the next host */
    }
  }
  return true;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
