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

const feature = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="#140c28"/>
  <rect x="0" y="0" width="1024" height="500" fill="url(#g)"/>
  <defs>
    <radialGradient id="g" cx="30%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#ff8ec8" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#140c28" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="72" y="110" width="280" height="280" rx="64" fill="#3d2466"/>
  <circle cx="212" cy="278" r="78" fill="#ffe4f0" stroke="#e86aa3" stroke-width="12"/>
  <circle cx="184" cy="266" r="10" fill="#2a1830"/>
  <circle cx="240" cy="266" r="10" fill="#2a1830"/>
  <path d="M212 142l18 38 42 0-34 26 13 40-39-24-39 24 13-40-34-26 42 0z" fill="#ffd45a"/>
  <text x="400" y="220" fill="#ffe4f0" font-size="72" font-family="sans-serif" font-weight="700">King Me</text>
  <text x="400" y="280" fill="#f0cce0" font-size="32" font-family="sans-serif" font-weight="700">Six boards. Take the challenge.</text>
  <text x="400" y="330" fill="#ffd45a" font-size="24" font-family="sans-serif" font-weight="700">No ads · Nothing to buy</text>
</svg>`);
await sharp(feature).png().toFile(path.join(resources, "play-feature.png"));
console.log("wrote", path.join(resources, "play-feature.png"));
