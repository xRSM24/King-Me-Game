import { randomUUID } from "node:crypto";
import { sanitizeName, tryName } from "./names.mjs";
import {
  accountSecret,
  bearerToken,
  checkPassword,
  emailKey,
  hashPassword,
  makeToken,
  normalizeEmail,
  readToken,
  studioEmail,
  verifyPassword,
} from "./auth.mjs";

export const HISTORY_CAP = 200;
export const HOP_KINDS = new Set(["board-clear", "climb-win", "climb-lose", "daily-win", "daily-lose"]);
export const MAIL_OK_KEY = "mail-ok";

export function signupMailOk(body) {
  return body?.mailOk !== false;
}

export function accountMailOk(account) {
  return !!(account && typeof account === "object" && account.mailOk === true);
}

export async function loadMailList(store) {
  const raw = await store.getJSON(MAIL_OK_KEY);
  return Array.isArray(raw) ? raw.map(String) : [];
}

export async function setMailListed(store, email, on) {
  const e = String(email || "").toLowerCase();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const cur = await loadMailList(store);
    if (cur.includes(e) === on) return;
    const next = on ? [...new Set([...cur, e])] : cur.filter((x) => x !== e);
    await store.setJSON(MAIL_OK_KEY, next);
    const saved = await loadMailList(store);
    if (saved.includes(e) === on) return;
  }
  throw new Error(`Could not update ${MAIL_OK_KEY}.`);
}

export function emptyStats() {
  return {
    accounts: 0,
    signups: 0,
    logins: 0,
    boardClears: 0,
    climbWins: 0,
    climbLosses: 0,
    dailyWins: 0,
    dailyLosses: 0,
    days: {},
  };
}

export function todayUtc() {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, "0");
  const d = String(n.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function tidyHistory(list) {
  const map = new Map();
  for (const raw of Array.isArray(list) ? list : []) {
    const e = cleanEvent(raw);
    if (e) map.set(e.id, e);
  }
  return [...map.values()].sort((a, b) => b.at - a.at).slice(0, HISTORY_CAP);
}

export function cleanEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const kind = String(raw.kind ?? "");
  if (!HOP_KINDS.has(kind)) return null;
  const id = String(raw.id ?? "").slice(0, 64);
  if (!id) return null;
  return {
    id,
    at: Number(raw.at) || Date.now(),
    kind,
    title: String(raw.title ?? "").slice(0, 48),
    board: Math.max(0, Math.min(8, Number(raw.board) || 0)),
    hops: Math.max(0, Math.min(9999, Number(raw.hops) || 0)),
    moves: Math.max(0, Math.min(9999, Number(raw.moves) || 0)),
    stars: Math.max(0, Math.min(99999, Number(raw.stars) || 0)),
  };
}

