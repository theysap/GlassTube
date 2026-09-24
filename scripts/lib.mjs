import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = join(ROOT, 'src');

export const readJSON = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const manifest = () => readJSON(join(SRC, 'manifest.json'));
export const pkg = () => readJSON(join(ROOT, 'package.json'));

export const SEMVER = /^\d+\.\d+\.\d+$/;

/** Returns the body of the CHANGELOG section for `version`, or null. */
export function changelogSection(version) {
  const text = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^## \[/.test(l));
  if (end === -1) end = lines.length;
  return lines
    .slice(start + 1, end)
    .filter((l) => !/^\[.*\]: /.test(l))
    .join('\n')
    .trim();
}
