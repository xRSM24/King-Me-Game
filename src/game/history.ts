import { captureCount, roundCount } from "./copy.ts";

const KEY = "jumpgrave-history-v1";
export const HISTORY_CAP = 200;

export type HopKind =
  | "board-clear"
  | "climb-win"
  | "climb-lose"
  | "daily-win"
  | "daily-lose"
  | "endless-clear"
  | "endless-lose";

export interface HopEvent {
  id: string;
  at: number;
  kind: HopKind;
  title: string;
  board: number;
  hops: number;
  moves: number;
  stars?: number;
}

const KINDS = new Set<HopKind>([
  "board-clear",
  "climb-win",
  "climb-lose",
  "daily-win",
  "daily-lose",
  "endless-clear",
  "endless-lose",
]);

function hopId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function cleanHop(raw: unknown): HopEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<HopEvent>;
  const kind = p.kind as HopKind;
  if (!KINDS.has(kind)) return null;
  const id = String(p.id ?? "").slice(0, 64);
  if (!id) return null;
  return {
    id,
    at: Number(p.at) || Date.now(),
    kind,
    title: String(p.title ?? "").slice(0, 48),
    board: Math.max(0, Math.min(999, Number(p.board) || 0)),
    hops: Math.max(0, Math.min(9999, Number(p.hops) || 0)),
    moves: Math.max(0, Math.min(9999, Number(p.moves) || 0)),
    stars: Math.max(0, Math.min(99999, Number(p.stars) || 0)),
  };
}

export function mergeHistory(a: HopEvent[], b: HopEvent[]): HopEvent[] {
  const map = new Map<string, HopEvent>();
  for (const e of [...a, ...b]) {
    const clean = cleanHop(e);
    if (clean) map.set(clean.id, clean);
  }
  return [...map.values()].sort((x, y) => y.at - x.at).slice(0, HISTORY_CAP);
}

export function loadHistory(): HopEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    return mergeHistory(Array.isArray(list) ? list : [], []);
  } catch {
    return [];
  }
}

export function saveHistory(events: HopEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(mergeHistory(events, [])));
  } catch {
    /* ignore */
  }
}

export function addHop(partial: Omit<HopEvent, "id" | "at"> & { id?: string; at?: number }): HopEvent {
  const event: HopEvent = {
    id: partial.id || hopId(),
    at: partial.at || Date.now(),
    kind: partial.kind,
    title: partial.title,
    board: partial.board,
    hops: partial.hops,
    moves: partial.moves,
    stars: partial.stars || 0,
  };
  saveHistory(mergeHistory([event], loadHistory()));
  return event;
}

export function describeHop(e: HopEvent): string {
  if (e.kind === "board-clear") return `Cleared ${e.title || "a board"} · ${e.moves} moves`;
  if (e.kind === "climb-win") return `Beat the Crown · ${captureCount(e.hops)}`;
  if (e.kind === "climb-lose") return `Fell on board ${e.board || "?"} · ${captureCount(e.hops)}`;
  if (e.kind === "daily-win") return `${e.title || "Daily"} · ${e.moves} moves`;
  if (e.kind === "endless-clear") return `Cleared ${e.title} · round ${e.board}`;
  if (e.kind === "endless-lose") return `Endless · ${roundCount(e.board ?? 0)}`;
  return `${e.title || "Daily"}, not this time · ${e.moves} moves`;
}

export function whenHop(e: HopEvent): string {
  try {
    return new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}
