import { connectLambda, getStore } from "@netlify/blobs";
import { handleAccount } from "../../shared/accountApi.mjs";

const SITE_ID = process.env.BLOBS_SITE_ID || process.env.NETLIFY_SITE_ID || "be42e0aa-6fe5-4bb3-847f-22bb2d45988a";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: statusCode === 204 ? "" : JSON.stringify(body),
  };
}

function openBlobs(event) {
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

function blobStore(event) {
  const blobs = openBlobs(event);
  return {
    async getJSON(key) {
      return blobs.get(key, { type: "json" });
    },
    async setJSON(key, value) {
      await blobs.setJSON(key, value);
    },
    async delete(key) {
      await blobs.delete(key);
    },
  };
}

function opFromEvent(event) {
  const q = event.queryStringParameters?.op ?? "";
  if (q) return String(q).split("/")[0];
  const blob = `${event.path ?? ""} ${event.rawUrl ?? ""}`;
  const m = blob.match(/\/api\/account\/([a-z]+)/i) || blob.match(/\/account\/([a-z]+)/i);
  return m?.[1] ?? "";
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const result = await handleAccount({
      op: opFromEvent(event),
      method: event.httpMethod,
      body,
      auth: event.headers?.authorization || event.headers?.Authorization || "",
      store: blobStore(event),
    });
    return json(result.status, result.body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Hop book closed.";
    if (String(msg).includes("blobs")) return json(503, { error: "Hop book is offline." });
    return json(500, { error: "Hop book hiccup." });
  }
}
