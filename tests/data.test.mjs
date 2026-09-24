import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { channelData, homeData, lockup, videoRenderer, watchData } from './fixtures/youtube.mjs';

const require = createRequire(import.meta.url);
const data = require('../src/content/data.js');

test('text() understands runs, simpleText and content', () => {
  assert.equal(data.text({ runs: [{ text: 'a' }, { text: 'b' }] }), 'ab');
  assert.equal(data.text({ simpleText: 'x' }), 'x');
  assert.equal(data.text({ content: 'y' }), 'y');
  assert.equal(data.text(null), '');
});

test('parseDuration', () => {
  assert.equal(data.parseDuration('1:02:03'), 3723);
  assert.equal(data.parseDuration('12:34'), 754);
  assert.equal(data.parseDuration('LIVE'), null);
});

test('classic videoRenderer is normalised', () => {
  const [item] = data.extractItems(videoRenderer);
  assert.deepEqual(
    {
      id: item.id,
      kind: item.kind,
      title: item.title,
      channel: item.channel,
      channelUrl: item.channelUrl,
      channelId: item.channelId,
      duration: item.duration,
      progress: item.progress,
      thumb: item.thumb,
      url: item.url,
    },
    {
      id: 'vid00000001',
      kind: 'video',
      title: 'Classic renderer video',
      channel: 'Channel One',
      channelUrl: '/@channelone',
      channelId: 'UC111',
      duration: '12:34',
      progress: 42,
      thumb: 'https://i.ytimg.com/vi/vid00000001/hq720.jpg',
      url: '/watch?v=vid00000001&pp=abc',
    },
  );
});

test('lockupViewModel is normalised, including channel, live and progress', () => {
  const [vod] = data.extractItems(lockup('abc12345678', { progress: 60 }));
  assert.equal(vod.title, 'Lockup abc12345678');
  assert.equal(vod.channel, 'Lockup Channel');
  assert.equal(vod.channelUrl, '/@lockupchannel');
  assert.equal(vod.channelId, 'UC222');
  assert.equal(vod.views, '520 views');
  assert.equal(vod.age, '2mo ago');
  assert.equal(vod.duration, '10:26');
  assert.equal(vod.progress, 60);
  assert.equal(vod.kind, 'video');

  const [live] = data.extractItems(lockup('live1234567', { live: true }));
  assert.equal(live.kind, 'live');
  assert.equal(live.duration, '');
});

test('playlist lockups become playlist items; unknown lockup types are skipped', () => {
  const playlist = lockup('PLxyz');
  playlist.lockupViewModel.contentType = 'LOCKUP_CONTENT_TYPE_PLAYLIST';
  playlist.lockupViewModel.rendererContext.commandContext.onTap.innertubeCommand.commandMetadata.webCommandMetadata.url =
    '/playlist?list=PLxyz';
  const [item] = data.extractItems(playlist);
  assert.equal(item.kind, 'playlist');
  assert.equal(item.url, '/playlist?list=PLxyz');

  const other = lockup('XYZ');
  other.lockupViewModel.contentType = 'LOCKUP_CONTENT_TYPE_SOMETHING_NEW';
  assert.equal(data.extractItems(other).length, 0);
});

test('extractFeed separates shelves, skips ads and de-duplicates', () => {
  const feed = data.extractFeed(homeData);
  assert.deepEqual(
    feed.items.map((i) => i.id),
    ['home0000001', 'home0000002', 'vid00000001'],
  );
  assert.equal(feed.shelves.length, 1);
  assert.equal(feed.shelves[0].title, 'Shorts');
  assert.equal(feed.shelves[0].shorts, true);
  assert.deepEqual(
    feed.shelves[0].items.map((i) => [i.id, i.kind, i.url]),
    [
      ['short000001', 'short', '/shorts/short000001'],
      ['short000002', 'short', '/shorts/short000002'],
    ],
  );
  // Shorts keep YouTube's endpoint so opening one gives a scrollable sequence.
  assert.equal(feed.shelves[0].items[0].endpoint.reelWatchEndpoint.videoId, 'short000001');
});

