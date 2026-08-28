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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const day = event.queryStringParameters?.day ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json(400, { error: "Bad day." });

  const { getStore } = await import("@netlify/blobs");
  const store = getStore("jumpgrave-daily");
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
