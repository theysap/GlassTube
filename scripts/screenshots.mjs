// Renders Chrome Web Store screenshots (1280×800) and promo tiles (440×280, 1400×560) by
// driving the real extension on youtube.com in Chrome for Testing, then composing the tiles.
// Home is seeded with Blender Foundation (CC BY) and NASA (public domain) videos so every
// frame shows freely licensed imagery. Output: chrome/v<version>/ (git-ignored).
//
//   npm run screenshots            (run after `npm run build -- --store`)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { ROOT, SRC, manifest } from './lib.mjs';

const { version } = manifest();
const out = process.env.OUT_DIR || join(ROOT, 'chrome', `v${version}`);
mkdirSync(out, { recursive: true });
const W = 1280;
const H = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEED_QUERIES = ['blender open movie', 'blender studio short film', 'nasa 4k'];
const WATCH = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'; // Big Buck Bunny (CC BY 3.0)
const CHANNEL = 'https://www.youtube.com/@BlenderStudio';
const PLAYLIST = 'https://www.youtube.com/playlist?list=PLa1F2ddGya_-UvuAqHAksYnB0qL9yWDO6';

const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  enableExtensions: [SRC],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--lang=en-US', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
});
await sleep(1000);
const extId = new URL(
  browser
    .targets()
    .find((t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'))
    .url(),
).host;

// Keep the shots deterministic: no randomly-picked Explore rows, no auto-rotation.
const settingsPage = await browser.newPage();
await settingsPage.goto(`chrome-extension://${extId}/popup/popup.html`);
await settingsPage.evaluate(() =>
  chrome.storage.sync.set({ exploreRows: false, heroRotate: false }),
);
await settingsPage.close();

const page = await browser.newPage();
await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
await page.setCookie({ name: 'SOCS', value: 'CAI', domain: '.youtube.com' });

const shot = async (name, target = page) => {
  await target.screenshot({ path: join(out, name) });
  console.log(`✔ ${join(out, name).replace(ROOT + '/', '')}`);
};
const hover = async (selector) => {
  const box = await (await page.$(selector))?.boundingBox();
  if (box) await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 8 });
};

// 1 · Home (Top Shelf) and 2 · shelves — seed data is fetched up front so it lands before
// Home decides whether it needs fallback Explore rows.
const extract = (html) => {
  const marker = 'var ytInitialData = ';
  const start = html.indexOf(marker) + marker.length;
  return JSON.parse(html.slice(start, html.indexOf(';</script>', start)));
};
const userAgent = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
const seeds = await Promise.all(
  SEED_QUERIES.map((q) =>
    fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': userAgent,
          Cookie: 'SOCS=CAI',
        },
      },
    )
      .then((r) => r.text())
      .then((html) => extract(html).contents),
  ),
);
await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#gt-home', { timeout: 30000 });
await page.evaluate((contents) => {
  window.postMessage(
    {
      source: 'glasstube:bridge',
      type: 'data',
      endpoint: 'navigate',
      request: {},
      url: location.href,
      data: { contents },
    },
    location.origin,
  );
}, seeds);
await sleep(5000);
await page.mouse.move(W - 40, 40);
await shot('screenshot-1-home.png');
await page.evaluate(() =>
  document.getElementById('gt-home').scrollTo(0, window.innerHeight * 0.62),
);
await sleep(1500);
await hover('#gt-home .gt-row:nth-child(1) .gt-card:nth-child(2)');
await sleep(900);
await shot('screenshot-2-shelves.png');

// 3 · Cinematic watch page with controls and a scrub preview
await page.goto(WATCH, { waitUntil: 'domcontentloaded' });
await sleep(11000);
await page.evaluate(() => {
  const v = document.querySelector('#movie_player video');
  v.currentTime = 125;
});
await sleep(2500);
await page.mouse.move(W / 2, H / 2, { steps: 5 });
const scrub = await (await page.$('.gt-scrub'))?.boundingBox();
if (scrub)
  await page.mouse.move(scrub.x + scrub.width * 0.58, scrub.y + scrub.height / 2, { steps: 10 });
await sleep(1500);
await shot('screenshot-3-player.png');

