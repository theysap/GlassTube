/**
 * GlassTube store: accumulates the page data relayed by the bridge into the home feed and the
 * current watch page's related videos / playlist, and notifies subscribers when either changes.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { extractFeed, extractWatch } = GT.data;

  const state = {
    home: { items: [], shelves: [], at: 0 },
    watch: { videoId: null, related: [], playlist: null, at: 0 },
    page: { url: null, data: null, at: 0 },
  };
  const listeners = { home: new Set(), watch: new Set(), page: new Set() };
  const emit = (key) => listeners[key].forEach((fn) => fn(state[key]));

  const keyOf = (i) => `${i.kind === 'short' ? 's' : 'v'}:${i.id}`;
  const mergeItems = (into, add) => {
    const seen = new Set(into.map(keyOf));
    return into.concat(add.filter((i) => !seen.has(keyOf(i)) && seen.add(keyOf(i))));
  };

  const setHome = (feed, append) => {
    const h = state.home;
    if (!append) {
      state.home = { items: feed.items, shelves: feed.shelves, at: Date.now() };
    } else {
      h.items = mergeItems(h.items, feed.items);
      h.shelves = h.shelves.concat(feed.shelves);
      h.at = Date.now();
    }
    emit('home');
  };

  const setWatch = (watch) => {
    if (watch.isContinuation) {
      state.watch.related = mergeItems(state.watch.related, watch.related);
    } else {
      state.watch = {
        videoId: watch.videoId,
        related: watch.related,
        playlist: watch.playlist,
        at: Date.now(),
      };
    }
    emit('watch');
  };

  const setPage = (url, data) => {
    state.page = { url, data, at: Date.now() };
    emit('page');
  };

  GT.onPageData(({ endpoint, request, data, url }) => {
    if (!data) return;
    const route = GT.route(new URL(url));
    if (endpoint === 'initial' || endpoint === 'navigate') {
      if (route === 'home') setHome(extractFeed(data), false);
      else if (route === 'watch') setWatch(extractWatch(data));
      else if (route !== 'shorts') setPage(url, data);
    } else if (endpoint === 'browse') {
      if (request.browseId === 'FEwhat_to_watch') setHome(extractFeed(data), false);
      else if (request.continuation && route === 'home') setHome(extractFeed(data), true);
    } else if (endpoint === 'next') {
      if (request.continuation && route !== 'watch') return;
      setWatch(extractWatch(data));
    }
  });

  GT.store = {
    get home() {
      return state.home;
    },
    get watch() {
      return state.watch;
    },
    get page() {
      return state.page;
    },
    /** Re-reads the current browse / search page from YouTube (it grows as more loads). */
    syncPage: async () => {
      const data = await GT.bridge('getPageData');
      if (data) setPage(location.href, data);
      return !!data;
    },
    subscribe: (key, fn) => {
      listeners[key].add(fn);
      return () => listeners[key].delete(fn);
    },
    /** Ask the bridge to re-send anything captured before we were listening. */
    replay: () => GT.bridge('replay'),
    /** Re-reads YouTube's home grid (it grows as the hidden native feed pages in). */
    syncHomeGrid: async () => {
      const grid = await GT.bridge('getHomeGrid');
      if (!grid) return false;
      const feed = extractFeed(grid);
      const before = state.home.items.length;
      if (feed.items.length > before) setHome({ items: feed.items, shelves: feed.shelves }, false);
      return state.home.items.length > before;
    },
    /** Re-reads the related list (it grows as YouTube loads more). */
    syncRelated: async () => {
      const related = await GT.bridge('getRelated');
      if (!related) return;
      const items = extractWatch({ onResponseReceivedEndpoints: related }).related;
      if (items.length > state.watch.related.length) {
        state.watch.related = items;
        emit('watch');
      }
    },
  };
})();
