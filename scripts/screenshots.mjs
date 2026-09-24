// Renders Chrome Web Store screenshots (1280×800) and promo tiles (440×280, 1400×560) by
// driving the real extension on youtube.com in Chrome for Testing, then composing the tiles.
// All frames feature the official Formula 1 YouTube channel (@Formula1): Home is seeded with
// its latest uploads, and the watch / PiP / channel / playlist shots use its newest videos.
// Output: chrome/v<version>/ (git-ignored).
//
//   npm run screenshots            (run after `npm run build -- --store`)
//
// Options (env):
//   PLAYER_IMAGE=path.png   use a supplied watch-page screenshot instead of capturing one
//   SKIP_PIP=1              leave the Picture-in-Picture shot out
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { ROOT, SRC, manifest } from './lib.mjs';

const { version } = manifest();
const out = process.env.OUT_DIR || join(ROOT, 'chrome', `v${version}`);
mkdirSync(join(out, 'extras'), { recursive: true });
const W = 1280;
const H = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const require = createRequire(import.meta.url);
const data = require('../src/content/data.js');
const YT = 'https://www.youtube.com';
const CHANNEL_HANDLE = '@Formula1';
const CHANNEL = `${YT}/${CHANNEL_HANDLE}`;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Cookie: 'SOCS=CAI',
};
const initialData = async (path) =>
  data.parseInitialData(await (await fetch(YT + path, { headers: HEADERS })).text());

// Pick targets from the channel's newest content so the shots stay current.
const [videosPage, playlistsPage, channelHome] = await Promise.all([
  initialData(`/${CHANNEL_HANDLE}/videos`),
  initialData(`/${CHANNEL_HANDLE}/playlists`),
  initialData(`/${CHANNEL_HANDLE}`),
]);
const uploads = data.extractItems(videosPage).filter((i) => i.kind === 'video');
const featured =
  uploads.find(
    (i) => /highlights/i.test(i.title) && (data.parseDuration(i.duration) || 0) >= 180,
  ) ||
  uploads.find((i) => (data.parseDuration(i.duration) || 0) >= 180) ||
  uploads[0];
const playlist = data.extractItems(playlistsPage).find((i) => i.kind === 'playlist');
if (!featured || !playlist) throw new Error(`Could not read ${CHANNEL_HANDLE} videos / playlists`);
// Several candidates: monetised videos sometimes fail to play in headless Chrome after an ad.
const candidates = [
  featured,
  ...uploads.filter((i) => i !== featured && (data.parseDuration(i.duration) || 0) >= 180),
].slice(0, 6);
const PLAYLIST = new URL(playlist.url, YT).href;
console.log(`ℹ playlist: ${playlist.title}`);

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
// YouTube refuses to play monetised videos for a "HeadlessChrome" user agent.
await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
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
// Home is seeded with the channel's uploads and its home shelves.
const seeds = [videosPage.contents, channelHome.contents];
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
await shot('raw-home.png');
await page.evaluate(() =>
  document.getElementById('gt-home').scrollTo(0, window.innerHeight * 0.62),
);
await sleep(1500);
await hover('#gt-home .gt-row:nth-child(1) .gt-card:nth-child(2)');
await sleep(900);
await shot('raw-shelves.png');

