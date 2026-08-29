import { connectLambda, getStore } from "@netlify/blobs";

const SITE_ID = process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID || "be42e0aa-6fe5-4bb3-847f-22bb2d45988a";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function todayUtc() {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, "0");
  const d = String(n.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function cleanName(raw) {
  if (typeof raw !== "string") return "Ivory";
  const t = raw.replace(/[^\p{L}\p{N} \-']/gu, "").replace(/\s+/g, " ").trim();
  if (t.length < 2) return "Ivory";
  return t.slice(0, 16);
}

function sortScores(scores) {
  return [...scores].sort((a, b) => a.moves - b.moves || a.at - b.at);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: statusCode === 204 ? "" : JSON.stringify(body),
  };
}

function dayFromEvent(event) {
  const q = event.queryStringParameters?.day ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  const blob = `${event.path ?? ""} ${event.rawUrl ?? ""} ${event.rawQuery ?? ""}`;
  const m = blob.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? "";
}

function openStore(event) {
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN || "";
  if (token) {
    return getStore({ name: "jumpgrave-daily", siteID: SITE_ID, token });
  }
  try {
    connectLambda(event);
    return getStore("jumpgrave-daily");
  } catch {
    throw new Error("No blobs token");
  }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  const day = dayFromEvent(event);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json(400, { error: "Bad day." });

  const store = openStore(event);
  const raw = await store.get(day, { type: "json" });
  let scores = Array.isArray(raw) ? raw : [];

  if (event.httpMethod === "GET") {
    return json(200, { day, scores: sortScores(scores) });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Nope." });
  if (day !== todayUtc()) return json(400, { error: "That day is closed." });

  try {
    const body = JSON.parse(event.body || "{}");
    const name = cleanName(body.name);
    const moves = Number(body.moves);
    if (!Number.isInteger(moves) || moves < 1 || moves > 999) {
      return json(400, { error: "Moves must be 1–999." });
    }
    const key = name.toLowerCase();
    const rest = scores.filter((s) => s.name.toLowerCase() !== key);
    const prev = scores.find((s) => s.name.toLowerCase() === key);
    if (!prev || moves < prev.moves) rest.push({ name, moves, at: Date.now() });
    else rest.push(prev);
    scores = sortScores(rest).slice(0, 80);
    await store.setJSON(day, scores);
    return json(200, { day, scores });
  } catch {
    return json(400, { error: "Bad score." });
  }
}