export function mergeHistory(a, b) {
  return tidyHistory([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
}

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function mergeProgress(client, server) {
  const c = client && typeof client === "object" ? client : {};
  const s = server && typeof server === "object" ? server : {};
  const metaC = c.meta && typeof c.meta === "object" ? c.meta : {};
  const metaS = s.meta && typeof s.meta === "object" ? s.meta : {};
  const meta = {
    notches: Math.max(num(metaC.notches), num(metaS.notches)),
    runs: Math.max(num(metaC.runs), num(metaS.runs)),
    wins: Math.max(num(metaC.wins), num(metaS.wins)),
    bestBoard: Math.max(num(metaC.bestBoard), num(metaS.bestBoard)),
    mute: typeof metaC.mute === "boolean" ? metaC.mute : !!metaS.mute,
    colorblind: typeof metaC.colorblind === "boolean" ? metaC.colorblind : !!metaS.colorblind,
    reduceMotion: typeof metaC.reduceMotion === "boolean" ? metaC.reduceMotion : !!metaS.reduceMotion,
    sawTutorial: !!(metaC.sawTutorial || metaS.sawTutorial),
  };
  const clientAt = num(c.updatedAt);
  const serverAt = num(s.updatedAt);
  let climb = s.climb || null;
  if (c.clearClimb) climb = null;
  else if (c.climb) climb = clientAt >= serverAt || !s.climb ? c.climb : s.climb;
  const nameC = tryName(String(c.name ?? "")) || "";
  const nameS = tryName(String(s.name ?? "")) || "";
  return {
    meta,
    climb,
    history: mergeHistory(c.history, s.history),
    name: nameC || nameS,
    updatedAt: Math.max(clientAt, serverAt, Date.now()),
  };
}

export function bumpStats(stats, kind) {
  const next = { ...emptyStats(), ...(stats && typeof stats === "object" ? stats : {}) };
  next.days = next.days && typeof next.days === "object" ? { ...next.days } : {};
  const day = todayUtc();
  const row = { signups: 0, logins: 0, boardClears: 0, climbWins: 0, dailyWins: 0, ...(next.days[day] || {}) };
  if (kind === "signup") {
    next.accounts += 1;
    next.signups += 1;
    row.signups += 1;
  } else if (kind === "login") {
    next.logins += 1;
    row.logins += 1;
  } else if (kind === "board-clear") {
    next.boardClears += 1;
    row.boardClears += 1;
  } else if (kind === "climb-win") {
    next.climbWins += 1;
    row.climbWins += 1;
  } else if (kind === "climb-lose") {
    next.climbLosses += 1;
  } else if (kind === "daily-win") {
    next.dailyWins += 1;
    row.dailyWins += 1;
  } else if (kind === "daily-lose") {
    next.dailyLosses += 1;
  }
  next.days[day] = row;
  const keys = Object.keys(next.days).sort();
  if (keys.length > 60) {
    for (const k of keys.slice(0, keys.length - 60)) delete next.days[k];
  }
  return next;
}

function publicMe(account, save, token) {
  const email = String(account.email || "");
  return {
    id: account.id,
    email,
    name: save.name || account.name || "",
    studio: email === studioEmail(),
    token,
    save,
    mailOk: accountMailOk(account),
  };
}

async function loadAccountById(store, id) {
  return store.getJSON(`acct-id:${id}`);
}

async function loadSave(store, id) {
  return store.getJSON(`save:${id}`);
}

async function writeAccount(store, account) {
  await store.setJSON(`acct:${emailKey(account.email)}`, account);
  await store.setJSON(`acct-id:${account.id}`, account);
}

async function writeSave(store, id, save) {
  await store.setJSON(`save:${id}`, save);
}

async function statsOf(store) {
  const raw = await store.getJSON("hop-stats");
  return { ...emptyStats(), ...(raw && typeof raw === "object" ? raw : {}) };
}

function packFromBody(body) {
  const name = tryName(String(body?.name ?? "")) || "";
  return {
    meta: body?.meta && typeof body.meta === "object" ? body.meta : {},
    climb: body?.climb ?? null,
    clearClimb: !!body?.clearClimb,
    history: Array.isArray(body?.history) ? body.history : [],
    name: name ? sanitizeName(name) : "",
    updatedAt: Number(body?.updatedAt) || Date.now(),
  };
}

async function requireSession(store, header, bodyToken) {
  const secret = accountSecret();
  const id = readToken(bearerToken(header) || String(bodyToken ?? ""), secret);
  if (!id) return { error: "Sign in again.", status: 401 };
  const account = await loadAccountById(store, id);
  if (!account?.id) return { error: "Sign in again.", status: 401 };
  const save = (await loadSave(store, id)) || {
    meta: {},
    climb: null,
    history: [],
    name: account.name || "",
    updatedAt: 0,
  };
  return { account, save, token: makeToken(id, secret) };
}

export async function handleAccount({ op, method, body, auth, store }) {
  const verb = String(method || "GET").toUpperCase();
  const action = String(op || "").replace(/^\//, "").split("/")[0];

  if (action === "signup" && verb === "POST") {
    const email = normalizeEmail(body?.email);
    if (!email) return { status: 400, body: { error: "Need a real email." } };
    const problem = checkPassword(body?.password);
    if (problem) return { status: 400, body: { error: problem } };
    const existing = await store.getJSON(`acct:${emailKey(email)}`);
    if (existing?.id) return { status: 409, body: { error: "That email already has a hopper." } };
    const name = tryName(String(body?.name ?? "")) || "";
    const { salt, hash } = hashPassword(String(body.password));
    const account = {
      id: randomUUID(),
      email,
      salt,
      hash,
      name: name ? sanitizeName(name) : "",
      createdAt: Date.now(),
      mailOk: signupMailOk(body),
      mailOkAt: Date.now(),
    };
    const save = mergeProgress(packFromBody(body), {
      meta: {},
      climb: null,
      history: [],
      name: account.name,
      updatedAt: 0,
    });
    await writeAccount(store, account);
    await writeSave(store, account.id, save);
    try {
      await setMailListed(store, email, account.mailOk);
    } catch {
      // The account is already durable; list maintenance must not turn signup into a failure.
    }
    await store.setJSON("hop-stats", bumpStats(await statsOf(store), "signup"));
    const token = makeToken(account.id);
    return { status: 200, body: publicMe(account, save, token) };
  }

  if (action === "login" && verb === "POST") {
    const email = normalizeEmail(body?.email);
    if (!email) return { status: 400, body: { error: "Need a real email." } };
    const account = await store.getJSON(`acct:${emailKey(email)}`);
    if (!account?.id || !verifyPassword(String(body?.password ?? ""), account.salt, account.hash)) {
      return { status: 401, body: { error: "Email or password did not match." } };
    }
    const previous = (await loadSave(store, account.id)) || {
      meta: {},
      climb: null,
      history: [],
      name: account.name || "",
      updatedAt: 0,
    };
    const save = mergeProgress(packFromBody(body), previous);
    await writeSave(store, account.id, save);
    await store.setJSON("hop-stats", bumpStats(await statsOf(store), "login"));
    const token = makeToken(account.id);
    return { status: 200, body: publicMe(account, save, token) };
  }

  if (action === "me" && (verb === "GET" || verb === "POST")) {
    const session = await requireSession(store, auth, body?.token);
    if (session.error) return { status: session.status, body: { error: session.error } };
    return { status: 200, body: publicMe(session.account, session.save, session.token) };
  }

  if (action === "sync" && verb === "POST") {
    const session = await requireSession(store, auth, body?.token);
    if (session.error) return { status: session.status, body: { error: session.error } };
    const save = mergeProgress(packFromBody(body), session.save);
    await writeSave(store, session.account.id, save);
    return { status: 200, body: publicMe(session.account, save, session.token) };
  }

  if (action === "event" && verb === "POST") {
    const session = await requireSession(store, auth, body?.token);
    if (session.error) return { status: session.status, body: { error: session.error } };
    const event = cleanEvent(body?.event);
    if (!event) return { status: 400, body: { error: "Bad hop." } };
    const incoming = packFromBody(body);
    incoming.history = mergeHistory([event], incoming.history);
    const save = mergeProgress(incoming, session.save);
    await writeSave(store, session.account.id, save);
    await store.setJSON("hop-stats", bumpStats(await statsOf(store), event.kind));
    return { status: 200, body: publicMe(session.account, save, session.token) };
  }

  if (action === "delete" && verb === "POST") {
    const session = await requireSession(store, auth, body?.token);
    if (session.error) return { status: session.status, body: { error: session.error } };
    if (!verifyPassword(String(body?.password ?? ""), session.account.salt, session.account.hash)) {
      return { status: 401, body: { error: "Password did not match." } };
    }
    await setMailListed(store, session.account.email, false);
    await store.delete(`acct:${emailKey(session.account.email)}`);
    await store.delete(`acct-id:${session.account.id}`);
    await store.delete(`save:${session.account.id}`);
    const stats = await statsOf(store);
    stats.accounts = Math.max(0, (stats.accounts || 0) - 1);
    await store.setJSON("hop-stats", stats);
    return { status: 200, body: { ok: true } };
  }

  if (action === "insight" && (verb === "GET" || verb === "POST")) {
    const session = await requireSession(store, auth, body?.token);
    if (session.error) return { status: session.status, body: { error: session.error } };
    if (String(session.account.email || "") !== studioEmail()) {
      return { status: 403, body: { error: "That book is for the table." } };
    }
    const list = await loadMailList(store);
    return {
      status: 200,
      body: { stats: await statsOf(store), mailOk: list.length, mailList: list },
    };
  }

  if (action === "mail" && verb === "POST") {
    const session = await requireSession(store, auth, body?.token);
    if (session.error) return { status: session.status, body: { error: session.error } };
    const on = !!body?.mailOk;
    session.account.mailOk = on;
    session.account.mailOkAt = Date.now();
    await writeAccount(store, session.account);
    await setMailListed(store, session.account.email, on);
    return { status: 200, body: publicMe(session.account, session.save, session.token) };
  }

  return { status: 404, body: { error: "Unknown hop." } };
}
