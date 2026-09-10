import { connectLambda, getStore } from "@netlify/blobs";
import {
  MAX_ENDLESS_ROUNDS,
  mergeEndlessRow,
  sortEndlessScores,
} from "../../shared/endlessApi.mjs";
import { isBlockedName, sanitizeName, tryName } from "../../shared/names.mjs";

const SITE_ID = process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID || "be42e0aa-6fe5-4bb3-847f-22bb2d45988a";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: statusCode === 204 ? "" : JSON.stringify(body),
  };
}

function openStore(event, name) {
  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN || "";
  if (token) return getStore({ name, siteID: SITE_ID, token });
  try {
    connectLambda(event);
    return getStore(name);
  } catch {
    throw new Error("No blobs token");
  }
}

function hiddenSet(list) {
  const names = Array.isArray(list) ? list : [];
  return new Set(names.map((name) => String(name).toLowerCase()));
}

function publicScores(scores, hidden) {
  return sortEndlessScores(scores).filter((score) => {
    const key = String(score.name || "").toLowerCase();
    return !!key && !hidden.has(key) && !isBlockedName(score.name);
  });
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  const endlessStore = openStore(event, "jumpgrave-endless");
  const dailyStore = openStore(event, "jumpgrave-daily");
  const raw = await endlessStore.get("scores", { type: "json" });
  const hidden = hiddenSet(await dailyStore.get("hidden-names", { type: "json" }));
  let scores = Array.isArray(raw) ? raw : [];

  if (event.httpMethod === "GET") {
    return json(200, { scores: publicScores(scores, hidden) });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Nope." });

  try {
    const body = JSON.parse(event.body || "{}");
    if (!tryName(body.name ?? "")) {
      return json(400, { error: "Pick a kinder name." });
    }
    const name = sanitizeName(body.name);
    if (hidden.has(name.toLowerCase()) || isBlockedName(name)) {
      return json(400, { error: "Pick a kinder name." });
    }
    const rounds = Number(body.rounds);
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ENDLESS_ROUNDS) {
      return json(400, { error: `Rounds must be 1–${MAX_ENDLESS_ROUNDS}.` });
    }
    scores = mergeEndlessRow(scores, name, rounds, Date.now());
    await endlessStore.setJSON("scores", scores);
    return json(200, { scores: publicScores(scores, hidden) });
  } catch {
    return json(400, { error: "Bad score." });
  }
}
