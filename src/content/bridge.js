/**
 * GlassTube bridge — runs in the page's MAIN world.
 *
 * The isolated content scripts cannot see YouTube's JavaScript objects, so this small script:
 *   1. forwards page data (ytInitialData, SPA navigation responses and renderer data such as
 *      the home grid after it pages in more items) to the content scripts,
 *   2. performs native single-page navigations, and
 *   3. exposes a handful of player commands (seek, volume, playback rate, storyboards).
 * It never reads cookies, never talks to any server and only relays data YouTube already loaded.
 */
(() => {
  if (window.__glassTubeBridge) return;
  window.__glassTubeBridge = true;

  const OUT = 'glasstube:bridge';
  const IN = 'glasstube:content';
  const WATCHED = /\/youtubei\/v1\/(browse|next|search)(\?|$)/;
  const last = {};

  const send = (payload) => {
    try {
      window.postMessage({ source: OUT, ...payload }, location.origin);
    } catch {
      /* non-cloneable payloads are dropped */
    }
  };

  const summarize = (body) => {
    try {
      const json = typeof body === 'string' ? JSON.parse(body) : null;
      if (!json) return {};
      return {
        browseId: json.browseId || null,
        continuation: json.continuation || null,
        videoId: json.videoId || null,
        query: json.query || null,
      };
    } catch {
      return {};
    }
  };

  const publish = (endpoint, request, data) => {
    const msg = { type: 'data', endpoint, request, data, url: location.href, at: Date.now() };
    last[endpoint === 'initial' ? 'initial' : `${endpoint}:${request.browseId || ''}`] = msg;
    send(msg);
  };

  // ── Capture innertube responses (SPA navigations + continuations) ─────────
  const nativeFetch = window.fetch;
  window.fetch = function glassTubeFetch(input, init) {
    const promise = nativeFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input?.url || String(input);
      const match = url && url.match(WATCHED);
      if (match) {
        const bodyPromise =
          init && typeof init.body === 'string'
            ? Promise.resolve(init.body)
            : input instanceof Request
              ? input
                  .clone()
                  .text()
                  .catch(() => '')
              : Promise.resolve('');
        promise
          .then((res) => res.clone().json())
          .then(async (data) => publish(match[1], summarize(await bodyPromise), data))
          .catch(() => {});
      }
    } catch {
      /* never interfere with the page's own request */
    }
    return promise;
  };

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__gtUrl = String(url);
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const match = this.__gtUrl && this.__gtUrl.match(WATCHED);
    if (match) {
      this.addEventListener('load', () => {
        try {
          const data =
            this.responseType === 'json' ? this.response : JSON.parse(this.responseText || 'null');
          if (data) publish(match[1], summarize(body), data);
        } catch {
          /* ignore */
        }
      });
    }
    return xhrSend.apply(this, arguments);
  };

  // Every SPA navigation (including back / forward) hands over the full innertube response.
  document.addEventListener('yt-navigate-finish', (e) => {
    const d = e.detail;
    const data = d?.response?.response;
    if (data) publish('navigate', { page: d.pageType || d.response.page || null }, data);
  });

  /** A renderer's current data as plain JSON (renderers mutate it as continuations arrive). */
  const rendererData = (selector) => {
    const data = document.querySelector(selector)?.data;
    if (!data) return null;
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return null;
    }
  };

  const publishInitial = () => {
    if (window.ytInitialData) publish('initial', {}, window.ytInitialData);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', publishInitial, { once: true });
  } else {
    publishInitial();
  }

  // ── Native SPA navigation ──────────────────────────────────────────────────
  const endpointFor = (u, meta) => {
    const url = u.pathname + u.search;
    const cmd = (webPageType, rootVe, extra) => ({
      commandMetadata: { webCommandMetadata: { url, webPageType, rootVe } },
      ...extra,
    });
    if (u.pathname === '/watch' && u.searchParams.get('v')) {
      const watchEndpoint = { videoId: u.searchParams.get('v') };
      if (u.searchParams.get('list')) watchEndpoint.playlistId = u.searchParams.get('list');
      if (u.searchParams.get('index'))
        watchEndpoint.index = Number(u.searchParams.get('index')) - 1;
      const t = parseInt(u.searchParams.get('t') || '', 10);
      if (t) watchEndpoint.startTimeSeconds = t;
      return cmd('WEB_PAGE_TYPE_WATCH', 3832, { watchEndpoint });
    }
    if (u.pathname.startsWith('/shorts/')) {
      return cmd('WEB_PAGE_TYPE_SHORTS', 37414, {
        reelWatchEndpoint: { videoId: u.pathname.split('/')[2] },
      });
    }
    if (u.pathname === '/results' && u.searchParams.get('search_query')) {
      return cmd('WEB_PAGE_TYPE_SEARCH', 4724, {
        searchEndpoint: { query: u.searchParams.get('search_query') },
      });
    }
    const browse = {
      '/': 'FEwhat_to_watch',
      '/feed/subscriptions': 'FEsubscriptions',
      '/feed/you': 'FElibrary',
      '/feed/library': 'FElibrary',
      '/feed/history': 'FEhistory',
      '/feed/playlists': 'FEplaylist_aggregation',
    }[u.pathname];
    if (browse) return cmd('WEB_PAGE_TYPE_BROWSE', 3854, { browseEndpoint: { browseId: browse } });
    if (u.pathname === '/playlist' && u.searchParams.get('list')) {
      return cmd('WEB_PAGE_TYPE_PLAYLIST', 5754, {
        browseEndpoint: { browseId: 'VL' + u.searchParams.get('list') },
      });
    }
    if (meta && meta.channelId) {
      return cmd('WEB_PAGE_TYPE_CHANNEL', 3611, {
        browseEndpoint: { browseId: meta.channelId, canonicalBaseUrl: u.pathname },
      });
    }
    return null;
  };

  const navigate = (href, meta) => {
    const u = new URL(href, location.origin);
    if (u.origin !== location.origin) return location.assign(u.href);
    const app = document.querySelector('ytd-app');
    const endpoint = endpointFor(u, meta);
    if (!app || !endpoint) return location.assign(u.href);
    const before = location.href;
    app.dispatchEvent(
      new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } }),
    );
    // If YouTube ignored the event, fall back to a regular page load.
    setTimeout(() => {
      const now = new URL(location.href);
      const arrived =
        now.pathname === u.pathname &&
        (u.pathname !== '/watch' || now.searchParams.get('v') === u.searchParams.get('v'));
      if (!arrived && location.href === before) location.assign(u.href);
    }, 1800);
  };

  // ── Player commands ──────────────────────────────────────────────────────
  const player = () => document.getElementById('movie_player');
  const commands = {
    navigate: (href, meta) => navigate(href, meta),
    seekTo: (t) => player()?.seekTo?.(t, true),
    getVolume: () => player()?.getVolume?.(),
    setVolume: (v) => {
      const p = player();
      if (!p) return;
      p.setVolume?.(v);
      if (v > 0 && p.isMuted?.()) p.unMute?.();
    },
    isMuted: () => player()?.isMuted?.(),
    mute: () => player()?.mute?.(),
    unMute: () => player()?.unMute?.(),
    getPlaybackRate: () => player()?.getPlaybackRate?.(),
    setPlaybackRate: (r) => player()?.setPlaybackRate?.(r),
    getAvailablePlaybackRates: () => player()?.getAvailablePlaybackRates?.(),
    nextVideo: () => player()?.nextVideo?.(),
    getVideoData: () => {
      const d = player()?.getVideoData?.();
      return d ? { title: d.title, author: d.author, videoId: d.video_id, isLive: d.isLive } : null;
    },
    getStoryboard: () => {
      const r = player()?.getPlayerResponse?.();
      return {
        spec: r?.storyboards?.playerStoryboardSpecRenderer?.spec || null,
        duration: Number(r?.videoDetails?.lengthSeconds) || null,
        videoId: r?.videoDetails?.videoId || null,
      };
    },
    getHomeGrid: () => rendererData('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer'),
    getRelated: () => rendererData('ytd-watch-flexy ytd-watch-next-secondary-results-renderer'),
    replay: () => {
      Object.values(last).forEach((msg) => send(msg));
      return Object.keys(last).length;
    },
  };

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== IN) return;
    const { type, id, command, args, url, meta } = e.data;
    if (type === 'navigate') return navigate(url, meta);
    if (type !== 'command' || !Object.hasOwn(commands, command)) return;
    let value;
    try {
      value = commands[command](...(args || []));
    } catch {
      value = undefined;
    }
    Promise.resolve(value).then((v) => send({ type: 'reply', id, value: v ?? null }));
  });
})();
