/**
 * GlassTube watch page: a cinematic layout — the player fills the screen, and below it sit
 * the title and actions, a playlist shelf, an Up Next shelf, the description and a collapsible
 * glass comments panel. A floating glass pill gives quick access to Home and Search.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;
  const root = document.documentElement;

  let active = false;
  let weEnabledTheater = false;
  let nav = null;
  let shelf = null;
  let shortsShelf = null;
  let commentsToggle = null;
  let unsub = null;
  let keepAlive = 0;

  const flexy = () => document.querySelector('ytd-watch-flexy');
  const currentId = () => new URL(location.href).searchParams.get('v');

  const nudgeLayout = () => {
    // YouTube sizes the <video> on resize; let it re-measure after our layout change.
    [30, 250, 800].forEach((ms) => setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let theaterBusy = false;
  /** Switches YouTube to theater mode (full-bleed player) once the player is ready. */
  const ensureTheater = async () => {
    if (theaterBusy) return;
    theaterBusy = true;
    try {
      await GT.waitFor('ytd-watch-flexy #movie_player video', { timeout: 20000 });
      for (let attempt = 0; attempt < 4 && active; attempt++) {
        const f = flexy();
        const btn = document.querySelector('#movie_player .ytp-size-button');
        const v = document.querySelector('#movie_player video');
        if (!f || document.fullscreenElement || f.hasAttribute('theater')) break;
        // The size button ignores clicks until the player has initialised.
        if (btn && v && v.readyState > 0) {
          btn.click();
          weEnabledTheater = true;
        }
        await sleep(900);
      }
      nudgeLayout();
    } finally {
      theaterBusy = false;
    }
  };

  /** Only hand theater mode back when the feature is switched off on the watch page itself. */
  const restoreTheater = () => {
    if (GT.route() !== 'watch') return;
    const f = flexy();
    if (weEnabledTheater && f?.hasAttribute('theater')) {
      document.querySelector('#movie_player .ytp-size-button')?.click();
    }
    weEnabledTheater = false;
  };

  // ── Up Next / playlist shelves ──────────────────────────────────────────
  const renderShelves = () => {
    if (!shelf) return;
    const w = GT.store.watch;
    const fresh = w.videoId === currentId() || !w.videoId;
    const rows = [];
    if (fresh && w.playlist?.items?.length) {
      rows.push({
        key: 'playlist',
        title: w.playlist.title || 'Playlist',
        subtitle: `${w.playlist.items.length} videos`,
        items: w.playlist.items,
      });
    }
    const related = fresh ? w.related.filter((i) => i.id !== currentId()) : [];
    const shorts = related.filter((i) => i.kind === 'short');
    const videos = related.filter((i) => i.kind !== 'short');
    if (videos.length) rows.push({ key: 'upnext', title: 'Up Next', items: videos });
    // Tall Shorts cards get their own shelf after the comments so Up Next stays compact.
    const fill = (container, list) => {
      const existing = new Map([...container.children].map((c) => [c.dataset.key, c]));
      container.replaceChildren(
        ...list.map((r) => {
          const el = existing.get(r.key);
          if (!el) return GT.ui.row(r);
          GT.ui.setRowItems(el, r.items);
          return el;
        }),
      );
    };
    fill(shelf, rows);
    fill(shortsShelf, shorts.length ? [{ key: 'shorts', title: 'Shorts', items: shorts }] : []);
    const current = shelf.querySelector('.gt-card-current');
    current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  };

  /** Order below the title: Up Next → Comments (toggle + panel) → Shorts. */
  const placeShelf = () => {
    const meta = document.querySelector('ytd-watch-flexy #below ytd-watch-metadata');
    if (!meta) return false;
    if (shelf.previousElementSibling !== meta) meta.after(shelf);
    if (commentsToggle.previousElementSibling !== shelf) shelf.after(commentsToggle);
    const comments = document.querySelector('ytd-watch-flexy #comments');
    const tail = comments || commentsToggle;
    if (comments && comments.previousElementSibling !== commentsToggle)
      commentsToggle.after(comments);
    if (shortsShelf.previousElementSibling !== tail) tail.after(shortsShelf);
    return true;
  };

  const setComments = (open) => {
    root.classList.toggle('gt-comments-open', open);
    if (!commentsToggle) return;
    commentsToggle.setAttribute('aria-expanded', String(open));
    commentsToggle.lastChild.replaceWith(svg(open ? 'chevronDown' : 'chevronRight'));
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────
  const mount = async () => {
    active = true;
    root.classList.add('gt-watch-active');
    root.classList.remove('gt-comments-open');

    nav = h(
      'nav.gt-watch-nav.gt-glass',
      { 'aria-label': 'GlassTube' },
      GT.linkify(h('a.gt-wnav-btn', { href: '/', title: 'Home' }, svg('back'), h('span', 'Home'))),
      h(
        'button.gt-wnav-btn.gt-wnav-icon',
        {
          type: 'button',
          title: 'Search',
          'aria-label': 'Search',
          onclick: () => GT.search.open(),
        },
        svg('search'),
      ),
    );
    document.body.append(nav);

    shelf = h('section#gt-upnext.gt-surface', { 'aria-label': 'Up Next' });
    shortsShelf = h('section#gt-upnext-shorts.gt-surface', { 'aria-label': 'Shorts' });
    GT.ui.enableTilt(shelf);
    GT.ui.enableTilt(shortsShelf);
    commentsToggle = h(
      'button.gt-btn.gt-comments-toggle',
      {
        type: 'button',
        onclick: () => setComments(!root.classList.contains('gt-comments-open')),
        'aria-expanded': 'false',
      },
      svg('comments'),
      'Comments',
      svg('chevronRight'),
    );

    unsub = GT.store.subscribe('watch', renderShelves);
    const onScroll = () => root.classList.toggle('gt-watch-scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    keepAlive = setInterval(() => active && placeShelf(), 1000);
    const unscroll = () => window.removeEventListener('scroll', onScroll);
    mount.cleanup = [unscroll];

    await GT.waitFor('ytd-watch-flexy #below ytd-watch-metadata');
    if (!active) return;
    placeShelf();
    renderShelves();
    if (!GT.store.watch.related.length) GT.store.replay();
    ensureTheater();
    setTimeout(() => active && GT.store.syncRelated(), 4000);
  };

  const unmount = () => {
    active = false;
    clearInterval(keepAlive);
    unsub?.();
    (mount.cleanup || []).forEach((fn) => fn());
    nav?.remove();
    shelf?.remove();
    shortsShelf?.remove();
    commentsToggle?.remove();
    nav = shelf = shortsShelf = commentsToggle = null;
    restoreTheater();
    root.classList.remove('gt-watch-active', 'gt-comments-open', 'gt-watch-scrolled');
    nudgeLayout();
  };

  GT.register({
    name: 'watch',
    active: (s, route) => s.watch && route === 'watch',
    mount,
    unmount,
    update: () => {
      // New video inside the watch page: collapse comments and refresh the shelves.
      setComments(false);
      renderShelves();
      ensureTheater();
      setTimeout(() => active && GT.store.syncRelated(), 4000);
    },
  });
})();
