// Builds the extension zip into dist/. With --store, also assembles chrome/vX.Y.Z/ with the
// zip plus every asset the Chrome Web Store listing needs (never committed — see .gitignore).
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ROOT, SRC, manifest, changelogSection } from './lib.mjs';
import { execFileSync } from 'node:child_process';
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
  // 4K / 1024 / 512 logo masters for the listing, social posts and press — never committed.
  execFileSync(
    process.execPath,
    [join(ROOT, 'scripts/generate-assets.mjs'), '--brand', relative(ROOT, join(out, 'brand'))],
    {
      stdio: 'inherit',
    },
  );

  const listing = readFileSync(join(ROOT, 'store/listing.md'), 'utf8')
    .replaceAll('{{version}}', version)
    .replaceAll('{{changes}}', changelogSection(version) || '');
  writeFileSync(join(out, 'store-listing.md'), listing);
  copyFileSync(join(ROOT, 'PRIVACY.md'), join(out, 'privacy-policy.md'));
  console.log(`✔ chrome/v${version}/ — ${readdirSync(out).join(', ')}`);
  console.log('ℹ run `npm run screenshots` to add store screenshots and promo tiles');
}
