import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(root, "public", "favicon.svg");
const svg = fs.readFileSync(svgPath);

async function png(size, dest) {
  await sharp(svg, { density: Math.round((size / 64) * 72) })
    .resize(size, size)
    .png()
    .toFile(dest);
  console.log("wrote", dest);
}

const resources = path.join(root, "resources");
fs.mkdirSync(resources, { recursive: true });
await png(1024, path.join(resources, "icon.png"));
await png(192, path.join(root, "public", "icon-192.png"));
await png(512, path.join(root, "public", "icon-512.png"));
await png(180, path.join(root, "public", "apple-touch-icon.png"));

const splash = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#140c28"/>
  <rect x="966" y="966" width="800" height="800" rx="180" fill="#3d2466"/>
  <circle cx="1366" cy="1450" r="210" fill="#ffe4f0" stroke="#e86aa3" stroke-width="28"/>
  <circle cx="1288" cy="1420" r="28" fill="#2a1830"/>
  <circle cx="1444" cy="1420" r="28" fill="#2a1830"/>
  <path d="M1366 1080l48 98 108 0-88 68 34 108-102-62-102 62 34-108-88-68 108 0z" fill="#ffd45a"/>
</svg>`);
await sharp(splash).resize(2732, 2732).png().toFile(path.join(resources, "splash.png"));
console.log("wrote", path.join(resources, "splash.png"));
