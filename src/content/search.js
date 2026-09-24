/**
 * GlassTube search: a full-screen, tvOS-style search surface. Results stream in as you type
 * (videos, channels and Shorts rows); Return opens YouTube's full results page.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;
  const RECENT_KEY = 'recentSearches';
  const MAX_RECENT = 12;

  let layer = null;
  let releaseFocus = null;
  let lastFocus = null;
  let controller = null;
  let debounce = 0;

  const getRecent = async () => {
    try {
      return (await chrome.storage.local.get({ [RECENT_KEY]: [] }))[RECENT_KEY];
    } catch {
      return [];
    }
  };
  const saveRecent = async (q) => {
    const list = (await getRecent()).filter((x) => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    try {
      await chrome.storage.local.set({ [RECENT_KEY]: list.slice(0, MAX_RECENT) });
    } catch {
      /* extension context may be gone after an update */
    }
  };

  const submit = (q) => {
    q = q.trim();
    if (!q) return;
    saveRecent(q);
    close();
    GT.navigate(`/results?search_query=${encodeURIComponent(q)}`);
  };

  const renderRecent = async () => {
    const box = layer?.querySelector('.gt-search-recent');
    if (!box) return;
    const list = await getRecent();
    box.hidden = !list.length;
    box.replaceChildren(
      h(
        'header.gt-row-head',
        h('h2.gt-row-title', 'Recent Searches'),
        h(
          'button.gt-link',
          {
            type: 'button',
            onclick: async () => {
              await chrome.storage.local.set({ [RECENT_KEY]: [] });
              renderRecent();
            },
          },
          'Clear',
        ),
      ),
      h(
        'div.gt-chips',
        list.map((q) =>
          h(
            'button.gt-chip.gt-focusable',
            {
              type: 'button',
              onclick: () => {
                const input = layer.querySelector('.gt-search-input');
                input.value = q;
                runQuery(q);
                input.focus();
              },
            },
            svg('history'),
            q,
          ),
        ),
      ),
    );
  };

  const runQuery = (q) => {
    clearTimeout(debounce);
    const results = layer.querySelector('.gt-search-results');
    const recent = layer.querySelector('.gt-search-recent');
    q = q.trim();
    if (q.length < 2) {
      results.replaceChildren();
      layer.classList.remove('gt-searching');
      recent.hidden = false;
      renderRecent();
      return;
    }
    debounce = setTimeout(async () => {
      controller?.abort();
      controller = new AbortController();
      layer.classList.add('gt-searching');
      try {
        const items = await GT.data.fetchItems(`/results?search_query=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          ttl: 60_000,
        });
        if (!layer) return;
        recent.hidden = true;
        const videos = items.filter((i) => i.kind === 'video' || i.kind === 'live');
        const channels = items.filter((i) => i.kind === 'channel');
        const shorts = items.filter((i) => i.kind === 'short');
        const playlists = items.filter((i) => i.kind === 'playlist');
        results.replaceChildren(
          ...[
            videos.length && GT.ui.row({ key: 'videos', title: 'Top Results', items: videos }),
            channels.length &&
              GT.ui.row({
                key: 'channels',
                title: 'Channels',
                items: channels,
                variant: 'channel',
              }),
            shorts.length &&
              GT.ui.row({ key: 'shorts', title: 'Shorts', items: shorts, variant: 'short' }),
            playlists.length &&
              GT.ui.row({ key: 'playlists', title: 'Playlists', items: playlists }),
          ].filter(Boolean),
        );
        if (!items.length) {
          results.replaceChildren(h('p.gt-empty', `No results for “${q}”.`));
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          results.replaceChildren(h('p.gt-empty', 'Search is unavailable right now.'));
        }
      } finally {
        layer?.classList.remove('gt-searching');
      }
    }, 380);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const open = (initial = '') => {
    if (layer) return layer.querySelector('.gt-search-input').focus();
    lastFocus = document.activeElement;
    const input = h('input.gt-search-input', {
      type: 'search',
      placeholder: 'Search YouTube',
      autocomplete: 'off',
      spellcheck: 'false',
      'aria-label': 'Search YouTube',
    });
    input.value = initial;
    input.addEventListener('input', () => runQuery(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit(input.value);
      else if (e.key === 'ArrowDown') {
        const first = layer.querySelector('.gt-search-body .gt-focusable');
        if (first) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    layer = h(
      'div#gt-search.gt-layer.gt-surface.gt-search',
      { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search' },
      h(
        'div.gt-search-bar',
        h(
          'label.gt-search-field',
          svg('search'),
          input,
          h('span.gt-spinner', { 'aria-hidden': 'true' }),
        ),
        h(
          'button.gt-btn.gt-btn-round.gt-focusable',
          { type: 'button', 'aria-label': 'Close search', onclick: () => close() },
          svg('close'),
        ),
      ),
      h(
        'div.gt-search-body',
        h('section.gt-search-recent'),
        h('div.gt-search-results'),
        h('p.gt-search-hint', 'Press Return to see all results on YouTube · Esc to close'),
      ),
    );
    layer.addEventListener('keydown', onKey);
    document.body.append(layer);
    GT.ui.enableTilt(layer);
    releaseFocus = GT.ui.focusEngine(layer);
    requestAnimationFrame(() => layer?.classList.add('gt-open'));
    input.focus();
    renderRecent();
    if (initial) runQuery(initial);
  };

  const close = () => {
    if (!layer) return;
    controller?.abort();
    clearTimeout(debounce);
    releaseFocus?.();
    const el = layer;
    layer = null;
    el.classList.remove('gt-open');
    setTimeout(() => el.remove(), 250);
    lastFocus?.focus?.({ preventScroll: true });
  };

  GT.search = { open, close, isOpen: () => !!layer };
})();