// 3 · Cinematic watch page with controls and a scrub preview
// Ads play with YouTube's own controls (by design), so wait them out — pressing Skip when
// offered — before capturing GlassTube's player.
const waitForAds = async (limitMs = 120000) => {
  const until = Date.now() + limitMs;
  while (Date.now() < until) {
    const ad = await page.evaluate(() => {
      const p = document.getElementById('movie_player');
      const showing =
        !!p && (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting'));
      if (showing) {
        document
          .querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern')
          ?.click();
      }
      return showing;
    });
    if (!ad) return;
    await sleep(1000);
  }
  console.warn('⚠ an ad was still playing');
};

/** Opens candidates until one is genuinely playing (no ad, no player error, frames moving). */
const openPlayable = async () => {
  for (const video of candidates) {
    await page.goto(`${YT}/watch?v=${video.id}`, { waitUntil: 'domcontentloaded' });
    await sleep(9000);
    await waitForAds();
    await page.evaluate(() => {
      const v = document.querySelector('#movie_player video');
      if (!v) return;
      v.muted = true;
      v.currentTime = Math.min(95, (v.duration || 200) * 0.35);
      v.play().catch(() => {});
    });
    const ok = await page
      .waitForFunction(
        () => {
          const v = document.querySelector('#movie_player video');
          const error = document.querySelector('#movie_player .ytp-error');
          if (error && getComputedStyle(error).display !== 'none')
            return `error: ${error.textContent.trim().slice(0, 80)}`;
          return v && v.readyState >= 3 && !v.seeking && !v.paused && v.currentTime > 5
            ? 'ok'
            : false;
        },
        { timeout: 40000, polling: 500 },
      )
      .then((h) => h.jsonValue())
      .catch(() => 'timeout');
    if (ok === 'ok') {
      await waitForAds();
      console.log(`ℹ watch: ${video.title}`);
      return video;
    }
    console.warn(`⚠ ${video.title}: ${ok}, trying the next video`);
  }
  throw new Error('No candidate video would play');
};
const PLAYER_IMAGE = process.env.PLAYER_IMAGE;
const SKIP_PIP = !!process.env.SKIP_PIP;
let pipShot = null;
if (!PLAYER_IMAGE || !SKIP_PIP) {
  await openPlayable();
}
if (PLAYER_IMAGE) {
  // A supplied capture: extend its (black) letterbox to 16:10 and fit 1280×800 — no cropping.
  const img = sharp(readFileSync(PLAYER_IMAGE)).removeAlpha();
  const { width, height } = await img.metadata();
  const pad = Math.max(0, Math.round((width / 1.6 - height) / 2));
  // sharp always resizes before extending within one pipeline, so extend first, then resize.
  const extended = await img
    .extend({ top: pad, bottom: pad, left: 0, right: 0, background: '#000000' })
    .png()
    .toBuffer();
  await sharp(extended).resize(W, H, { fit: 'cover' }).png().toFile(join(out, 'raw-player.png'));
  console.log(`✔ player screenshot from ${PLAYER_IMAGE}`);
} else {
  await sleep(2500);
  await page.mouse.move(W / 2, H / 2, { steps: 5 });
  const scrub = await (await page.$('.gt-scrub'))?.boundingBox();
  if (scrub)
    await page.mouse.move(scrub.x + scrub.width * 0.47, scrub.y + scrub.height / 2, { steps: 10 });
  await sleep(1500);
  await shot('raw-player.png');
}
if (!SKIP_PIP) {
  // 4 · Picture in Picture: the real PiP window composed over the page behind it
  await waitForAds();
  // Reveal the controls, then click the PiP button where it really is (a trusted click is
  // required to open Document Picture-in-Picture).
  await page.mouse.move(W / 2 - 40, H / 2, { steps: 4 });
  await page.mouse.move(W / 2, H / 2 + 20, { steps: 4 });
  await page.waitForFunction(
    () => document.getElementById('movie_player')?.classList.contains('gt-ctl-visible'),
    {
      timeout: 5000,
    },
  );
  const pipBox = await (
    await page.$('.gt-controls button[aria-label="Picture in Picture"]')
  ).boundingBox();
  await page.mouse.click(pipBox.x + pipBox.width / 2, pipBox.y + pipBox.height / 2);
  await sleep(2500);
  const pipTarget = browser
    .targets()
    .reverse()
    .find((t) => t.url() === 'about:blank');
  if (pipTarget) {
    const pip = await pipTarget.asPage();
    await pip.mouse.move(120, 80);
    await pip.mouse.move(200, 120, { steps: 4 });
    await sleep(500);
    pipShot = await pip.screenshot({ encoding: 'base64' });
  }
  await page.evaluate(() => documentPictureInPicture.window?.close());
}
await page.goto(CHANNEL, { waitUntil: 'domcontentloaded' });
await sleep(7000);
await page.mouse.move(W - 40, 40);
await shot('raw-channel.png');
const channelShot = readFileSync(join(out, 'raw-channel.png')).toString('base64');

// 5 · Playlist collection page
await page.goto(PLAYLIST, { waitUntil: 'domcontentloaded' });
await sleep(7000);
await hover('#gt-browse .gt-episode:nth-child(2)');
await sleep(800);
await shot('raw-playlist.png');

const home = readFileSync(join(out, 'raw-home.png')).toString('base64');
const composer = await browser.newPage();
await composer.setViewport({ width: W, height: H });
// PiP composite
if (!SKIP_PIP) {
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
  await shot('raw-pip.png', composer);
}

// Promo tiles. Store guidance: saturated colours, little text, readable at half size,
// shown on a light-grey page — so a lavender brand field, the logo and the name only.
const logo = (
  await sharp(join(ROOT, 'assets/logo.svg'), { density: 600 }).resize(512, 512).png().toBuffer()
).toString('base64');
const tile = (
  w,
  h,
  big,
) => `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;
    background:radial-gradient(70% 90% at 12% 15%,#9EE7FF55,transparent 60%),radial-gradient(70% 90% at 92% 95%,#FF7AB699,transparent 65%),linear-gradient(135deg,#8C7BFF,#5A3FD1 45%,#1B1147)">
  ${
    big
      ? `<img src="data:image/png;base64,${home}" style="position:absolute;right:-70px;top:64px;width:800px;border-radius:24px;transform:perspective(1400px) rotateY(-16deg) rotateX(4deg);box-shadow:0 50px 100px -30px rgba(10,5,40,.9),0 0 0 1px rgba(255,255,255,.25)">`
      : `<img src="data:image/png;base64,${home}" style="position:absolute;right:-190px;bottom:-60px;width:360px;border-radius:14px;transform:perspective(900px) rotateY(-18deg);box-shadow:0 30px 60px -20px rgba(10,5,40,.9),0 0 0 1px rgba(255,255,255,.25);opacity:.95">`
  }
  <div style="position:absolute;left:${big ? 96 : 30}px;top:50%;transform:translateY(-50%);max-width:${big ? 560 : 230}px">
    <img src="data:image/png;base64,${logo}" style="display:block;width:${big ? 150 : 104}px;height:${big ? 150 : 104}px;margin-bottom:${big ? 22 : 12}px;filter:drop-shadow(0 18px 30px rgba(20,8,70,.55))">
    <div style="font-size:${big ? 80 : 36}px;font-weight:800;letter-spacing:-.03em;line-height:1;text-shadow:0 4px 24px rgba(20,8,70,.45)">GlassTube</div>
    ${big ? `<div style="margin-top:18px;font-size:28px;font-weight:600;color:rgba(255,255,255,.85);line-height:1.25">YouTube, reimagined for the big&nbsp;screen.</div>` : ''}
  </div>
</body></html>`;
for (const [w, h, name] of [
  [440, 280, 'promo-small-440x280.png'],
  [1400, 560, 'promo-marquee-1400x560.png'],
]) {
  await composer.setViewport({ width: w, height: h });
  await composer.setContent(tile(w, h, w > 1000));
  await sleep(400);
  await shot(name, composer);
}
await browser.close();

// Final order: the first five become the numbered store screenshots, the rest go to extras/.
const order = ['home', 'player', ...(SKIP_PIP ? [] : ['pip']), 'channel', 'playlist', 'shelves'];
order.forEach((name, i) => {
  const from = join(out, `raw-${name}.png`);
  const to =
    i < 5
      ? join(out, `screenshot-${i + 1}-${name}.png`)
      : join(out, 'extras', `screenshot-${name}.png`);
  writeFileSync(to, readFileSync(from));
  rmSync(from);
});

// The dashboard expects opaque images: drop the alpha channel from every screenshot / tile.
for (const dir of [out, join(out, 'extras')]) {
  for (const f of readdirSync(dir).filter((f) => /^(screenshot|promo).*\.png$/.test(f))) {
    const path = join(dir, f);
    const opaque = await sharp(readFileSync(path))
      .flatten({ background: '#000000' })
      .removeAlpha()
      .png()
      .toBuffer();
    writeFileSync(path, opaque);
  }
}
console.log(`✔ opaque 24-bit PNGs in ${out.replace(ROOT + '/', '')}`);
