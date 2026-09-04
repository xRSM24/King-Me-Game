import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, PreviewServer, ViteDevServer } from "vite";
import { handleAccount } from "./shared/accountApi.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "data", "accounts.json");

type Bag = Record<string, unknown>;

function load(): Bag {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Bag;
  } catch {
    return {};
  }
}

function write(bag: Bag): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(bag));
}

const store = {
  async getJSON(key: string) {
    return load()[key] ?? null;
  },
  async setJSON(key: string, value: unknown) {
    const bag = load();
    bag[key] = value;
    write(bag);
  },
  async delete(key: string) {
    const bag = load();
    delete bag[key];
    write(bag);
  },
};

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
    const hit = url.match(/^\/api\/account\/([a-z]+)\/?$/i);
    if (!hit) {
      next();
      return;
    }
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.end("");
      return;
    }
    try {
      const raw = req.method === "GET" ? "{}" : await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const result = await handleAccount({
        op: hit[1],
        method: req.method || "GET",
        body,
        auth: String(req.headers.authorization || ""),
        store,
      });
      res.statusCode = result.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result.body));
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Bad hop." }));
    }
  });
}

export function accountPlugin(): Plugin {
  return {
    name: "jumpgrave-account",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
