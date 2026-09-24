/**
 * GlassTube data layer.
 *
 * YouTube ships its page data as JSON (ytInitialData on first load, innertube responses on
 * SPA navigations). Its shape shifts often, so instead of hard-coding paths this walks the
 * tree and normalises every renderer it recognises into a flat `Item`:
 *
 *   { id, kind: 'video'|'live'|'short'|'channel', title, channel, channelUrl, channelId,
 *     avatar, thumb, duration, views, age, progress, url, selected }
 *
 * The parsing half is pure and unit-tested in Node; the fetching half only runs in the page.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    const GT = (root.GlassTube = root.GlassTube || {});
    GT.data = Object.assign(GT.data || {}, api, browserApi(api));
  }

  function browserApi(api) {
    const cache = new Map();
    const TTL = 10 * 60 * 1000;

    /** Loads a youtube.com page and returns its ytInitialData (same-origin, user's session). */
    const fetchInitialData = async (path, { signal, ttl = TTL } = {}) => {
      const hit = cache.get(path);
      if (hit && Date.now() - hit.at < ttl) return hit.data;
      const res = await fetch(path, { credentials: 'same-origin', signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = api.parseInitialData(await res.text());
      if (data) cache.set(path, { at: Date.now(), data });
      return data;
    };

    const fetchItems = async (path, opts) => {
      const data = await fetchInitialData(path, opts);
      return data ? api.extractItems(data) : [];
    };

    return { fetchInitialData, fetchItems, clearCache: () => cache.clear() };
  }
})(globalThis, function () {
  const THUMB_HOST = 'https://i.ytimg.com/vi/';
  const SKIP_KEYS = new Set([
    'adSlotRenderer',
    'promotedSparklesWebRenderer',
    'inFeedAdLayoutRenderer',
    'frameworkUpdates',
    'topbar',
    'microformat',
  ]);

  const text = (t) => {
    if (t == null) return '';
    if (typeof t === 'string') return t;
    if (typeof t.simpleText === 'string') return t.simpleText;
    if (typeof t.content === 'string') return t.content;
    if (Array.isArray(t.runs)) return t.runs.map((r) => r.text || '').join('');
    return '';
  };

  const bestImage = (src) => {
    const list = Array.isArray(src) ? src : src?.thumbnails || src?.sources || src?.image?.sources;
    if (!Array.isArray(list) || !list.length) return '';
    const best = list.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a));
    let url = best.url || '';
    if (url.startsWith('//')) url = 'https:' + url;
    return url;
  };

  /** Depth-first search for the first value satisfying `test(value, key)`. */
  const find = (node, test, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 24) return undefined;
    for (const [key, value] of Object.entries(node)) {
      if (test(value, key)) return value;
      if (value && typeof value === 'object') {
        const hit = find(value, test, depth + 1);
        if (hit !== undefined) return hit;
      }
    }
    return undefined;
  };
  const findAll = (node, test, out = [], depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 24) return out;
    for (const [key, value] of Object.entries(node)) {
      if (test(value, key)) out.push(value);
      else if (value && typeof value === 'object') findAll(value, test, out, depth + 1);
    }
    return out;
  };

  const channelFrom = (node) => {
    const endpoint = find(node, (v, k) => k === 'browseEndpoint' && v && v.browseId);
    return {
      channelId: endpoint?.browseId?.startsWith('UC') ? endpoint.browseId : null,
      channelUrl:
        endpoint?.canonicalBaseUrl ||
        (endpoint?.browseId?.startsWith('UC') ? `/channel/${endpoint.browseId}` : null),
    };
  };

  const parseDuration = (s) => {
    if (!s || !/^\d+(:\d{2}){1,2}$/.test(s)) return null;
    return s.split(':').reduce((acc, n) => acc * 60 + Number(n), 0);
  };

  const isLiveText = (s) => /^(live|live now)$/i.test(String(s || '').trim());

  // ── Renderer adapters ────────────────────────────────────────────────────
  const fromVideoRenderer = (r) => {
    if (!r || !r.videoId) return null;
    const byline = r.ownerText || r.shortBylineText || r.longBylineText || r.bylineText;
    const overlays = r.thumbnailOverlays || [];
    const timeStatus = overlays.find(
      (o) => o.thumbnailOverlayTimeStatusRenderer,
    )?.thumbnailOverlayTimeStatusRenderer;
    const live =
      timeStatus?.style === 'LIVE' ||
      (r.badges || []).some((b) => /LIVE/.test(b.metadataBadgeRenderer?.style || '')) ||
      isLiveText(text(timeStatus?.text));
    const resume = overlays.find(
      (o) => o.thumbnailOverlayResumePlaybackRenderer,
    )?.thumbnailOverlayResumePlaybackRenderer;
    const avatarSrc =
      r.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail ||
      r.channelThumbnail;
    const duration = text(r.lengthText) || (live ? '' : text(timeStatus?.text));
    return {
      id: r.videoId,
      kind: live ? 'live' : 'video',
      title: text(r.title) || text(r.headline),
      channel: text(byline),
      ...channelFrom(byline),
      avatar: bestImage(avatarSrc),
      thumb: bestImage(r.thumbnail),
      duration: parseDuration(duration.trim()) != null ? duration.trim() : '',
      views:
        text(r.shortViewCountText) ||
        text(r.viewCountText) ||
        text(r.metadataText).split(' · ')[0] ||
        '',
      age: text(r.publishedTimeText) || text(r.metadataText).split(' · ')[1] || '',
      progress: resume?.percentDurationWatched ?? null,
      url:
        r.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || `/watch?v=${r.videoId}`,
      selected: !!r.selected,
    };
  };

  const fromLockup = (l) => {
    if (!l || !l.contentId) return null;
    if (l.contentType && l.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO')
      return fromCollectionLockup(l);
    const meta = l.metadata?.lockupMetadataViewModel || {};
    const rows = meta.metadata?.contentMetadataViewModel?.metadataRows || [];
    const parts = rows.map((row) =>
      (row.metadataParts || []).map((p) => text(p.text)).filter(Boolean),
    );
    // Feeds put the channel on its own first row; a channel's own pages omit it and start
    // straight with "views · age", so a lone row is never treated as the channel.
    const [channel = ''] = parts.length > 1 ? parts[0] : [];
    const [views = '', age = ''] = (parts.length > 1 ? parts.slice(1) : parts).flat();
    const badges = findAll(l.contentImage, (v, k) => k === 'thumbnailBadgeViewModel');
    const badgeTexts = badges.map((b) => text(b.text));
    const live = badges.some((b) => /LIVE/.test(b.badgeStyle || '')) || badgeTexts.some(isLiveText);
    const duration = badgeTexts.find((t) => parseDuration(t) != null) || '';
    const progress = find(l.contentImage, (v, k) => k === 'startPercent' && typeof v === 'number');
    const url = find(
      l.rendererContext,
      (v, k) => k === 'url' && typeof v === 'string' && v.startsWith('/watch'),
    );
    return {
      id: l.contentId,
      kind: live ? 'live' : 'video',
      title: text(meta.title),
      channel,
      ...(meta.image ? channelFrom(meta.image) : channelFrom(meta.metadata)),
      avatar: bestImage(find(meta.image, (v, k) => k === 'sources' && Array.isArray(v))),
      thumb: bestImage(l.contentImage?.thumbnailViewModel?.image),
      duration,
      views,
      age,
      progress: progress ?? null,
      url: url || `/watch?v=${l.contentId}`,
      selected: false,
    };
  };

  const COLLECTION_TYPES = /PLAYLIST|ALBUM|PODCAST|MIX/;

  /** Playlists, mixes, albums and podcasts rendered as lockups. */
  const fromCollectionLockup = (l) => {
    if (!COLLECTION_TYPES.test(l.contentType || '')) return null;
    const meta = l.metadata?.lockupMetadataViewModel || {};
    const rows = meta.metadata?.contentMetadataViewModel?.metadataRows || [];
    const parts = rows.flatMap((row) =>
      (row.metadataParts || []).map((p) => text(p.text)).filter(Boolean),
    );
    const badges = findAll(l.contentImage, (v, k) => k === 'thumbnailBadgeViewModel').map((b) =>
      text(b.text),
    );
    const urls = findAll(l, (v, k) => k === 'url' && typeof v === 'string' && v.startsWith('/'));
    const image = find(l.contentImage, (v, k) => k === 'image' && Array.isArray(v?.sources));
    return {
      id: l.contentId,
      kind: 'playlist',
      title: text(meta.title),
      channel: parts.find((p) => !/view|video|episode|updated|playlist/i.test(p)) || '',
      ...channelFrom(meta.metadata),
      thumb: bestImage(image),
      duration: badges.find(Boolean) || '',
      views: parts.find((p) => /video|episode|track/i.test(p)) || '',
      age: parts.find((p) => /updated|ago/i.test(p)) || '',
      url:
        urls.find((u) => u.startsWith('/playlist')) ||
        urls.find((u) => u.startsWith('/watch')) ||
        `/playlist?list=${l.contentId}`,
    };
  };

  const fromPlaylistRenderer = (r) => {
    if (!r || !r.playlistId) return null;
    const count = text(r.videoCountText) || (r.videoCount ? `${r.videoCount} videos` : '');
    return {
      id: r.playlistId,
      kind: 'playlist',
      title: text(r.title),
      channel: text(r.shortBylineText || r.longBylineText),
      ...channelFrom(r.shortBylineText || r.longBylineText),
      thumb: bestImage(r.thumbnail || r.thumbnails?.[0] || r.thumbnailRenderer),
      duration: count,
      views: count,
      url:
        r.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url ||
        `/playlist?list=${r.playlistId}`,
    };
  };

  const fromReel = (r) => {
    if (!r || !r.videoId) return null;
    return {
      id: r.videoId,
      kind: 'short',
      title: text(r.headline),
      views: text(r.viewCountText),
      thumb: bestImage(r.thumbnail),
      url: `/shorts/${r.videoId}`,
      // YouTube's own endpoint carries the sequence params that make Shorts scrollable.
      endpoint: r.navigationEndpoint?.reelWatchEndpoint ? r.navigationEndpoint : null,
    };
  };

  const fromShortsLockup = (s) => {
    const id =
      s?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
      (s?.entityId || '').replace(/^shorts-shelf-item-/, '');
    if (!id) return null;
    return {
      id,
      kind: 'short',
      title: text(s.overlayMetadata?.primaryText) || text(s.accessibilityText).split(',')[0],
      views: text(s.overlayMetadata?.secondaryText),
      thumb: bestImage(s.thumbnail || s.thumbnailViewModel?.thumbnailViewModel?.image),
      url: `/shorts/${id}`,
      endpoint: s.onTap?.innertubeCommand?.reelWatchEndpoint ? s.onTap.innertubeCommand : null,
    };
  };

  const fromChannel = (c) => {
    if (!c || !c.channelId) return null;
    return {
      id: c.channelId,
      kind: 'channel',
      title: text(c.title),
      channelId: c.channelId,
      channelUrl:
        c.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || `/channel/${c.channelId}`,
      avatar: bestImage(c.thumbnail),
      views: text(c.subscriberCountText) || text(c.videoCountText),
      url: c.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || `/channel/${c.channelId}`,
    };
  };

  const ADAPTERS = {
    videoRenderer: fromVideoRenderer,
    gridVideoRenderer: fromVideoRenderer,
    compactVideoRenderer: fromVideoRenderer,
    playlistVideoRenderer: fromVideoRenderer,
    playlistPanelVideoRenderer: fromVideoRenderer,
    lockupViewModel: fromLockup,
    reelItemRenderer: fromReel,
    shortsLockupViewModel: fromShortsLockup,
    channelRenderer: fromChannel,
    gridChannelRenderer: fromChannel,
    videoCardRenderer: fromVideoRenderer,
    playlistRenderer: fromPlaylistRenderer,
    gridPlaylistRenderer: fromPlaylistRenderer,
  };
  const SHELVES = new Set(['richShelfRenderer', 'shelfRenderer', 'reelShelfRenderer']);

  const walk = (node, onItem, onShelf, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 60) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child, onItem, onShelf, depth + 1);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key)) continue;
      if (ADAPTERS[key]) {
        const item = ADAPTERS[key](value);
        if (item && item.title) onItem(item);
      } else if (onShelf && SHELVES.has(key)) {
        onShelf(value);
      } else if (value && typeof value === 'object') {
        walk(value, onItem, onShelf, depth + 1);
      }
    }
  };

  const dedupe = () => {
    const seen = new Set();
    return (item) => {
      const key = `${item.kind === 'short' ? 's' : 'v'}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };
  };

  /** Every recognised item in `node`, flattened and de-duplicated, in document order. */
  const extractItems = (node) => {
    const out = [];
    const fresh = dedupe();
    walk(node, (item) => fresh(item) && out.push(item));
    return out;
  };

  /** Main feed items plus titled shelves (Shorts, Breaking news…) kept separate. */
  const extractFeed = (node) => {
    const items = [];
    const shelves = [];
    const fresh = dedupe();
    walk(
      node,
      (item) => fresh(item) && items.push(item),
      (shelf) => {
        const shelfItems = extractItems(shelf.contents || shelf.content || shelf.items || shelf);
        if (!shelfItems.length) return;
        shelves.push({
          title: text(shelf.title) || (shelfItems.every((i) => i.kind === 'short') ? 'Shorts' : ''),
          shorts: shelfItems.every((i) => i.kind === 'short'),
          items: shelfItems,
        });
      },
    );
    return { items, shelves };
  };

  /** Related videos and playlist entries from a watch page (ytInitialData or /next). */
  const extractWatch = (data) => {
    const results = data?.contents?.twoColumnWatchNextResults;
    const continuation = data?.onResponseReceivedEndpoints;
    const playlist = results?.playlist?.playlist;
    return {
      videoId: data?.currentVideoEndpoint?.watchEndpoint?.videoId || null,
      related: extractItems(results?.secondaryResults || continuation || {}).filter(
        (i) => i.kind !== 'channel',
      ),
      playlist: playlist
        ? {
            title: text(playlist.title),
            id: playlist.playlistId,
            items: extractItems(playlist.contents || []),
          }
        : null,
      isContinuation: !results && !!continuation,
    };
  };

  // ── Whole pages (channels, playlists, feeds, search, hubs) ─────────────
  const metaRowsText = (vm) =>
    (vm?.contentMetadataViewModel?.metadataRows || [])
      .flatMap((row) => (row.metadataParts || []).map((p) => text(p.text)).filter(Boolean))
      .join(' · ');

  const extractHeader = (data) => {
    const h = data?.header || {};
    const vm = find(h, (v, k) => k === 'pageHeaderViewModel');
    const c4 = h.c4TabbedHeaderRenderer;
    const pl = h.playlistHeaderRenderer;
    const meta =
      data?.metadata?.channelMetadataRenderer || data?.metadata?.playlistMetadataRenderer;
    const header = {
      title: '',
      subtitle: '',
      description: '',
      avatar: '',
      banner: '',
      hero: '',
    };
    if (vm) {
      header.title = text(vm.title?.dynamicTextViewModel?.text) || text(vm.title);
      header.subtitle = metaRowsText(vm.metadata);
      header.description = text(vm.description?.descriptionPreviewViewModel?.description);
      header.avatar = bestImage(find(vm.image, (v, k) => k === 'sources' && Array.isArray(v)));
      header.banner = bestImage(vm.banner?.imageBannerViewModel?.image);
      header.hero = bestImage(vm.heroImage?.contentPreviewImageViewModel?.image);
    } else if (c4) {
      header.title = text(c4.title);
      header.subtitle = [
        text(c4.channelHandleText),
        text(c4.subscriberCountText),
        text(c4.videosCountText),
      ]
        .filter(Boolean)
        .join(' · ');
      header.avatar = bestImage(c4.avatar);
      header.banner = bestImage(c4.banner);
    } else if (pl) {
      header.title = text(pl.title);
      header.subtitle = [text(pl.ownerText), text(pl.numVideosText), text(pl.viewCountText)]
        .filter(Boolean)
        .join(' · ');
      header.description = text(pl.descriptionText);
    } else {
      const titled = find(h, (v, k) => k === 'title' && text(v));
      header.title = text(titled);
    }
    header.channelId = data?.metadata?.channelMetadataRenderer?.externalId || null;
    if (!header.title && meta) header.title = meta.title || '';
    if (meta?.description && meta.description.length > header.description.length) {
      header.description = meta.description;
    }
    if (!header.avatar && meta?.avatar) header.avatar = bestImage(meta.avatar);
    return header;
  };

  const extractTabs = (data) =>
    (data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [])
      .map((t) => t.tabRenderer)
      .filter((t) => t && t.title)
      .map((t) => ({
        title: t.title,
        selected: !!t.selected,
        url: t.endpoint?.commandMetadata?.webCommandMetadata?.url || null,
        endpoint: t.endpoint || null,
      }));

  const sectionTitle = (header) => {
    if (!header) return '';
    const titled = find(header, (v, k) => k === 'title' && text(v));
    return text(titled);
  };
  const hasShelf = (node) => !!find(node, (v, k) => SHELVES.has(k));

  /**
   * Splits a page's contents into ordered sections. Titled shelves become rows; titled item
   * sections (e.g. history days) and loose items become grids.
   */
  const extractSections = (root) => {
    const sections = [];
    let loose = null;
    const flush = () => {
      if (loose?.items.length) sections.push(loose);
      loose = null;
    };
    const addLoose = (item) => {
      if (!loose) loose = { title: '', layout: 'grid', items: [] };
      if (!loose.items.some((i) => i.id === item.id && i.kind === item.kind))
        loose.items.push(item);
    };
    const visit = (node, depth = 0) => {
      if (!node || typeof node !== 'object' || depth > 60) return;
      if (Array.isArray(node)) return node.forEach((n) => visit(n, depth + 1));
      for (const [key, value] of Object.entries(node)) {
        if (SKIP_KEYS.has(key) || key === 'header' || key === 'engagementPanels') continue;
        if (SHELVES.has(key)) {
          flush();
          const items = extractItems(value.contents || value.content || value.items || value);
          if (items.length) {
            const shorts = items.every((i) => i.kind === 'short');
            sections.push({
              title: text(value.title) || (shorts ? 'Shorts' : ''),
              layout: 'row',
              items,
            });
          }
        } else if (key === 'itemSectionRenderer') {
          const title = sectionTitle(value.header);
          if (title && !hasShelf(value.contents)) {
            flush();
            const items = extractItems(value.contents || []);
            if (items.length) sections.push({ title, layout: 'grid', items });
          } else {
            visit(value.contents, depth + 1);
          }
        } else if (
          /(List|Grid|Carousel)Renderer$/.test(key) &&
          value?.header &&
          sectionTitle(value.header) &&
          !hasShelf(value.items || value.cards || value.contents)
        ) {
          // Titled lists (hub pages, channel grids) read as shelves.
          flush();
          const items = extractItems(value.items || value.cards || value.contents || []);
          if (items.length)
            sections.push({ title: sectionTitle(value.header), layout: 'row', items });
        } else if (key === 'richListHeaderRenderer') {
          // Hub pages title the items that follow with a separate header renderer.
          flush();
          loose = { title: text(value.title), layout: 'grid', items: [] };
        } else if (key === 'channelVideoPlayerRenderer') {
          flush();
          const item = fromVideoRenderer(value);
          if (item?.title) sections.push({ title: '', layout: 'featured', items: [item] });
        } else if (ADAPTERS[key]) {
          const item = ADAPTERS[key](value);
          if (item && item.title) addLoose(item);
        } else if (value && typeof value === 'object') {
          visit(value, depth + 1);
        }
      }
    };
    visit(root);
    flush();
    return sections;
  };

  const pageKind = (url) => {
    const u = new URL(url, 'https://www.youtube.com');
    const p = u.pathname;
    if (/^\/(@|channel\/|c\/|user\/)/.test(p)) return 'channel';
    if (p === '/playlist') return 'playlist';
    if (p === '/results') return 'search';
    if (p === '/feed/history') return 'history';
    if (p === '/feed/subscriptions') return 'subscriptions';
    if (p === '/feed/you' || p === '/feed/library') return 'library';
    if (p === '/feed/playlists') return 'playlists';
    if (p === '/feed/channels') return 'channels';
    if (p.startsWith('/hashtag/')) return 'hashtag';
    return 'hub';
  };

  /** Header, tabs and sections for any browse / search page. */
  const extractPage = (data, url) => {
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents ||
      data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.find((t) => t.tabRenderer?.selected)
        ?.tabRenderer?.content ||
      data?.contents ||
      data?.onResponseReceivedActions;
    const kind = pageKind(url);
    const header = extractHeader(data);
    if (kind === 'search') {
      header.title = new URL(url, 'https://www.youtube.com').searchParams.get('search_query') || '';
    }
    return { kind, header, tabs: extractTabs(data), sections: extractSections(contents) };
  };

  /** Pulls `ytInitialData` out of a youtube.com HTML document. */
  const parseInitialData = (html) => {
    const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
    for (const marker of markers) {
      const start = html.indexOf(marker);
      if (start === -1) continue;
      const from = start + marker.length;
      const end = html.indexOf(';</script>', from);
      if (end === -1) continue;
      let raw = html.slice(from, end).trim();
      if (raw.startsWith("'")) {
        // Some variants ship the JSON as an escaped JS string literal.
        raw = raw
          .slice(1, -1)
          .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
      }
      try {
        return JSON.parse(raw);
      } catch {
        /* try the next marker */
      }
    }
    return null;
  };

  const thumbUrl = (id, quality = 'hqdefault') => `${THUMB_HOST}${id}/${quality}.jpg`;

  /**
   * Parses a player storyboard spec ("url|w#h#count#cols#rows#intervalMs#name#sigh|…") into
   * levels of sprite sheets used for scrubbing previews. Highest resolution last.
   */
  const parseStoryboard = (spec) => {
    if (typeof spec !== 'string' || !spec.includes('|')) return null;
    const [base, ...rawLevels] = spec.split('|');
    const levels = rawLevels
      .map((raw, index) => {
        const [w, h, count, cols, rows, interval, name, sigh] = raw.split('#');
        const level = {
          index,
          width: Number(w),
          height: Number(h),
          count: Number(count),
          cols: Number(cols),
          rows: Number(rows),
          interval: Number(interval),
          name,
          sigh,
        };
        return level.width && level.count && level.cols && level.rows ? level : null;
      })
      .filter(Boolean);
    return levels.length ? { base, levels } : null;
  };

  /** Sprite URL and offsets of the preview frame for time `t` (seconds). */
  const storyboardFrame = (board, t, duration, maxWidth = 320) => {
    if (!board) return null;
    const usable = board.levels.filter((l) => l.width <= maxWidth);
    const level = (usable.length ? usable : board.levels).at(-1);
    const frame = Math.max(
      0,
      Math.min(
        level.count - 1,
        level.interval > 0
          ? Math.floor((t * 1000) / level.interval)
          : Math.floor((t / Math.max(1, duration)) * level.count),
      ),
    );
    const perSheet = level.cols * level.rows;
    const sheet = Math.floor(frame / perSheet);
    const cell = frame % perSheet;
    let url = board.base
      .replace('$L', String(level.index))
      .replace('$N', level.name.replace('$M', String(sheet)));
    if (level.sigh) url += `${url.includes('?') ? '&' : '?'}sigh=${encodeURIComponent(level.sigh)}`;
    return {
      url,
      x: (cell % level.cols) * level.width,
      y: Math.floor(cell / level.cols) * level.height,
      width: level.width,
      height: level.height,
      sheetWidth: level.cols * level.width,
      sheetHeight: level.rows * level.height,
    };
  };

  return {
    text,
    bestImage,
    parseDuration,
    extractItems,
    extractFeed,
    extractWatch,
    extractPage,
    pageKind,
    parseInitialData,
    thumbUrl,
    parseStoryboard,
    storyboardFrame,
  };
});
