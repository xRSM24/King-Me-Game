import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { isBlockedName, sanitizeName, tidyName, tryName } from "./shared/names.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "data", "daily-leaderboard.json");
const flagsFile = path.join(root, "data", "daily-flags.json");

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

function loadFlags(): string[] {
  try {
    const raw = JSON.parse(fs.readFileSync(flagsFile, "utf8")) as unknown;
    return Array.isArray(raw) ? raw.map((n) => String(n)) : [];
  } catch {
    return [];
  }
}

function saveFlags(names: string[]): void {
  fs.mkdirSync(path.dirname(flagsFile), { recursive: true });
  fs.writeFileSync(flagsFile, JSON.stringify(names));
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

function hiddenSet(list: string[]): Set<string> {
  return new Set(list.map((n) => n.toLowerCase()));
}

function publicScores(scores: Score[], hidden: Set<string>): Score[] {
  return sortScores(scores).filter((s) => {
    const key = s.name.toLowerCase();
    return key && !hidden.has(key) && !isBlockedName(s.name);
  });
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: { setHeader: (k: string, v: string) => void; end: (s: string) => void; statusCode: number }, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function attach(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? "";
    if (url.match(/^\/api\/report\/?$/)) {
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end("");
        return;
      }
      if (req.method === "POST") {
        try {
          const body = JSON.parse(await readBody(req)) as { name?: unknown };
          const name = tidyName(String(body.name ?? ""));
          if (name.length < 2) {
            json(res, 400, { error: "Need a name." });
            return;
          }
          const flags = loadFlags();
          if (!flags.some((n) => n.toLowerCase() === name.toLowerCase())) {
            flags.push(name);
            saveFlags(flags.slice(0, 4000));
          }
          json(res, 200, { hidden: true, name });
        } catch {
          json(res, 400, { error: "Bad report." });
        }
        return;
      }
    }
    const hit = url.match(/^\/api\/daily\/(\d{4}-\d{2}-\d{2})\/?$/);
    if (!hit) {
      next();
      return;
    }
    const day = hit[1]!;
    const store = load();
    const hidden = hiddenSet(loadFlags());
    if (req.method === "GET") {
      json(res, 200, { day, scores: publicScores(store[day] ?? [], hidden) });
      return;
    }
    if (req.method === "POST") {
      if (day !== todayUtc()) {
        json(res, 400, { error: "That day is closed." });
        return;
      }
      try {
        const body = JSON.parse(await readBody(req)) as { name?: unknown; moves?: unknown };
        if (!tryName(String(body.name ?? ""))) {
          json(res, 400, { error: "Pick a kinder name." });
          return;
        }
        const name = sanitizeName(String(body.name ?? ""));
        if (hidden.has(name.toLowerCase())) {
          json(res, 400, { error: "Pick a kinder name." });
          return;
        }
        const moves = Number(body.moves);
        if (!Number.isInteger(moves) || moves < 1 || moves > 999) {
          json(res, 400, { error: "Moves must be 1–999." });
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
        json(res, 200, { day, scores: publicScores(store[day], hidden) });
      } catch {
        json(res, 400, { error: "Bad score." });
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
