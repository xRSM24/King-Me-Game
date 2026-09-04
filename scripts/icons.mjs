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
  <ellipse cx="1180" cy="1540" rx="150" ry="80" fill="#e4b87a" stroke="#6b3a14" stroke-width="18"/>
  <ellipse cx="1420" cy="1540" rx="150" ry="80" fill="#e4b87a" stroke="#6b3a14" stroke-width="18"/>
  <ellipse cx="1300" cy="1400" rx="250" ry="170" fill="#f3d7a4" stroke="#6b3a14" stroke-width="22"/>
  <circle cx="1180" cy="1200" r="110" fill="#f6dfb2" stroke="#6b3a14" stroke-width="22"/>
  <circle cx="1420" cy="1200" r="110" fill="#f6dfb2" stroke="#6b3a14" stroke-width="22"/>
  <circle cx="1180" cy="1200" r="42" fill="#2a160a"/>
  <circle cx="1420" cy="1200" r="42" fill="#2a160a"/>
  <ellipse cx="1680" cy="1680" rx="130" ry="70" fill="#3a1c0c" stroke="#140804" stroke-width="16"/>
  <ellipse cx="1920" cy="1680" rx="130" ry="70" fill="#3a1c0c" stroke="#140804" stroke-width="16"/>
  <ellipse cx="1800" cy="1540" rx="250" ry="170" fill="#5a3218" stroke="#140804" stroke-width="22"/>
  <ellipse cx="1680" cy="1360" rx="110" ry="100" fill="#4a2812" stroke="#140804" stroke-width="22"/>
  <ellipse cx="1920" cy="1360" rx="110" ry="100" fill="#4a2812" stroke="#140804" stroke-width="22"/>
  <ellipse cx="1710" cy="1380" rx="24" ry="48" fill="#e8c547"/>
  <ellipse cx="1890" cy="1380" rx="24" ry="48" fill="#e8c547"/>
  <path d="M1570 1260l200 70" fill="none" stroke="#140804" stroke-width="28" stroke-linecap="round"/>
  <path d="M2030 1260l-200 70" fill="none" stroke="#140804" stroke-width="28" stroke-linecap="round"/>
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
  <ellipse cx="148" cy="318" rx="42" ry="22" fill="#e4b87a" stroke="#6b3a14" stroke-width="6"/>
  <ellipse cx="220" cy="318" rx="42" ry="22" fill="#e4b87a" stroke="#6b3a14" stroke-width="6"/>
  <ellipse cx="184" cy="280" rx="78" ry="54" fill="#f3d7a4" stroke="#6b3a14" stroke-width="7"/>
  <circle cx="150" cy="222" r="32" fill="#f6dfb2" stroke="#6b3a14" stroke-width="7"/>
  <circle cx="218" cy="222" r="32" fill="#f6dfb2" stroke="#6b3a14" stroke-width="7"/>
  <circle cx="150" cy="222" r="12" fill="#2a160a"/>
  <circle cx="218" cy="222" r="12" fill="#2a160a"/>
  <ellipse cx="248" cy="330" rx="36" ry="18" fill="#3a1c0c" stroke="#140804" stroke-width="5"/>
  <ellipse cx="308" cy="330" rx="36" ry="18" fill="#3a1c0c" stroke="#140804" stroke-width="5"/>
  <ellipse cx="278" cy="292" rx="68" ry="46" fill="#5a3218" stroke="#140804" stroke-width="7"/>
  <ellipse cx="250" cy="246" rx="28" ry="26" fill="#4a2812" stroke="#140804" stroke-width="6"/>
  <ellipse cx="306" cy="246" rx="28" ry="26" fill="#4a2812" stroke="#140804" stroke-width="6"/>
  <ellipse cx="258" cy="250" rx="6" ry="12" fill="#e8c547"/>
  <ellipse cx="298" cy="250" rx="6" ry="12" fill="#e8c547"/>
  <path d="M226 224l32 12" fill="none" stroke="#140804" stroke-width="7" stroke-linecap="round"/>
  <path d="M330 224l-32 12" fill="none" stroke="#140804" stroke-width="7" stroke-linecap="round"/>
  <text x="400" y="220" fill="#fff3d6" font-size="72" font-family="sans-serif" font-weight="700">King Me</text>
  <text x="400" y="280" fill="#e4d0ae" font-size="32" font-family="sans-serif" font-weight="700">Six boards. Take the challenge.</text>
  <text x="400" y="330" fill="#e8c547" font-size="24" font-family="sans-serif" font-weight="700">No ads · Nothing to buy</text>
</svg>`);
await sharp(feature).png().toFile(path.join(resources, "play-feature.png"));
console.log("wrote", path.join(resources, "play-feature.png"));
