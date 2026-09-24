// Renders every raster of the GlassTube logo from assets/logo.svg:
//   src/icons/icon{16,32,48,128}.png   extension + toolbar icons (16/32 use logo-small.svg)
//   --brand <dir>                      also writes 4096 / 1024 / 512 logo masters into <dir>
//                                      (used for the git-ignored chrome/vX.Y.Z/ release bundle)
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT, SRC } from './lib.mjs';

const svg = readFileSync(join(ROOT, 'assets/logo.svg'));
// A simplified mark keeps the play glyph legible in the 16–32 px toolbar slots.
const smallSvg = readFileSync(join(ROOT, 'assets/logo-small.svg'));
const iconsDir = join(SRC, 'icons');
const brandArg = process.argv.indexOf('--brand');
const brandDir = brandArg > -1 ? join(ROOT, process.argv[brandArg + 1]) : null;
mkdirSync(iconsDir, { recursive: true });

/** Rasterises the 1024-unit SVG at `size` px (supersampled, then downscaled for crisp edges). */
const render = (size, source = svg) =>
  sharp(source, { density: Math.min(72 * ((size * 2) / 1024), 2400) })
    .resize(size, size, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();

// 4K master and web-friendly sizes — only for release bundles, never committed.
if (brandDir) {
  mkdirSync(brandDir, { recursive: true });
  for (const size of [4096, 1024, 512]) {
    await sharp(await render(size)).toFile(join(brandDir, `glasstube-logo-${size}.png`));
    console.log(`✔ ${join(brandDir, `glasstube-logo-${size}.png`).replace(ROOT + '/', '')}`);
  }
}

/**
 * Chrome Web Store guidance: the 128 px icon carries 96 px of artwork inside 16 px of
 * transparent padding. Toolbar sizes are rendered nearly full-bleed so they stay legible.
 */
const icons = [
  { size: 16, art: 16 },
  { size: 32, art: 30 },
  { size: 48, art: 44 },
  { size: 128, art: 96 },
];
for (const { size, art } of icons) {
  const pad = Math.floor((size - art) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await render(art, size <= 32 ? smallSvg : svg), top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toFile(join(iconsDir, `icon${size}.png`));
  console.log(`✔ src/icons/icon${size}.png`);
}
