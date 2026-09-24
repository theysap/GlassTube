import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homeData, lockup, videoRenderer, watchData } from './fixtures/youtube.mjs';

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

test('non-video lockups (playlists, mixes) are skipped', () => {
  const playlist = lockup('PLxyz');
  playlist.lockupViewModel.contentType = 'LOCKUP_CONTENT_TYPE_PLAYLIST';
  assert.equal(data.extractItems(playlist).length, 0);
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
