import { connectLambda, getStore } from "@netlify/blobs";
import { isBlockedName, tidyName } from "../../shared/names.mjs";

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
  if (event.httpMethod === "GET") {
    const store = openStore(event);
    const hidden = (await store.get("hidden-names", { type: "json" })) || [];
    return json(200, { names: Array.isArray(hidden) ? hidden : [] });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Nope." });
  try {
    const body = JSON.parse(event.body || "{}");
    const name = tidyName(body.name ?? "");
    if (name.length < 2) return json(400, { error: "Need a name." });
    const store = openStore(event);
    const hidden = (await store.get("hidden-names", { type: "json" })) || [];
    const list = Array.isArray(hidden) ? hidden.map((n) => String(n)) : [];
    const key = name.toLowerCase();
    if (!list.some((n) => n.toLowerCase() === key)) {
      list.push(isBlockedName(name) ? name : name);
      await store.setJSON("hidden-names", list.slice(0, 4000));
    }
    return json(200, { hidden: true, name });
  } catch {
    return json(400, { error: "Bad report." });
  }
}
