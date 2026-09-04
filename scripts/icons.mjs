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
  <rect width="2732" height="2732" fill="#1c1208"/>
  <rect x="966" y="966" width="800" height="800" rx="80" fill="#6b4424"/>
  <circle cx="1220" cy="1450" r="200" fill="#f3d7a4" stroke="#8a5a22" stroke-width="24"/>
  <circle cx="1220" cy="1450" r="88" fill="none" stroke="#8a5a22" stroke-width="14" opacity="0.4"/>
  <ellipse cx="1220" cy="1320" rx="150" ry="58" fill="none" stroke="#e8c547" stroke-width="22"/>
  <ellipse cx="1580" cy="1520" rx="130" ry="150" fill="#5a3218" stroke="#1a0c06" stroke-width="22"/>
  <circle cx="1580" cy="1310" r="100" fill="#5a3218" stroke="#1a0c06" stroke-width="22"/>
</svg>`);
await sharp(splash).resize(2732, 2732).png().toFile(path.join(resources, "splash.png"));
console.log("wrote", path.join(resources, "splash.png"));

const feature = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="#1c1208"/>
  <rect x="0" y="0" width="1024" height="500" fill="url(#g)"/>
  <defs>
    <radialGradient id="g" cx="30%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#e8c547" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#1c1208" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="72" y="110" width="280" height="280" rx="28" fill="#6b4424"/>
  <circle cx="168" cy="270" r="62" fill="#f3d7a4" stroke="#8a5a22" stroke-width="8"/>
  <circle cx="168" cy="270" r="26" fill="none" stroke="#8a5a22" stroke-width="4" opacity="0.4"/>
  <ellipse cx="168" cy="228" rx="48" ry="16" fill="none" stroke="#e8c547" stroke-width="7"/>
  <ellipse cx="268" cy="292" rx="40" ry="48" fill="#5a3218" stroke="#1a0c06" stroke-width="8"/>
  <circle cx="268" cy="228" r="32" fill="#5a3218" stroke="#1a0c06" stroke-width="8"/>
  <text x="400" y="220" fill="#fff3d6" font-size="72" font-family="sans-serif" font-weight="700">King Me</text>
  <text x="400" y="280" fill="#e4d0ae" font-size="32" font-family="sans-serif" font-weight="700">Six boards. Take the challenge.</text>
  <text x="400" y="330" fill="#e8c547" font-size="24" font-family="sans-serif" font-weight="700">No ads · Nothing to buy</text>
</svg>`);
await sharp(feature).png().toFile(path.join(resources, "play-feature.png"));
console.log("wrote", path.join(resources, "play-feature.png"));
