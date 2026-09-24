// Enforces the commit message convention: the subject is exactly "vX.Y.Z" (the staged version);
// any details go in the commit body.
import { readFileSync } from 'node:fs';
import { pkg } from './lib.mjs';

const file = process.argv[2];
const message = readFileSync(file, 'utf8');
const subject = message.split('\n')[0].trim();
const version = pkg().version;

// Let git-generated merge / revert / fixup subjects through untouched.
if (/^(Merge|Revert|fixup!|squash!)/.test(subject)) process.exit(0);

const errors = [];
const match = subject.match(/^v(\d+\.\d+\.\d+)$/);
if (!match) {
  errors.push(`Subject must be exactly "v${version}" (details go in the body) — got "${subject}".`);
} else if (match[1] !== version) {
  errors.push(`Subject version v${match[1]} does not match package.json version v${version}.`);
}
if (/^co-authored-by:/im.test(message)) {
  errors.push('Co-authored-by trailers are not allowed in this repository.');
}

if (errors.length) {
  console.error('✖ Invalid commit message:\n' + errors.map((e) => `  • ${e}`).join('\n'));
  process.exit(1);
}
