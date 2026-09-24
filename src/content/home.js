/**
 * GlassTube home: a full-screen, Apple TV-style layer over youtube.com/ — a rotating Top Shelf
 * hero followed by horizontally scrolling shelves. YouTube's own home keeps running
 * underneath (hidden) so its infinite feed can still be paged in as you scroll.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;
  const CLASSIC_KEY = 'glasstube:classic-home';
  const HERO_COUNT = 5;
  const HERO_INTERVAL = 9000;
  const CHUNK = 12;
  const MORE_TITLES = ['Recommended', 'More to Watch', 'Discover Something New', 'Picked for You'];
  const EXPLORE = [
    { key: 'music', title: 'Music', q: 'music' },
    { key: 'gaming', title: 'Gaming', q: 'gaming' },
    { key: 'news', title: 'News', q: 'news today' },
    { key: 'tech', title: 'Tech', q: 'tech review' },
    { key: 'trailers', title: 'Movie Trailers', q: 'official trailer' },
    { key: 'sports', title: 'Sports Highlights', q: 'sports highlights' },
    { key: 'podcasts', title: 'Podcasts', q: 'podcast full episode' },
    { key: 'learning', title: 'Learning', q: 'explained documentary' },
  ];

  let layer = null;
  let pill = null;
  let cleanup = [];
  let heroIds = '';
  let heroIndex = 0;
  let heroTimer = 0;
  let feedEmpty = false;
  let savedScroll = { at: 0, top: 0 };
  const lazy = { history: null, subs: null, later: null, explore: {} };

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

  const isVideo = (i) => i.kind === 'video' || i.kind === 'live';

  // ── Row model ──────────────────────────────────────────────────────────
  const heroItems = () => {
    const pool = GT.store.home.items.filter((i) => i.kind === 'video');
    if (pool.length) return pool.slice(0, HERO_COUNT);
    // No personal feed: take the lead item from each Explore shelf for a varied Top Shelf.
    const explore = EXPLORE.map((x) => lazy.explore[x.key]?.[0]);
    const fallback = [...explore, ...(lazy.subs || [])].filter((i) => i?.kind === 'video');
    return fallback.slice(0, HERO_COUNT);
  };

  const sections = () => {
    const feed = GT.store.home;
    const videos = feed.items.filter(isVideo);
    const hero = new Set(heroItems().map((i) => i.id));
    const rest = videos.filter((i) => !hero.has(i.id));
    const out = [];
    const push = (s) => s.items.length && out.push(s);

    const resume = (lazy.history || []).filter((i) => i.progress > 2 && i.progress < 95);
    push({
      key: 'continue',
      title: 'Continue Watching',
      items: resume.slice(0, 20),
      href: '/feed/history',
    });
    push({ key: 'top', title: 'Top Picks for You', items: rest.slice(0, CHUNK) });
    push({
      key: 'subs',
      title: 'From Your Subscriptions',
      items: (lazy.subs || []).filter(isVideo).slice(0, 24),
      href: '/feed/subscriptions',
    });
    const shorts = [
      ...feed.shelves.filter((s) => s.shorts).flatMap((s) => s.items),
      ...feed.items.filter((i) => i.kind === 'short'),
    ];
    push({ key: 'shorts', title: 'Shorts', items: shorts, variant: 'short', href: '/shorts' });
    const live = videos.filter((i) => i.kind === 'live');
    if (live.length >= 3) push({ key: 'live', title: 'Live Now', items: live });
    feed.shelves
      .filter((s) => !s.shorts && s.title)
      .forEach((s, n) => push({ key: `shelf-${n}-${s.title}`, title: s.title, items: s.items }));
    push({
      key: 'later',
      title: 'Watch Later',
      items: (lazy.later || []).filter(isVideo).slice(0, 24),
      href: '/playlist?list=WL',
    });
    for (const x of EXPLORE) {
      const items = lazy.explore[x.key];
      if (items) push({ key: `x-${x.key}`, title: x.title, subtitle: 'Explore', items });
    }
    for (let n = 0, i = CHUNK; i < rest.length; n++, i += CHUNK) {
      push({
        key: `more-${n}`,
        title: MORE_TITLES[n % MORE_TITLES.length] + (n >= MORE_TITLES.length ? ` ${n + 1}` : ''),
        items: rest.slice(i, i + CHUNK),
      });
    }
    return out;
  };

  // ── Hero (Top Shelf) ────────────────────────────────────────────────────
  const heroSlide = (item) =>
    GT.ui.img(GT.ui.thumbSources(item, true), { cls: 'gt-hero-img', eager: true, minWidth: 400 });

  const renderHeroContent = () => {
    const items = heroItems();
    const item = items[heroIndex];
    const hero = layer?.querySelector('.gt-hero');
    if (!hero || !item) return;
    hero
      .querySelectorAll('.gt-hero-slide')
      .forEach((s, i) => s.classList.toggle('is-active', i === heroIndex));
    hero.querySelectorAll('.gt-hero-dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === heroIndex);
      d.setAttribute('aria-current', i === heroIndex ? 'true' : 'false');
    });
    const ambient = layer.querySelector('.gt-ambient');
    ambient.replaceChildren(GT.ui.img([GT.data.thumbUrl(item.id, 'mqdefault'), item.thumb]));

    const watch = new URL(item.url || `/watch?v=${item.id}`, location.origin).href;
    const content = h(
      'div.gt-hero-content',
      h(
        'div.gt-hero-eyebrow',
        item.avatar && GT.ui.img([item.avatar], { cls: 'gt-avatar', minWidth: 1 }),
        h('span', item.channel || 'Top Pick'),
      ),
      h('h1.gt-hero-title', item.title),
      h(
        'div.gt-hero-meta',
        item.kind === 'live' && h('span.gt-badge.gt-badge-live', 'LIVE'),
        item.duration && h('span.gt-pill', item.duration),
        [item.views, item.age].filter(Boolean).join(' · '),
      ),
      h(
        'div.gt-hero-actions',
        GT.linkify(h('a.gt-btn.gt-btn-primary.gt-focusable', { href: watch }, svg('play'), 'Play')),
        item.channelUrl &&
          GT.linkify(
            h(
              'a.gt-btn.gt-focusable',
              { href: new URL(item.channelUrl, location.origin).href },
              svg('person'),
              'Channel',
            ),
            item.channelId ? { channelId: item.channelId } : undefined,
          ),
      ),
    );
    const old = hero.querySelector('.gt-hero-content');
    const hadFocus = old?.contains(document.activeElement);
    old ? old.replaceWith(content) : hero.append(content);
    if (hadFocus) content.querySelector('.gt-focusable')?.focus({ preventScroll: true });
  };

  const goHero = (i) => {
    const n = heroItems().length;
    if (!n) return;
    heroIndex = (i + n) % n;
    renderHeroContent();
    restartHeroTimer();
  };

  const restartHeroTimer = () => {
    clearInterval(heroTimer);
    const hero = layer?.querySelector('.gt-hero');
    if (!hero) return;
    hero.style.setProperty('--gt-hero-interval', `${HERO_INTERVAL}ms`);
    hero.classList.toggle('gt-rotating', GT.settings.heroRotate);
    if (!GT.settings.heroRotate) return;
    heroTimer = setInterval(() => {
      const paused =
        document.hidden ||
        hero.matches(':hover') ||
        hero.contains(document.activeElement) ||
        layer.scrollTop > hero.offsetHeight * 0.6 ||
        GT.search?.isOpen();
      if (!paused) goHero(heroIndex + 1);
    }, HERO_INTERVAL);
  };

  const renderHero = () => {
    const items = heroItems();
    const ids = items.map((i) => i.id).join();
    const hero = layer.querySelector('.gt-hero');
    hero.classList.toggle('gt-hero-empty', !items.length);
    if (ids === heroIds) return;
    heroIds = ids;
    heroIndex = 0;
    hero
      .querySelector('.gt-hero-slides')
      .replaceChildren(...items.map((item) => h('div.gt-hero-slide', heroSlide(item))));
    hero.querySelector('.gt-hero-dots').replaceChildren(
      ...items.map((item, i) =>
        h(
          'button.gt-hero-dot',
          {
            type: 'button',
            'aria-label': `Show ${item.title}`,
            tabindex: '-1',
            onclick: () => goHero(i),
          },
          h('i'),
        ),
      ),
    );
    renderHeroContent();
    restartHeroTimer();
  };

  // ── Rows ────────────────────────────────────────────────────────────────
  const renderRows = () => {
    const container = layer.querySelector('.gt-rows');
    const existing = new Map(
      [...container.children].filter((c) => c.dataset.key).map((c) => [c.dataset.key, c]),
    );
    const wanted = sections().map((s) => {
      const el = existing.get(s.key);
      if (!el) return GT.ui.row(s);
      GT.ui.setRowItems(el, s.items, s.variant);
      return el;
    });
    const order = [...container.children].filter((c) => c.dataset.key);
    const same = order.length === wanted.length && order.every((el, i) => el === wanted[i]);
    if (!same) {
      const focused = document.activeElement;
      container.replaceChildren(...wanted);
      if (focused && container.contains(focused)) focused.focus({ preventScroll: true });
    }
    const note = layer.querySelector('.gt-empty-note');
    note.hidden = !(feedEmpty && !GT.store.home.items.length);
  };

  const render = () => {
    if (!layer) return;
    renderHero();
    renderRows();
  };

  // ── Data loading ────────────────────────────────────────────────────────
  const loadLazy = async (key, path, opts) => {
    if (lazy[key]) return;
    try {
      lazy[key] = await GT.data.fetchItems(path, opts);
    } catch {
      lazy[key] = [];
    }
    render();
  };

  const loadExplore = async (count) => {
    const targets = EXPLORE.slice(0, count).filter((x) => !lazy.explore[x.key]);
    await Promise.all(
      targets.map(async (x) => {
        try {
          const items = await GT.data.fetchItems(
            `/results?search_query=${encodeURIComponent(x.q)}&sp=EgIQAQ%253D%253D`,
          );
          lazy.explore[x.key] = items.filter((i) => i.kind === 'video').slice(0, 20);
        } catch {
          lazy.explore[x.key] = [];
        }
      }),
    );
    render();
  };

  let lastMore = 0;
  const requestMore = () => {
    // Nudge YouTube's hidden native feed so it fetches its next page (captured by the bridge).
    if (Date.now() - lastMore < 2500 || !GT.store.home.items.length) return;
    lastMore = Date.now();
    window.scrollTo(0, document.documentElement.scrollHeight);
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────
  const buildPill = () => {
    pill = h(
      'button.gt-return-pill.gt-glass',
      { type: 'button', onclick: () => setClassic(false) },
      h('img', { src: chrome.runtime.getURL('icons/icon32.png'), alt: '' }),
      'GlassTube Home',
    );
    document.body.append(pill);
  };

  const build = () => {
    if (isClassic()) return buildPill();
    document.documentElement.classList.add('gt-home-active');

    layer = h(
      'div#gt-home.gt-layer.gt-home',
      h('div.gt-ambient', { 'aria-hidden': 'true' }),
      GT.ui.sidebar({
        current: 'home',
        extra: [
          { sep: true },
          { id: 'classic', label: 'Classic Home', icon: 'grid', action: () => setClassic(true) },
        ],
      }),
      h(
        'section.gt-hero',
        { 'aria-label': 'Top Shelf' },
        h('div.gt-hero-slides'),
        h('div.gt-hero-scrim'),
        h('div.gt-hero-dots'),
      ),
      h(
        'div.gt-rows-wrap',
        h(
          'div.gt-empty-note.gt-glass',
          { hidden: true },
          h('strong', 'Your home feed is empty.'),
          ' Sign in or turn on watch history for personal picks — meanwhile, here’s what’s popular.',
          h('button.gt-link', { type: 'button', onclick: () => GT.search.open() }, 'Search'),
        ),
        h('div.gt-rows'),
      ),
      h('div.gt-sentinel'),
      h('footer.gt-home-foot', `GlassTube ${GT.VERSION}`),
    );
    document.body.append(layer);

    const unsub = GT.store.subscribe('home', render);
    const releaseFocus = GT.ui.focusEngine(layer);
    GT.ui.enableTilt(layer);

    const hero = layer.querySelector('.gt-hero');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!layer) return;
        const y = layer.scrollTop;
        const k = Math.min(1, y / hero.offsetHeight);
        hero.style.setProperty('--gt-hero-shift', `${(y * 0.35).toFixed(1)}px`);
        hero.style.setProperty('--gt-hero-fade', (1 - k * 0.9).toFixed(3));
        layer.classList.toggle('gt-scrolled', y > 40);
      });
    };
    layer.addEventListener('scroll', onScroll, { passive: true });

    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && requestMore(), {
      root: layer,
      rootMargin: '900px 0px',
    });
    io.observe(layer.querySelector('.gt-sentinel'));

    const onKey = (e) => {
      if (e.key === '/' && !GT.isTyping(e) && !GT.search.isOpen()) {
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
    if (!GT.store.home.items.length) GT.store.replay();
    if (savedScroll.at === GT.store.home.at && savedScroll.top) layer.scrollTop = savedScroll.top;

    loadLazy('history', '/feed/history', { ttl: 0 });
    loadLazy('subs', '/feed/subscriptions');
    loadLazy('later', '/playlist?list=WL');
    const emptyCheck = setTimeout(() => {
      feedEmpty = !GT.store.home.items.length;
      if (GT.settings.exploreRows || feedEmpty) loadExplore(feedEmpty ? EXPLORE.length : 3);
      render();
    }, 2500);
    cleanup.push(() => clearTimeout(emptyCheck));
  };

  const teardown = () => {
    clearInterval(heroTimer);
    cleanup.forEach((fn) => fn?.());
    cleanup = [];
    if (layer) savedScroll = { at: GT.store.home.at, top: layer.scrollTop };
    layer?.remove();
    pill?.remove();
    layer = pill = null;
    heroIds = '';
    document.documentElement.classList.remove('gt-home-active');
  };

  GT.register({
    name: 'home',
    active: (s, route) => s.home && route === 'home',
    mount: build,
    unmount: teardown,
    update: () => {
      if (layer) restartHeroTimer();
    },
  });

  // Personal rows go stale when the user watches something; refresh them on return.
  GT.onNavigate((route) => {
    if (route !== 'home') lazy.history = null;
  });
})();
