// Prints GitHub Release notes for a version (defaults to the manifest version).
import { changelogSection, manifest } from './lib.mjs';

const version = (process.argv[2] || manifest().version).replace(/^v/, '');
const section = changelogSection(version);
if (!section) {
  console.error(`✖ CHANGELOG.md has no section for ${version}`);
  process.exit(1);
}
process.stdout.write(`${section}

---

### Install

1. Download **glasstube-v${version}.zip** below and unzip it.
2. Open \`chrome://extensions\`, turn on **Developer mode** and choose **Load unpacked**.
3. Select the unzipped folder, then open [youtube.com](https://www.youtube.com).

Full history: [CHANGELOG.md](https://github.com/theysap/GlassTube/blob/main/CHANGELOG.md)
`);
