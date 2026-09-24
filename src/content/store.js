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
  };
  const listeners = { home: new Set(), watch: new Set() };
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

  GT.onPageData(({ endpoint, request, data, url }) => {
    if (!data) return;
    const route = GT.route(new URL(url));
    if (endpoint === 'initial') {
      if (route === 'home') setHome(extractFeed(data), false);
      else if (route === 'watch') setWatch(extractWatch(data));
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
    subscribe: (key, fn) => {
      listeners[key].add(fn);
      return () => listeners[key].delete(fn);
    },
    /** Ask the bridge to re-send anything captured before we were listening. */
    replay: () => GT.bridge('replay'),
  };
})();
