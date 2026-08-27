import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "data", "daily-leaderboard.json");

interface Score {
  name: string;
  moves: number;
  at: number;
}

interface Store {
  [day: string]: Score[];
}

function load(): Store {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Store;
  } catch {
    return {};
  }
}

function save(store: Store): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store));
}

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "Ivory";
  const t = raw.replace(/[^\p{L}\p{N} \-']/gu, "").replace(/\s+/g, " ").trim();
  if (t.length < 2) return "Ivory";
  return t.slice(0, 16);
}

function todayUtc(): string {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, "0");
  const d = String(n.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sortScores(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => a.moves - b.moves || a.at - b.at);
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function attach(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? "";
    const hit = url.match(/^\/api\/daily\/(\d{4}-\d{2}-\d{2})\/?$/);
    if (!hit) {
      next();
      return;
    }
    const day = hit[1]!;
    res.setHeader("Content-Type", "application/json");
    const store = load();
    if (req.method === "GET") {
      res.end(JSON.stringify({ day, scores: sortScores(store[day] ?? []) }));
      return;
    }
    if (req.method === "POST") {
      if (day !== todayUtc()) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "That day is closed." }));
        return;
      }
      try {
        const body = JSON.parse(await readBody(req)) as { name?: unknown; moves?: unknown };
        const name = cleanName(body.name);
        const moves = Number(body.moves);
        if (!Number.isInteger(moves) || moves < 1 || moves > 999) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Moves must be 1–999." }));
          return;
        }
        const list = store[day] ?? [];
        const key = name.toLowerCase();
        const rest = list.filter((s) => s.name.toLowerCase() !== key);
        const prev = list.find((s) => s.name.toLowerCase() === key);
        if (!prev || moves < prev.moves) rest.push({ name, moves, at: Date.now() });
        else rest.push(prev);
        store[day] = sortScores(rest).slice(0, 80);
        save(store);
        res.end(JSON.stringify({ day, scores: store[day] }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Bad score." }));
      }
      return;
    }
    next();
  });
}

export function dailyLeaderboardPlugin(): Plugin {
  return {
    name: "jumpgrave-daily-board",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
