import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pkg } from '../scripts/lib.mjs';

const script = new URL('../scripts/check-commit-msg.mjs', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'gt-msg-'));
const check = (message) => {
  const file = join(dir, 'MSG');
  writeFileSync(file, message);
  try {
    execFileSync(process.execPath, [script, file], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

const v = pkg().version;

test('accepts the current version with a summary', () => {
  assert.equal(check(`v${v}: add a thing\n\nbody`), true);
  assert.equal(check(`v${v}`), true);
});

test('rejects messages without the version prefix', () => {
  assert.equal(check('add a thing'), false);
  assert.equal(check(`${v}: add a thing`), false);
});

test('rejects a version that does not match package.json', () => {
  assert.equal(check('v99.0.0: future'), false);
});

test('rejects co-author trailers', () => {
  assert.equal(check(`v${v}: thing\n\nCo-authored-by: Someone <a@b.c>`), false);
});
