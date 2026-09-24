// Renders the extension icons (committed under src/icons) from assets/icon.svg.
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, SRC } from './lib.mjs';

const svg = readFileSync(join(ROOT, 'assets/icon.svg'));
const outDir = join(SRC, 'icons');
mkdirSync(outDir, { recursive: true });

/**
 * Chrome Web Store guidance: the 128px icon carries 96px of artwork with 16px of transparent
 * padding. Toolbar sizes are rendered nearly full-bleed so they stay legible.
 */
const targets = [
  { size: 16, art: 16 },
  { size: 32, art: 30 },
  { size: 48, art: 44 },
  { size: 128, art: 96 },
];

for (const { size, art } of targets) {
  const pad = (size - art) / 2;
  const inner = await sharp(svg, { density: 72 * (art / 96) * 4 })
    .resize(art, art)
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: inner, top: Math.floor(pad), left: Math.floor(pad) }])
    .png()
    .toFile(join(outDir, `icon${size}.png`));
  console.log(`✔ src/icons/icon${size}.png`);
}
