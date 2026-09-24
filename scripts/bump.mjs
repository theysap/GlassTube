// Sets the version everywhere it lives: npm run bump -- 1.2.3
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import { ROOT, SEMVER, changelogSection } from './lib.mjs';

const version = process.argv[2]?.replace(/^v/, '');
if (!SEMVER.test(version || '')) {
  console.error('Usage: npm run bump -- <x.y.z>');
  process.exit(1);
}
for (const file of ['package.json', 'src/manifest.json', 'package-lock.json']) {
  const path = join(ROOT, file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  json.version = version;
  if (file === 'package-lock.json' && json.packages?.['']) json.packages[''].version = version;
  const text = JSON.stringify(json, null, 2) + '\n';
  // Keep the files exactly as Prettier (and the pre-commit hook) expects them.
  const options = (await prettier.resolveConfig(path)) || {};
  writeFileSync(
    path,
    file === 'package-lock.json'
      ? text
      : await prettier.format(text, { ...options, filepath: path }),
  );
}
console.log(`✔ version set to ${version}`);
if (!changelogSection(version)) console.log(`ℹ remember to add "## [${version}]" to CHANGELOG.md`);
