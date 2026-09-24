// Validates the extension source: manifest shape, referenced files, version sync, changelog.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT, SRC, SEMVER, manifest, pkg, changelogSection } from './lib.mjs';

const errors = [];
const fail = (msg) => errors.push(msg);

const m = manifest();
const p = pkg();

if (m.manifest_version !== 3) fail('manifest_version must be 3');
for (const key of ['name', 'version', 'description', 'icons', 'action', 'content_scripts']) {
  if (!m[key]) fail(`manifest is missing "${key}"`);
}
if (!SEMVER.test(m.version)) fail(`manifest version "${m.version}" is not x.y.z`);
if (m.version !== p.version) {
  fail(`version mismatch: manifest ${m.version} vs package.json ${p.version}`);
}
if (m.description && m.description.length > 132) {
  fail(`manifest description is ${m.description.length} chars (Chrome Web Store max is 132)`);
}
if (!changelogSection(m.version)) fail(`CHANGELOG.md has no "## [${m.version}]" section`);

// Every file referenced by the manifest must exist.
const referenced = new Set();
Object.values(m.icons ?? {}).forEach((f) => referenced.add(f));
Object.values(m.action?.default_icon ?? {}).forEach((f) => referenced.add(f));
if (m.action?.default_popup) referenced.add(m.action.default_popup);
if (m.background?.service_worker) referenced.add(m.background.service_worker);
for (const cs of m.content_scripts ?? []) {
  [...(cs.js ?? []), ...(cs.css ?? [])].forEach((f) => referenced.add(f));
}
for (const war of m.web_accessible_resources ?? []) war.resources.forEach((f) => referenced.add(f));
for (const file of referenced) {
  if (!existsSync(join(SRC, file))) fail(`manifest references missing file: src/${file}`);
}

// No remotely hosted code or dynamic evaluation (Chrome Web Store MV3 policy).
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
for (const file of walk(SRC).filter((f) => /\.(js|html)$/.test(f))) {
  const code = readFileSync(file, 'utf8');
  if (/\beval\s*\(|new Function\s*\(/.test(code)) {
    fail(`${relative(ROOT, file)} uses eval/new Function`);
  }
  if (/<script[^>]+src=["']https?:/i.test(code)) {
    fail(`${relative(ROOT, file)} loads a remote script`);
  }
}

if (errors.length) {
  console.error('✖ Validation failed:\n' + errors.map((e) => `  • ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✔ GlassTube v${m.version} is valid (${referenced.size} referenced files).`);
