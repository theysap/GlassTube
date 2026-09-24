/**
 * GlassTube browse pages: channels, playlists (Watch Later, Liked…), Subscriptions, History,
 * You, Playlists, search results, hashtags and hub pages (Gaming, Music, News…) rendered as
 * Apple TV-style pages — a page header, glass tab pills, shelves, grids and episode lists.
 *
 * Built from the page's own JSON. Pages that don't parse into any items (settings, Posts…)
 * stay native (still themed), and "Classic View" hands any page back to YouTube's layout.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;
  const CLASSIC_KEY = 'glasstube:classic-pages';
  const SIDEBAR_FOR = {
    subscriptions: 'subs',
    history: 'history',
    library: 'you',
    playlists: 'you',
  };

  let layer = null;
  let pill = null;
  let cleanup = [];
  let renderedUrl = '';
  let subscribeTimer = 0;
  let channelsRow = null;

  const isClassic = () => {
    try {
      return sessionStorage.getItem(CLASSIC_KEY) === '1';
    } catch {
      return false;
    }
  };
  const setClassic = (on) => {
    try {
      if (on) sessionStorage.setItem(CLASSIC_KEY, '1');
      else sessionStorage.removeItem(CLASSIC_KEY);
    } catch {
      /* private mode */
    }
    teardown();
    build();
  };

  const samePage = (a, b) => {
    if (!a || !b) return false;
    const x = new URL(a, location.origin);
    const y = new URL(b, location.origin);
    return x.pathname === y.pathname && x.search === y.search;
  };

  const currentPage = () => {
    const p = GT.store.page;
    if (!p.data || !samePage(p.url, location.href)) return null;
    return GT.data.extractPage(p.data, location.href);
  };

  const hasItems = (page) => page?.sections.some((s) => s.items.length);

  // ── Headers ─────────────────────────────────────────────────────────────
  const nativeSubscribe = () =>
    document.querySelector(
      'ytd-page-manager > ytd-browse:not([hidden]) :is(yt-subscribe-button-view-model, ytd-subscribe-button-renderer) button',
    );

  const subscribeProxy = () => {
    const btn = h('button.gt-btn.gt-btn-primary.gt-focusable.gt-subscribe', {
      type: 'button',
      hidden: true,
      onclick: () => nativeSubscribe()?.click(),
    });
    const sync = () => {
      const native = nativeSubscribe();
      btn.hidden = !native;
      const label = native?.textContent?.trim() || 'Subscribe';
      if (btn.textContent !== label) btn.textContent = label;
      btn.classList.toggle('gt-btn-primary', !/subscribed/i.test(label));
    };
    clearInterval(subscribeTimer);
    subscribeTimer = setInterval(sync, 800);
    setTimeout(sync, 50);
    return btn;
  };

  const classicButton = (label = 'Classic View') =>
    h(
      'button.gt-btn.gt-focusable',
      {
        type: 'button',
        onclick: () => setClassic(true),
        title: 'Use YouTube’s own layout for this page',
      },
      svg('grid'),
      label,
    );

  /** Description clamped to two lines, with a More / Less toggle when there is more to read. */
  const description = (text) => {
    if (!text) return null;
    const p = h('p.gt-page-desc', text);
    const label = h('span', 'More');
    const toggle = h(
      'button.gt-desc-toggle.gt-focusable',
      {
        type: 'button',
        'aria-expanded': 'false',
        onclick: () => {
          const open = p.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', String(open));
          label.textContent = open ? 'Less' : 'More';
          if (!open) p.scrollTop = 0;
        },
      },
      label,
      svg('chevronDown'),
    );
    // Only offer the toggle when the two-line clamp actually hides something.
    toggle.hidden = true;
    requestAnimationFrame(() => {
      toggle.hidden = p.scrollHeight <= p.clientHeight + 2;
    });
    return h('div.gt-desc', p, toggle);
  };

  const channelHeader = (page) => {
    const { header } = page;
    return h(
      'header.gt-page-head.gt-channel-head',
      h(
        'div.gt-channel-banner',
        header.banner ? GT.ui.img([header.banner], { eager: true, minWidth: 1 }) : null,
      ),
      h(
        'div.gt-channel-id',
        header.avatar &&
          GT.ui.img([header.avatar], { cls: 'gt-channel-avatar', eager: true, minWidth: 1 }),
        h(
          'div.gt-channel-text',
          h('h1.gt-page-title', header.title),
          header.subtitle && h('p.gt-page-sub', header.subtitle),
          description(header.description),
          h('div.gt-page-actions', subscribeProxy()),
        ),
      ),
    );
  };

  const playlistHeader = (page) => {
    const { header } = page;
    const items = page.sections
      .flatMap((s) => s.items)
      .filter((i) => i.kind === 'video' || i.kind === 'live');
    const list = new URL(location.href).searchParams.get('list');
    const first = items[0];
    const playUrl = first
      ? new URL(
          first.url?.includes('list=') ? first.url : `/watch?v=${first.id}&list=${list}`,
          location.origin,
        ).href
      : null;
    const art = header.hero || (first ? GT.data.thumbUrl(first.id, 'maxresdefault') : '');
    return h(
      'header.gt-page-head.gt-collection-head',
      h(
        'div.gt-collection-art',
        art &&
          GT.ui.img([art, first && GT.data.thumbUrl(first.id, 'hqdefault')], {
            eager: true,
            minWidth: 121,
          }),
      ),
      h(
        'div.gt-collection-info',
        h(
          'div.gt-eyebrow',
          list === 'WL' ? 'Watch Later' : list === 'LL' ? 'Liked Videos' : 'Playlist',
        ),
        h('h1.gt-page-title', header.title),
        header.subtitle && h('p.gt-page-sub', header.subtitle),
        description(header.description),
        h(
          'div.gt-page-actions',
          playUrl &&
            GT.linkify(
              h('a.gt-btn.gt-btn-primary.gt-focusable', { href: playUrl }, svg('play'), 'Play All'),
            ),
          classicButton('Edit'),
        ),
      ),
    );
  };

  const TITLES = {
    subscriptions: 'Subscriptions',
    history: 'History',
    library: 'You',
    playlists: 'Playlists',
    channels: 'Channels',
  };

  const simpleHeader = (page) => {
    const { header, kind } = page;
    const title = TITLES[kind] || header.title || document.title.replace(/ - YouTube$/, '');
    return h(
      'header.gt-page-head.gt-simple-head',
      kind === 'search' && h('div.gt-eyebrow', 'Results for'),
      h('h1.gt-page-title', kind === 'search' ? `“${title}”` : title),
      header.subtitle && h('p.gt-page-sub', header.subtitle),
      (kind === 'history' || kind === 'subscriptions') &&
        h(
          'div.gt-page-actions',
          classicButton(kind === 'history' ? 'Manage History' : 'Classic View'),
        ),
    );
  };

  const headerFor = (page) =>
    page.kind === 'channel'
      ? channelHeader(page)
      : page.kind === 'playlist'
        ? playlistHeader(page)
        : simpleHeader(page);

  const tabsFor = (page) => {
    const tabs = page.tabs.filter((t) => t.url);
    if (tabs.length < 2) return null;
    // Trust the URL over the payload's `selected` flag (stale after quick tab switches).
    const here = location.pathname.replace(/\/$/, '');
    const matches = (t) => new URL(t.url, location.origin).pathname.replace(/\/$/, '') === here;
    const byUrl = tabs.some(matches);
    return h(
      'nav.gt-tabs.gt-glass',
      { 'aria-label': 'Sections' },
      tabs.map((t) =>
        GT.linkify(
          h(
            'a.gt-tab.gt-focusable',
            {
              href: new URL(t.url, location.origin).href,
              'aria-current': (byUrl ? matches(t) : t.selected) ? 'page' : null,
            },
            t.title,
          ),
          { endpoint: t.endpoint },
        ),
      ),
    );
  };

  // ── Sections ────────────────────────────────────────────────────────────
  const featured = (item) =>
    h(
      'section.gt-featured',
      { dataset: { key: 'featured' } },
      GT.ui.card(item),
      h(
        'div.gt-featured-info',
        h('div.gt-eyebrow', 'Featured'),
        h('h2.gt-featured-title', item.title),
        h('p.gt-page-sub', [item.views, item.age].filter(Boolean).join(' · ')),
        GT.linkify(
          h(
            'a.gt-btn.gt-btn-primary.gt-focusable',
            { href: new URL(item.url || `/watch?v=${item.id}`, location.origin).href },
            svg('play'),
            'Play',
          ),
        ),
      ),
    );

  /** Mixed grids (search results, hubs) keep channels and Shorts on shelves of their own. */
  const splitMixed = (s) => {
    if (s.layout !== 'grid') return [s];
    const shorts = s.items.filter((i) => i.kind === 'short');
    const channels = s.items.filter((i) => i.kind === 'channel');
    const rest = s.items.filter((i) => i.kind !== 'short' && i.kind !== 'channel');
    if (!rest.length) return [s];
    return [
      channels.length && { title: 'Channels', layout: 'row', items: channels },
      { ...s, items: rest },
      shorts.length && { title: 'Shorts', layout: 'row', items: shorts },
    ].filter(Boolean);
  };

  const renderSections = (page) => {
    const container = layer.querySelector('.gt-sections');
    const existing = new Map([...container.children].map((c) => [c.dataset.key, c]));
    const els = page.sections
      .flatMap(splitMixed)
      .filter((s) => s.items.length)
      .map((s, i) => {
        const layout = page.kind === 'playlist' && s.layout === 'grid' ? 'episodes' : s.layout;
        const key = `${i}:${layout}:${s.title}`;
        const el = existing.get(key);
        if (layout === 'featured') return el || featured(s.items[0]);
        if (layout === 'row') {
          if (el) GT.ui.setRowItems(el, s.items);
          return el || GT.ui.row({ key, title: s.title, items: s.items });
        }
        if (layout === 'episodes') {
          if (el) GT.ui.setEpisodeItems(el, s.items);
          return el || GT.ui.episodes({ key, items: s.items });
        }
        if (el) GT.ui.setGridItems(el, s.items);
        return el || GT.ui.grid({ key, title: s.title, items: s.items });
      });
    if (channelsRow) els.unshift(channelsRow);
    const same =
      els.length === container.children.length &&
      els.every((el, i) => container.children[i] === el);
    if (!same) container.replaceChildren(...els);
  };

  // The Subscriptions page opens with a row of your channels, like the TV app's channel strip.
  const loadChannels = async () => {
    try {
      const items = (await GT.data.fetchItems('/feed/channels')).filter(
        (i) => i.kind === 'channel',
      );
      if (!layer || !items.length || GT.data.pageKind(location.href) !== 'subscriptions') return;
      channelsRow = GT.ui.row({
        key: 'channels',
        title: 'Your Channels',
        items,
        href: '/feed/channels',
      });
      render();
    } catch {
      /* optional */
    }
  };

  const render = () => {
    if (!layer) return;
    const page = currentPage();
    if (!page) return;
    if (!hasItems(page)) {
      // Nothing we can draw (e.g. a channel's Posts tab) — let YouTube's page show.
      layer.hidden = true;
      document.documentElement.classList.remove('gt-browse-active');
      return;
    }
    layer.hidden = false;
    document.documentElement.classList.add('gt-browse-active');
    layer.dataset.kind = page.kind;
    if (renderedUrl !== location.href) {
      renderedUrl = location.href;
      channelsRow = null;
      layer
        .querySelector('.gt-page')
        .replaceChildren(headerFor(page), tabsFor(page) || '', h('div.gt-sections'));
      layer.scrollTop = 0;
      const art =
        page.header.banner ||
        page.header.hero ||
        page.header.avatar ||
        page.sections.flatMap((s) => s.items).find((i) => i.thumb)?.thumb;
      layer
        .querySelector('.gt-ambient')
        .replaceChildren(art ? GT.ui.img([art], { minWidth: 1 }) : '');
      if (page.kind === 'subscriptions') loadChannels();
    }
    renderSections(page);
  };

  // ── Paging ──────────────────────────────────────────────────────────────
  let lastMore = 0;
  const requestMore = () => {
    if (Date.now() - lastMore < 2500) return;
    lastMore = Date.now();
    window.scrollTo(0, document.documentElement.scrollHeight);
    [1200, 3000, 6000].forEach((ms) => setTimeout(() => layer && GT.store.syncPage(), ms));
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────
  const buildPill = () => {
    pill = h(
      'button.gt-return-pill.gt-glass',
      { type: 'button', onclick: () => setClassic(false) },
      h('img', { src: chrome.runtime.getURL('icons/icon32.png'), alt: '' }),
      'GlassTube View',
    );
    document.body.append(pill);
  };

  let builtFor = '';
  const build = () => {
    builtFor = location.href;
    if (isClassic()) return buildPill();
    const kind = GT.data.pageKind(location.href);
    layer = h(
      'div#gt-browse.gt-layer.gt-surface.gt-browse',
      { hidden: true },
      h('div.gt-ambient', { 'aria-hidden': 'true' }),
      GT.ui.sidebar({
        current: SIDEBAR_FOR[kind] || (location.search.includes('list=WL') ? 'later' : ''),
        extra: [
          { sep: true },
          { id: 'classic', label: 'Classic View', icon: 'grid', action: () => setClassic(true) },
        ],
      }),
      h('div.gt-page'),
      h('div.gt-sentinel'),
      h('footer.gt-home-foot', `GlassTube ${GT.VERSION}`),
    );
    document.body.append(layer);
    const unsub = GT.store.subscribe('page', render);
    const releaseFocus = GT.ui.focusEngine(layer);
    GT.ui.enableTilt(layer);
    const io = new IntersectionObserver((e) => e[0].isIntersecting && requestMore(), {
      root: layer,
      rootMargin: '900px 0px',
    });
    io.observe(layer.querySelector('.gt-sentinel'));
    const onKey = (e) => {
      if (e.key === '/' && !GT.isTyping(e) && !GT.search.isOpen() && !layer.hidden) {
        e.preventDefault();
        e.stopPropagation();
        GT.search.open();
      }
    };
    document.addEventListener('keydown', onKey, true);
    cleanup = [
      unsub,
      releaseFocus,
      () => io.disconnect(),
      () => document.removeEventListener('keydown', onKey, true),
    ];

    render();
    if (!currentPage()) GT.store.syncPage();
  };

  const teardown = () => {
    cleanup.forEach((fn) => fn?.());
    cleanup = [];
    clearInterval(subscribeTimer);
    layer?.remove();
    pill?.remove();
    layer = pill = channelsRow = null;
    renderedUrl = '';
    document.documentElement.classList.remove('gt-browse-active');
  };

  GT.register({
    name: 'browse',
    active: (s, route) => s.pages && (route === 'other' || route === 'search'),
    mount: build,
    unmount: teardown,
    update: () => {
      // Moving between browse pages (tabs, channels, playlists): rebuild for the new page.
      if (builtFor === location.href) return;
      teardown();
      build();
    },
  });
})();
