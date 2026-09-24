/**
 * GlassTube UI kit: tvOS-style cards, shelves (rows), the floating sidebar, the parallax
 * "focus" tilt and a remote-style spatial focus engine for arrow-key navigation.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;

  // ── Images ───────────────────────────────────────────────────────────────
  /** <img> that walks a list of candidate URLs until one loads with real content. */
  const img = (sources, { cls = '', eager = false, minWidth = 121 } = {}) => {
    const list = sources.filter(Boolean);
    const el = h('img', {
      class: cls,
      alt: '',
      decoding: 'async',
      loading: eager ? 'eager' : 'lazy',
      referrerpolicy: 'no-referrer',
    });
    let i = 0;
    const next = () => {
      if (i < list.length) el.src = list[i++];
      else el.classList.add('gt-img-missing');
    };
    el.addEventListener('error', next);
    // YouTube answers a missing maxres thumbnail with a 120×90 grey placeholder.
    el.addEventListener('load', () => {
      if (el.naturalWidth && el.naturalWidth < minWidth && i < list.length) next();
      else el.classList.add('gt-img-ready');
    });
    next();
    return el;
  };

  const thumbSources = (item, hero = false) => {
    if (item.kind === 'channel') return [item.avatar];
    const t = GT.data.thumbUrl;
    if (item.kind === 'short') return [item.thumb, t(item.id, 'oar2'), t(item.id, 'hqdefault')];
    return hero
      ? [t(item.id, 'maxresdefault'), item.thumb, t(item.id, 'hqdefault')]
      : [item.thumb, t(item.id, 'hqdefault')];
  };

  const metaLine = (item) =>
    [item.kind === 'short' ? null : item.channel, item.views, item.age].filter(Boolean).join(' · ');

  // ── Cards ───────────────────────────────────────────────────────────────
  const card = (item, { variant = item.kind === 'short' ? 'short' : 'standard' } = {}) => {
    const art = h(
      'div.gt-card-art',
      img(thumbSources(item)),
      item.kind === 'live' && h('span.gt-badge.gt-badge-live', 'LIVE'),
      item.duration && h('span.gt-badge', item.duration),
      item.progress > 0 &&
        h('div.gt-progress', h('i', { style: { width: `${Math.min(100, item.progress)}%` } })),
      h('div.gt-glare'),
    );
    const el = h(
      'a.gt-card.gt-focusable',
      {
        href: new URL(item.url || `/watch?v=${item.id}`, location.origin).href,
        dataset: { id: item.id, variant },
        title: item.title,
      },
      art,
      h(
        'div.gt-card-info',
        h('div.gt-card-title', item.title),
        h('div.gt-card-sub', variant === 'channel' ? item.views || '' : metaLine(item)),
      ),
    );
    el.classList.add(`gt-card-${variant}`);
    if (item.selected) el.classList.add('gt-card-current');
    return GT.linkify(el, item.channelId ? { channelId: item.channelId } : undefined);
  };

  // ── Rows ────────────────────────────────────────────────────────────────
  const scrollTrack = (track, dir) => {
    track.scrollBy({ left: dir * track.clientWidth * 0.82, behavior: 'smooth' });
  };

  const updateArrows = (row) => {
    const track = row.querySelector('.gt-row-track');
    const max = track.scrollWidth - track.clientWidth - 4;
    row.classList.toggle('gt-can-prev', track.scrollLeft > 4);
    row.classList.toggle('gt-can-next', track.scrollLeft < max);
  };

  /** A titled, horizontally scrolling shelf. */
  const row = ({ key, title, items, variant, href, subtitle }) => {
    const track = h('div.gt-row-track', { role: 'list' });
    const el = h(
      'section.gt-row',
      { dataset: { key, variant: variant || 'standard' } },
      h(
        'header.gt-row-head',
        href
          ? GT.linkify(
              h(
                'a.gt-row-title.gt-focusable',
                { href },
                title,
                svg('chevronRight', 'gt-icon gt-chev'),
              ),
            )
          : h('h2.gt-row-title', title),
        subtitle && h('span.gt-row-subtitle', subtitle),
      ),
      h(
        'div.gt-row-viewport',
        h(
          'button.gt-row-nav.gt-prev',
          {
            type: 'button',
            'aria-label': 'Scroll left',
            tabindex: '-1',
            onclick: () => scrollTrack(track, -1),
          },
          svg('chevronLeft'),
        ),
        track,
        h(
          'button.gt-row-nav.gt-next',
          {
            type: 'button',
            'aria-label': 'Scroll right',
            tabindex: '-1',
            onclick: () => scrollTrack(track, 1),
          },
          svg('chevronRight'),
        ),
      ),
    );
    track.addEventListener('scroll', () => updateArrows(el), { passive: true });
    setRowItems(el, items, variant);
    return el;
  };

  /** Updates a row in place: appends when the new list extends the old one, else rebuilds. */
  const setRowItems = (rowEl, items, variant) => {
    const track = rowEl.querySelector('.gt-row-track');
    const current = [...track.children].map((c) => c.dataset.id);
    const next = items.map((i) => i.id);
    const isPrefix = current.length && current.every((id, i) => next[i] === id);
    if (isPrefix && current.length === next.length) return;
    const opts = variant === 'channel' ? { variant } : undefined;
    if (isPrefix) {
      items.slice(current.length).forEach((i) => track.append(card(i, opts)));
    } else {
      track.replaceChildren(...items.map((i) => card(i, opts)));
    }
    requestAnimationFrame(() => updateArrows(rowEl));
  };

  // ── Sidebar ─────────────────────────────────────────────────────────────
  const NAV = [
    { id: 'search', label: 'Search', icon: 'search', action: () => GT.search?.open() },
    { id: 'home', label: 'Home', icon: 'home', href: '/' },
    { id: 'subs', label: 'Subscriptions', icon: 'subs', href: '/feed/subscriptions' },
    { id: 'shorts', label: 'Shorts', icon: 'shorts', href: '/shorts' },
    { sep: true },
    { id: 'you', label: 'You', icon: 'person', href: '/feed/you' },
    { id: 'history', label: 'History', icon: 'history', href: '/feed/history' },
    { id: 'later', label: 'Watch Later', icon: 'later', href: '/playlist?list=WL' },
  ];

  const sidebar = ({ current = 'home', extra = [] } = {}) =>
    h(
      'nav.gt-sidebar',
      { 'aria-label': 'GlassTube' },
      [...NAV, ...extra].map((item) => {
        if (item.sep) return h('div.gt-sidebar-sep');
        const content = [svg(item.icon), h('span', item.label)];
        const attrs = { 'aria-current': item.id === current ? 'page' : null, title: item.label };
        if (item.href) {
          return GT.linkify(
            h('a.gt-side-item.gt-focusable', { href: item.href, ...attrs }, content),
          );
        }
        return h(
          'button.gt-side-item.gt-focusable',
          { type: 'button', onclick: item.action, ...attrs },
          content,
        );
      }),
    );

  // ── Parallax focus tilt ─────────────────────────────────────────────────
  const enableTilt = (root) => {
    let active = null;
    const reset = (el) => {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
      el.style.removeProperty('--gx');
      el.style.removeProperty('--gy');
    };
    const onMove = (e) => {
      if (!GT.settings.tilt) return;
      const el = e.target.closest?.('.gt-card');
      if (active && active !== el) reset(active);
      active = el;
      if (!el) return;
      const r = el.querySelector('.gt-card-art').getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', () => active && reset(active));
  };

  // ── Spatial focus engine (arrow keys behave like a Siri Remote) ─────────
  const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

  const groupOf = (el) => (el.closest('.gt-sidebar') ? 'side' : 'main');

  const findNext = (root, from, dir, lastMain) => {
    const fromGroup = groupOf(from);
    // The sidebar widens while focused, so geometry would skip the hero: jump back instead.
    if (fromGroup === 'side' && dir === 'right') {
      return lastMain?.isConnected ? lastMain : root.querySelector('.gt-hero .gt-focusable');
    }
    const a = from.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const el of root.querySelectorAll('.gt-focusable')) {
      if (el === from || !el.offsetParent) continue;
      if ((dir === 'up' || dir === 'down') && groupOf(el) !== fromGroup) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      let primary;
      let secondary;
      if (dir === 'right') {
        if (b.left < a.right - a.width * 0.5) continue;
        primary = bx - ax;
        secondary = Math.abs(by - ay) * 4;
      } else if (dir === 'left') {
        if (b.right > a.left + a.width * 0.5) continue;
        primary = ax - bx;
        secondary = Math.abs(by - ay) * 4;
      } else if (dir === 'down') {
        if (b.top < a.bottom - 8) continue;
        primary = by - ay;
        secondary = Math.abs(bx - ax) * 0.8;
      } else {
        if (b.bottom > a.top + 8) continue;
        primary = ay - by;
        secondary = Math.abs(bx - ax) * 0.8;
      }
      const score = primary + secondary;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  };

  // Only the most recently opened surface (home, search…) answers the arrow keys.
  const engines = [];

  const focusEngine = (root, { onFocus } = {}) => {
    let lastMain = null;
    const onKey = (e) => {
      if (engines[engines.length - 1] !== onKey) return;
      const dir = DIRS[e.key];
      if (!dir || GT.isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const current = root.contains(document.activeElement) ? document.activeElement : null;
      const target = current
        ? findNext(root, current, dir, lastMain)
        : root.querySelector('.gt-hero .gt-focusable') || root.querySelector('.gt-focusable');
      e.preventDefault();
      e.stopPropagation();
      root.classList.add('gt-kbd');
      if (!target) return;
      target.focus({ preventScroll: true });
      if (groupOf(target) === 'main') {
        lastMain = target;
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
      onFocus?.(target);
    };
    const onPointer = () => root.classList.remove('gt-kbd');
    engines.push(onKey);
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      engines.splice(engines.indexOf(onKey), 1);
      document.removeEventListener('keydown', onKey, true);
    };
  };

  GT.ui = { img, thumbSources, metaLine, card, row, setRowItems, sidebar, enableTilt, focusEngine };
})();
