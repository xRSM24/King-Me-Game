import { SHARED_DAILY_ORIGIN, commitName, loadName } from "./leaderboard.ts";
import { addHop, loadHistory, mergeHistory, saveHistory, type HopEvent } from "./history.ts";
import { loadMeta, saveMeta } from "./meta.ts";
import { hasClimb, loadClimb, saveClimb, type ClimbSave } from "./save.ts";
import type { Meta } from "./types.ts";

const SESSION_KEY = "jumpgrave-session-v1";

export interface CloudSave {
  meta: Partial<Meta>;
  climb: ClimbSave | null;
  clearClimb?: boolean;
  history: HopEvent[];
  name: string;
  updatedAt: number;
}

export interface Session {
  token: string;
  id: string;
  email: string;
  name: string;
  studio: boolean;
}

interface AccountReply {
  id?: string;
  email?: string;
  name?: string;
  studio?: boolean;
  token?: string;
  save?: CloudSave;
  error?: string;
  stats?: InsightStats;
  ok?: boolean;
}

export interface InsightStats {
  accounts: number;
  signups: number;
  logins: number;
  boardClears: number;
  climbWins: number;
  climbLosses: number;
  dailyWins: number;
  dailyLosses: number;
  days: Record<string, { signups: number; logins: number; boardClears: number; climbWins: number; dailyWins: number }>;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Session>;
    if (!p.token || !p.id || !p.email) return null;
    return {
      token: String(p.token),
      id: String(p.id),
      email: String(p.email),
      name: String(p.name || ""),
      studio: !!p.studio,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function packLocal(opts: { clearClimb?: boolean } = {}): CloudSave {
  const climb = loadClimb();
  return {
    meta: loadMeta(),
    climb,
    clearClimb: !!opts.clearClimb || false,
    history: loadHistory(),
    name: loadName(),
    updatedAt: Date.now(),
  };
}

function applySave(save: CloudSave): void {
  const local = loadMeta();
  saveMeta({
    ...local,
    notches: Math.max(local.notches, Number(save.meta?.notches) || 0),
    runs: Math.max(local.runs, Number(save.meta?.runs) || 0),
    wins: Math.max(local.wins, Number(save.meta?.wins) || 0),
    bestBoard: Math.max(local.bestBoard, Number(save.meta?.bestBoard) || 0),
    mute: typeof save.meta?.mute === "boolean" ? save.meta.mute : local.mute,
    colorblind: typeof save.meta?.colorblind === "boolean" ? save.meta.colorblind : local.colorblind,
    reduceMotion: typeof save.meta?.reduceMotion === "boolean" ? save.meta.reduceMotion : local.reduceMotion,
    sawTutorial: !!(save.meta?.sawTutorial || local.sawTutorial),
  });
  saveHistory(mergeHistory(save.history || [], loadHistory()));
  if (save.climb && !hasClimb()) saveClimb(save.climb);
  if (save.name) commitName(save.name);
}

function remember(reply: AccountReply): Session | null {
  if (!reply.token || !reply.id || !reply.email) return null;
  const session: Session = {
    token: reply.token,
    id: reply.id,
    email: reply.email,
    name: reply.name || "",
    studio: !!reply.studio,
  };
  saveSession(session);
  if (reply.save) applySave(reply.save);
  return session;
}

function accountUrls(op: string): string[] {
  const live = `${SHARED_DAILY_ORIGIN}/api/account/${op}`;
  const same = `/api/account/${op}`;
  try {
    if (typeof location !== "undefined" && location.origin === SHARED_DAILY_ORIGIN) return [same];
  } catch {
    /* no window */
  }
  return [same, live];
}

async function requestAccount(op: string, init?: RequestInit): Promise<AccountReply> {
  let last = "Hop book is offline.";
  for (const url of accountUrls(op)) {
    try {
      const res = await fetch(url, init);
      const data = (await res.json()) as AccountReply;
      if (!res.ok) {
        last = data.error || last;
        if (res.status === 401 || res.status === 409 || res.status === 400 || res.status === 403) {
          const err = new Error(data.error || last);
          (err as Error & { status?: number }).status = res.status;
          throw err;
        }
        continue;
      }
      return data;
    } catch (err) {
      if (err instanceof Error && "status" in err) throw err;
      last = err instanceof Error ? err.message : last;
    }
  }
  throw new Error(last);
}

function authInit(session: Session | null, extra: { clearClimb?: boolean } = {}): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: JSON.stringify({ token: session?.token, ...packLocal(extra) }),
  };
}

export async function createAccount(email: string, password: string): Promise<Session> {
  const data = await requestAccount("signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...packLocal() }),
  });
  const session = remember(data);
  if (!session) throw new Error("Could not open the hop book.");
  return session;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const data = await requestAccount("login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...packLocal() }),
  });
  const session = remember(data);
  if (!session) throw new Error("Could not open the hop book.");
  return session;
}

export async function refreshAccount(): Promise<Session | null> {
  const session = loadSession();
  if (!session) return null;
  try {
    const data = await requestAccount("me", authInit(session));
    return remember(data);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 401) saveSession(null);
    return loadSession();
  }
}

export async function pushAccount(opts: { clearClimb?: boolean } = {}): Promise<void> {
  const session = loadSession();
  if (!session) return;
  try {
    const data = await requestAccount("sync", authInit(session, opts));
    remember(data);
  } catch {
    /* stay local until the radio is back */
  }
}

export async function recordHop(partial: Omit<HopEvent, "id" | "at">, opts: { clearClimb?: boolean } = {}): Promise<HopEvent> {
  const event = addHop(partial);
  const session = loadSession();
  if (!session) return event;
  try {
    const data = await requestAccount("event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ token: session.token, event, ...packLocal(opts) }),
    });
    remember(data);
  } catch {
    void pushAccount(opts);
  }
  return event;
}

export async function deleteAccount(password: string): Promise<void> {
  const session = loadSession();
  if (!session) throw new Error("Not signed in.");
  await requestAccount("delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ token: session.token, password }),
  });
  saveSession(null);
}

export async function fetchInsight(): Promise<InsightStats | null> {
  const session = loadSession();
  if (!session?.studio) return null;
  const data = await requestAccount("insight", authInit(session, {}));
  return data.stats ?? null;
}

export function signOut(): void {
  saveSession(null);
}
