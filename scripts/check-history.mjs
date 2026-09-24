// CI guard: every commit in a range must use "vX.Y.Z: summary" and carry no co-author trailer.
//   node scripts/check-history.mjs <base>..<head>
import { execFileSync } from 'node:child_process';

const range = process.argv[2];
if (!range) {
  console.error('Usage: node scripts/check-history.mjs <base>..<head>');
  process.exit(1);
}
const log = execFileSync('git', ['log', '--format=%H%x1f%s%x1f%b%x1e', range], {
  encoding: 'utf8',
});
const errors = [];
for (const entry of log
  .split('\x1e')
  .map((e) => e.trim())
  .filter(Boolean)) {
  const [sha, subject, body = ''] = entry.split('\x1f');
  if (/^(Merge|Revert)/.test(subject)) continue;
  if (!/^v\d+\.\d+\.\d+(?::\s+\S.*)?$/.test(subject)) {
    errors.push(`${sha.slice(0, 7)} subject is not "vX.Y.Z: summary": ${subject}`);
  }
  if (/^co-authored-by:/im.test(body))
    errors.push(`${sha.slice(0, 7)} has a Co-authored-by trailer`);
}
if (errors.length) {
  console.error('✖ Commit history check failed:\n' + errors.map((e) => `  • ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✔ commit messages in ${range} follow the convention`);
