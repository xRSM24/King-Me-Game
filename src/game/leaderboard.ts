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

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
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

export async function fetchBoard(day: string): Promise<DailyBoard> {
  try {
    const res = await fetch(`/api/daily/${day}`);
    if (!res.ok) throw new Error("no board");
    const data = (await res.json()) as DailyBoard;
    const board = { day, scores: sortScores(data.scores ?? []) };
    writeLocal(board);
    return board;
  } catch {
    return readLocal(day);
  }
}

export async function postScore(day: string, name: string, moves: number): Promise<DailyBoard> {
  const clean = sanitizeName(name);
  try {
    const res = await fetch(`/api/daily/${day}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clean, moves }),
    });
    if (!res.ok) throw new Error("post failed");
    const data = (await res.json()) as DailyBoard;
    const board = { day, scores: sortScores(data.scores ?? []) };
    writeLocal(board);
    saveName(clean);
    return board;
  } catch {
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
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function sanitizeName(raw: string): string {
  const t = raw.replace(/[^\p{L}\p{N} \-']/gu, "").replace(/\s+/g, " ").trim();
  if (t.length < 2) return "Ivory";
  return t.slice(0, 16);
}
