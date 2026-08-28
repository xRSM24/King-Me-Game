#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const token = process.env.NETLIFY_AUTH_TOKEN;
if (!token) {
  console.error("Missing NETLIFY_AUTH_TOKEN. Add it to the environment, then run npm run publish.");
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: opts.capture ? "pipe" : "inherit", encoding: "utf8", env: process.env });
  if (result.status !== 0) {
    if (opts.capture) console.error(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  return result;
}

const idFile = path.join(process.cwd(), ".netlify-site-id");
let siteId = process.env.NETLIFY_SITE_ID || "";
if (!siteId && fs.existsSync(idFile)) siteId = fs.readFileSync(idFile, "utf8").trim();

if (!siteId) {
  const slug = `jumpgrave-${Math.random().toString(36).slice(2, 8)}`;
  const created = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: slug }),
  });
  if (!created.ok) {
    console.error("Could not create a Netlify site:", await created.text());
    process.exit(1);
  }
  const site = await created.json();
  siteId = site.id;
  fs.writeFileSync(idFile, `${siteId}\n`);
  console.log(`Created Netlify site ${site.name} → ${site.ssl_url || site.url}`);
}

run("npm", ["run", "build"]);
const deploy = run("npx", ["--yes", "netlify-cli", "deploy", "--prod", "--dir=dist", "--auth", token, "--site", siteId], {
  capture: true,
});
process.stdout.write(deploy.stdout || "");
process.stderr.write(deploy.stderr || "");
