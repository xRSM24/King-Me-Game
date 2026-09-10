import {
  mergeEndlessRow,
  sortEndlessScores,
} from "../../shared/endlessApi.mjs";
import { sanitizeName } from "../../shared/names.mjs";
import { SHARED_DAILY_ORIGIN } from "./leaderboard";

export interface EndlessScore {
  name: string;
  rounds: number;
  at: number;
}

export interface EndlessBoard {
  scores: EndlessScore[];
  live: boolean;
}

const LOCAL_KEY = "jumpgrave-endless-board-v1";
const HIDDEN_KEY = "jumpgrave-hidden-names-v1";

function readLocal(): EndlessScore[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { scores?: unknown };
    return Array.isArray(parsed.scores) ? (parsed.scores as EndlessScore[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(scores: EndlessScore[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ scores }));
  } catch {
    /* ignore */
  }
}

function hiddenSet(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.map((name) => String(name).toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

function withoutHidden(scores: EndlessScore[]): EndlessScore[] {
  const hidden = hiddenSet();
  if (!hidden.size) return scores;
  return scores.filter((score) => !hidden.has(score.name.toLowerCase()));
}

function endlessUrls(): string[] {
  const live = `${SHARED_DAILY_ORIGIN}/api/endless`;
  const same = "/api/endless";
  try {
    if (typeof location !== "undefined" && location.origin === SHARED_DAILY_ORIGIN) return [same];
  } catch {
    /* no window */
  }
  return [live, same];
}

async function requestBoard(url: string, init?: RequestInit): Promise<EndlessScore[]> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error("no endless board");
  const data = (await response.json()) as { scores?: unknown };
  if (!Array.isArray(data.scores)) throw new Error("bad endless board");
  return sortEndlessScores(data.scores as EndlessScore[]);
}

export async function fetchEndlessBoard(): Promise<EndlessBoard> {
  for (const url of endlessUrls()) {
    try {
      const scores = await requestBoard(url);
      writeLocal(scores);
      return { scores: withoutHidden(scores), live: true };
    } catch {
      /* try the next host */
    }
  }
  return { scores: withoutHidden(sortEndlessScores(readLocal())), live: false };
}

export async function postEndlessScore(name: string, rounds: number): Promise<EndlessBoard> {
  const clean = sanitizeName(name);
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: clean, rounds }),
  };
  for (const url of endlessUrls()) {
    try {
      const scores = await requestBoard(url, init);
      writeLocal(scores);
      return { scores: withoutHidden(scores), live: true };
    } catch {
      /* try the next host */
    }
  }
  const scores = mergeEndlessRow(readLocal(), clean, rounds, Date.now());
  writeLocal(scores);
  return { scores: withoutHidden(scores), live: false };
}
