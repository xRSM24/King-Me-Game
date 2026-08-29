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
const committed = path.join(process.cwd(), "netlify.site.json");
let siteId = process.env.NETLIFY_SITE_ID || "";
if (!siteId && fs.existsSync(idFile)) siteId = fs.readFileSync(idFile, "utf8").trim();
if (!siteId && fs.existsSync(committed)) {
  try {
    siteId = JSON.parse(fs.readFileSync(committed, "utf8")).id || "";
  } catch {
    siteId = "";
  }
}

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
  fs.writeFileSync(
    committed,
    `${JSON.stringify({ id: siteId, url: site.ssl_url || site.url || `https://${site.name}.netlify.app` }, null, 2)}\n`,
  );
  console.log(`Created Netlify site ${site.name} → ${site.ssl_url || site.url}`);
}

async function makePublic() {
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sso_login: false }),
  });
  if (!res.ok) {
    console.error("Could not open the site to the public:", await res.text());
    process.exit(1);
  }
}

await makePublic();
await ensureBlobsEnv();

async function ensureBlobsEnv() {
  const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!siteRes.ok) {
    console.error("Could not read the Netlify site for env setup.");
    return;
  }
  const site = await siteRes.json();
  const accountId = site.account_id;
  if (!accountId) {
    console.error("No Netlify account id on the site; Blobs env not set.");
    return;
  }
  const put = async (key, value) => {
    const res = await fetch(`https://api.netlify.com/api/v1/accounts/${accountId}/env/${key}?site_id=${siteId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        scopes: ["builds", "functions", "post_processing", "runtime"],
        values: [{ context: "all", value }],
      }),
    });
    if (!res.ok) {
      const created = await fetch(`https://api.netlify.com/api/v1/accounts/${accountId}/env?site_id=${siteId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            key,
            scopes: ["builds", "functions", "post_processing", "runtime"],
            values: [{ context: "all", value }],
          },
        ]),
      });
      if (!created.ok) {
        console.error(`Could not set ${key} on the Netlify site.`);
      }
    }
  };
  await put("BLOBS_SITE_ID", siteId);
  await put("NETLIFY_BLOBS_TOKEN", token);
}

run("npm", ["run", "build"]);
const deploy = run("npx", ["--yes", "netlify-cli", "deploy", "--prod", "--dir=dist", "--auth", token, "--site", siteId], {
  capture: true,
});
process.stdout.write(deploy.stdout || "");
process.stderr.write(deploy.stderr || "");
console.log("Public URL: https://jumpgrave-ajrr1z.netlify.app");