// 4 · Picture in Picture: the real PiP window composed over the page behind it
await page.mouse.move(W / 2, H / 2, { steps: 4 });
await sleep(300);
await (await page.$('.gt-controls button[aria-label="Picture in Picture"]'))?.click();
await sleep(2500);
const pipTarget = browser
  .targets()
  .reverse()
  .find((t) => t.url() === 'about:blank');
let pipShot = null;
if (pipTarget) {
  const pip = await pipTarget.asPage();
  await pip.mouse.move(120, 80);
  await pip.mouse.move(200, 120, { steps: 4 });
  await sleep(500);
  pipShot = await pip.screenshot({ encoding: 'base64' });
}
await page.evaluate(() => documentPictureInPicture.window?.close());
await page.goto(CHANNEL, { waitUntil: 'domcontentloaded' });
await sleep(7000);
await page.mouse.move(W - 40, 40);
await shot('screenshot-4-channel.png');
const channelShot = readFileSync(join(out, 'screenshot-4-channel.png')).toString('base64');

// 5 · Playlist collection page
await page.goto(PLAYLIST, { waitUntil: 'domcontentloaded' });
await sleep(7000);
await hover('#gt-browse .gt-episode:nth-child(2)');
await sleep(800);
await shot('screenshot-5-playlist.png');

// PiP composite
const home = readFileSync(join(out, 'screenshot-1-home.png')).toString('base64');
const composer = await browser.newPage();
await composer.setViewport({ width: W, height: H });
await composer.setContent(`<!doctype html><html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000;font-family:-apple-system,system-ui,sans-serif">
  <img src="data:image/png;base64,${channelShot}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.05)">
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,.15),rgba(0,0,0,.45))"></div>
  ${
    pipShot
      ? `<div style="position:absolute;right:48px;bottom:48px;width:520px;border-radius:16px;overflow:hidden;box-shadow:0 40px 90px -20px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.14)">
      <img src="data:image/png;base64,${pipShot}" style="display:block;width:100%"></div>`
      : ''
  }
</body></html>`);
await shot('screenshot-6-pip.png', composer);

// Promo tiles
const icon = readFileSync(join(SRC, 'icons/icon128.png')).toString('base64');
const tile = (
  w,
  h,
  big,
) => `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#07070b;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased">
  <img src="data:image/png;base64,${home}" style="position:absolute;inset:-8%;width:116%;height:116%;object-fit:cover;filter:blur(${big ? 26 : 16}px) saturate(1.5);opacity:.55">
  <div style="position:absolute;inset:0;background:radial-gradient(80% 90% at 20% 50%,rgba(7,7,11,.2),rgba(7,7,11,.85))"></div>
  ${
    big
      ? `<img src="data:image/png;base64,${home}" style="position:absolute;right:-60px;top:70px;width:780px;border-radius:22px;transform:perspective(1400px) rotateY(-16deg) rotateX(4deg);box-shadow:0 50px 100px -30px #000,0 0 0 1px rgba(255,255,255,.15)">`
      : ''
  }
  <div style="position:absolute;left:${big ? 90 : 34}px;top:50%;transform:translateY(-50%);max-width:${big ? 560 : 380}px">
    <img src="data:image/png;base64,${icon}" style="width:${big ? 120 : 76}px;height:${big ? 120 : 76}px;margin:0 0 ${big ? 14 : 4}px -${big ? 16 : 10}px">
    <div style="font-size:${big ? 76 : 44}px;font-weight:800;letter-spacing:-.03em;line-height:1">GlassTube</div>
    <div style="margin-top:${big ? 18 : 10}px;font-size:${big ? 28 : 17}px;font-weight:600;color:rgba(235,235,245,.78);line-height:1.25">YouTube, reimagined for the big&nbsp;screen.</div>
  </div>
</body></html>`;
for (const [w, h, name] of [
  [440, 280, 'promo-small-440x280.png'],
  [1400, 560, 'promo-marquee-1400x560.png'],
]) {
  await composer.setViewport({ width: w, height: h });
  await composer.setContent(tile(w, h, w > 1000));
  await sleep(300);
  await shot(name, composer);
}

writeFileSync(join(out, '.generated'), new Date().toISOString());
await browser.close();
