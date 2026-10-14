import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const BRAND = "laooozy";
const DOMAIN = "laooozy.github.io";
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

function buildSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${BRAND}">
  <defs>
    <radialGradient id="glowA" cx="12%" cy="-12%" r="85%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="106%" cy="14%" r="80%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.45"/>
      <stop offset="58%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wordmark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5f3ff"/>
      <stop offset="100%" stop-color="#c4b5fd"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0a0a0f"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowA)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowB)"/>
  <rect x="48" y="48" width="${WIDTH - 96}" height="${HEIGHT - 96}" rx="28"
        fill="rgba(255,255,255,0.03)" stroke="rgba(168,85,247,0.35)" stroke-width="2"/>
  <g font-family="'Sora','Segoe UI',system-ui,-apple-system,sans-serif">
    <circle cx="112" cy="150" r="9" fill="url(#accent)"/>
    <text x="138" y="161" font-size="30" font-weight="500" fill="#a1a1aa" letter-spacing="1">${DOMAIN}</text>
    <text x="100" y="392" font-size="168" font-weight="700" fill="url(#wordmark)" letter-spacing="-4">${BRAND}</text>
    <rect x="104" y="440" width="300" height="9" rx="4.5" fill="url(#accent)"/>
  </g>
</svg>
`;
}

async function main() {
  const svg = buildSvg();
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(join(PUBLIC_DIR, "og.svg"), svg, "utf8");
  await sharp(Buffer.from(svg)).png().toFile(join(PUBLIC_DIR, "og.png"));
  console.log(`wrote public/og.svg + public/og.png (${WIDTH}x${HEIGHT})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
