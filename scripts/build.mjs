// Builds the extension zip into dist/. With --store, also assembles chrome/vX.Y.Z/ with the
// zip plus every asset the Chrome Web Store listing needs (never committed — see .gitignore).
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ROOT, SRC, manifest, changelogSection } from './lib.mjs';
import { createZip } from './zip.mjs';

const withStore = process.argv.includes('--store');
const { version } = manifest();
const zipName = `glasstube-v${version}.zip`;

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const files = walk(SRC).filter((f) => !/(^|[/\\])\.DS_Store$/.test(f));
const zip = createZip(
  files.map((f) => ({ name: relative(SRC, f).split(sep).join('/'), data: readFileSync(f) })),
);

const dist = join(ROOT, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, zipName), zip);
console.log(`✔ dist/${zipName} (${files.length} files, ${(zip.length / 1024).toFixed(1)} KB)`);

if (withStore) {
  const out = join(ROOT, 'chrome', `v${version}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, zipName), zip);
  copyFileSync(join(SRC, 'icons/icon128.png'), join(out, 'store-icon-128x128.png'));

  // Promo tiles + screenshots rendered by `npm run screenshots` (headless Chrome).
  const rendered = join(ROOT, 'dist', '..', 'chrome', '.rendered');
  if (existsSync(rendered)) {
    for (const f of readdirSync(rendered)) copyFileSync(join(rendered, f), join(out, f));
  }

  const listing = readFileSync(join(ROOT, 'store/listing.md'), 'utf8')
    .replaceAll('{{version}}', version)
    .replaceAll('{{changes}}', changelogSection(version) || '');
  writeFileSync(join(out, 'store-listing.md'), listing);
  copyFileSync(join(ROOT, 'PRIVACY.md'), join(out, 'privacy-policy.md'));
  console.log(`✔ chrome/v${version}/ — ${readdirSync(out).join(', ')}`);
}
