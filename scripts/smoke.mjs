// Loads the unpacked extension in Chrome for Testing and drives real youtube.com pages.
// Usage: node scripts/smoke.mjs [url ...]   (screenshots land in dist/smoke/)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { ROOT, SRC } from './lib.mjs';

const urls = process.argv.slice(2).length ? process.argv.slice(2) : ['https://www.youtube.com/'];
const out = join(ROOT, 'dist', 'smoke');
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  headless: process.env.HEADFUL ? false : true,
  pipe: true,
  enableExtensions: [SRC],
  defaultViewport: { width: 1440, height: 900 },
  args: ['--lang=en-US', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
await page.setCookie({ name: 'SOCS', value: 'CAI', domain: '.youtube.com' });
const problems = [];
page.on('console', (m) => {
  const t = m.text();
  if (/GlassTube|gt-|chrome-extension/i.test(t) || m.type() === 'error')
    problems.push(`[${m.type()}] ${t}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));

for (const [n, url] of urls.entries()) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, Number(process.env.WAIT || 9000)));
  const report = await page.evaluate(() => ({
    url: location.href,
    classes: document.documentElement.className,
    home: !!document.getElementById('gt-home'),
    heroTitle: document.querySelector('.gt-hero-title')?.textContent || null,
    rows: [...document.querySelectorAll('.gt-row')].map(
      (r) =>
        `${r.querySelector('.gt-row-title')?.textContent}(${r.querySelectorAll('.gt-card').length})`,
    ),
    controls: !!document.querySelector('.gt-controls'),
    upNext: document.querySelectorAll('#gt-upnext .gt-card').length,
  }));
  console.log(JSON.stringify(report, null, 2));
  await page.screenshot({ path: join(out, `shot-${n}.png`) });
}
if (problems.length) console.log('Console:\n' + [...new Set(problems)].slice(0, 30).join('\n'));
await browser.close();