test('extractWatch returns related videos and the playlist', () => {
  const watch = data.extractWatch(watchData);
  assert.equal(watch.videoId, 'current0001');
  assert.deepEqual(
    watch.related.map((i) => i.id),
    ['related0001', 'related0002'],
  );
  assert.equal(watch.playlist.title, 'My Mix');
  assert.equal(watch.playlist.items[0].selected, true);
  assert.equal(watch.playlist.items[0].url, '/watch?v=plist000001&list=PL123&index=1');
  assert.equal(watch.isContinuation, false);
});

test('parseInitialData reads ytInitialData from HTML', () => {
  const html = `<html><script>var ytInitialData = ${JSON.stringify(homeData)};</script></html>`;
  assert.deepEqual(data.parseInitialData(html), homeData);
  assert.equal(data.parseInitialData('<html></html>'), null);
});

const SPEC =
  'https://i.ytimg.com/sb/ID/storyboard3_L$L/$N.jpg?sqp=abc|48#27#100#10#10#0#default#rs$A|80#45#108#10#10#2000#M$M#rs$B|160#90#108#5#5#2000#M$M#rs$C|320#180#108#3#3#2000#M$M#rs$D';

test('parseStoryboard reads every level', () => {
  const board = data.parseStoryboard(SPEC);
  assert.equal(board.levels.length, 4);
  assert.deepEqual(
    board.levels.map((l) => [l.width, l.cols, l.rows, l.interval]),
    [
      [48, 10, 10, 0],
      [80, 10, 10, 2000],
      [160, 5, 5, 2000],
      [320, 3, 3, 2000],
    ],
  );
  assert.equal(data.parseStoryboard(''), null);
});

test('storyboardFrame picks the right sheet and cell', () => {
  const board = data.parseStoryboard(SPEC);
  // 25 s at 2 s/frame → frame 12 → sheet 1 (9 per sheet), cell 3 → col 0,row 1.
  const f = data.storyboardFrame(board, 25, 216);
  assert.equal(f.url, 'https://i.ytimg.com/sb/ID/storyboard3_L3/M1.jpg?sqp=abc&sigh=rs%24D');
  assert.deepEqual([f.x, f.y, f.width, f.height, f.sheetWidth], [0, 180, 320, 180, 960]);
  // Clamped to the last frame.
  assert.equal(data.storyboardFrame(board, 99999, 216).url.includes('M11.jpg'), true);
  // A smaller cap selects a smaller level.
  assert.equal(data.storyboardFrame(board, 0, 216, 160).width, 160);
});

test('pageKind classifies YouTube URLs', () => {
  assert.equal(data.pageKind('/@blender'), 'channel');
  assert.equal(data.pageKind('/channel/UC1/videos'), 'channel');
  assert.equal(data.pageKind('/playlist?list=WL'), 'playlist');
  assert.equal(data.pageKind('/feed/history'), 'history');
  assert.equal(data.pageKind('/feed/subscriptions'), 'subscriptions');
  assert.equal(data.pageKind('/feed/you'), 'library');
  assert.equal(data.pageKind('/results?search_query=x'), 'search');
  assert.equal(data.pageKind('/hashtag/x'), 'hashtag');
  assert.equal(data.pageKind('/gaming'), 'hub');
});

test('extractPage reads the channel header, tabs and ordered sections', () => {
  const page = data.extractPage(channelData, '/@lockupchannel');
  assert.equal(page.kind, 'channel');
  assert.equal(page.header.title, 'Lockup Channel');
  assert.equal(page.header.subtitle, '@lockupchannel · 1M subscribers');
  assert.equal(page.header.banner, 'https://yt3.googleusercontent.com/banner=w1138');
  assert.deepEqual(
    page.tabs.map((t) => [t.title, t.selected, t.url]),
    [
      ['Home', true, '/@lockupchannel'],
      ['Videos', false, '/@lockupchannel/videos'],
    ],
  );
  assert.deepEqual(
    page.sections.map((s) => [s.layout, s.title, s.items.length]),
    [
      ['featured', '', 1],
      ['row', 'Popular videos', 2],
      ['grid', 'Today', 1],
      ['grid', '', 1],
    ],
  );
});

test('extractPage uses the query as the search page title', () => {
  const page = data.extractPage({ contents: {} }, '/results?search_query=lofi+beats');
  assert.equal(page.header.title, 'lofi beats');
});
