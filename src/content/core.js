/**
 * GlassTube core: shared namespace, settings, routing, DOM helpers and the bridge to the
 * page's main world (see bridge.js). Every other content script builds on this file.
 */
(() => {
  const GT = (globalThis.GlassTube = globalThis.GlassTube || {});

  GT.VERSION = chrome.runtime.getManifest().version;

  // ── Settings ──────────────────────────────────────────────────────────────
  GT.DEFAULTS = Object.freeze({
    enabled: true,
    home: true,
    watch: true,
    controls: true,
    pip: true,
    heroRotate: true,
    tilt: true,
    exploreRows: true,
    pages: true,
    shorts: true,
    reduceTransparency: false,
    heroStyle: 'calm',
  });

  GT.settings = { ...GT.DEFAULTS };
  const settingsListeners = new Set();

  GT.loadSettings = async () => {
    try {
      const stored = await chrome.storage.sync.get(GT.DEFAULTS);
      GT.settings = { ...GT.DEFAULTS, ...stored };
    } catch {
      GT.settings = { ...GT.DEFAULTS };
    }
    return GT.settings;
  };

  GT.onSettingsChange = (fn) => settingsListeners.add(fn);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const prev = GT.settings;
    const next = { ...prev };
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in GT.DEFAULTS) next[key] = newValue ?? GT.DEFAULTS[key];
    }
    GT.settings = next;
    settingsListeners.forEach((fn) => fn(next, prev));
  });

  // ── Routing ───────────────────────────────────────────────────────────────
  GT.route = (loc = location) => {
    const path = loc.pathname;
    if (path === '/' || path === '') return 'home';
    if (path === '/watch') return 'watch';
    if (path.startsWith('/shorts/')) return 'shorts';
    if (path === '/results') return 'search';
    return 'other';
  };

  const navListeners = new Set();
  GT.onNavigate = (fn) => navListeners.add(fn);
  let lastHref = null;
  const emitNavigate = () => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    navListeners.forEach((fn) => fn(GT.route()));
  };
  // YouTube is a single-page app: it fires these on its own navigations.
  document.addEventListener('yt-navigate-finish', emitNavigate);
  document.addEventListener('yt-page-data-updated', emitNavigate);
  window.addEventListener('popstate', emitNavigate);
  // Belt and braces for navigations that skip the events above.
  setInterval(emitNavigate, 1000);
  GT.checkNavigation = emitNavigate;

  // ── DOM helpers ───────────────────────────────────────────────────────────
  /**
   * Tiny hyperscript: h('div.card#id', { onclick, dataset, style, ...attrs }, ...children)
   * Text children are always inserted as text nodes — never parsed as HTML.
   */
  GT.h = (spec, props, ...children) => {
    const [, tag = 'div', rest = ''] = spec.match(/^([a-z0-9-]*)(.*)$/i);
    const el = document.createElement(tag || 'div');
    for (const part of rest.match(/[.#][^.#]+/g) || []) {
      if (part[0] === '.') el.classList.add(part.slice(1));
      else el.id = part.slice(1);
    }
    if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
      children.unshift(props);
      props = null;
    }
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'style' && typeof value === 'object') {
        for (const [p, v] of Object.entries(value)) el.style.setProperty(p, v);
      } else if (key === 'className') el.className = value;
      else if (key === 'html') el.append(GT.svg(value));
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  };

  // ── Icons (SF Symbols-inspired, drawn from scratch) ─────────────────────
  const ICONS = {
    home: '<path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    search:
      '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    subs: '<rect x="3" y="7" width="18" height="13" rx="3"/><rect x="6" y="3.5" width="12" height="2" rx="1"/><path d="m10 10.5 5 3-5 3z" fill="#000" fill-opacity=".55"/>',
    shorts:
      '<rect x="6.5" y="2.5" width="11" height="19" rx="3.5"/><path d="m10.5 9 4 3-4 3z" fill="#000" fill-opacity=".55"/>',
    library:
      '<rect x="3" y="4" width="4" height="16" rx="1.2"/><rect x="9" y="4" width="4" height="16" rx="1.2"/><rect x="15.2" y="4.4" width="4" height="16" rx="1.2" transform="rotate(-12 17.2 12.4)"/>',
    history:
      '<path d="M12 3.5a8.5 8.5 0 1 1-8.2 10.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M3 6v5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    later:
      '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.5V12l3.2 2.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    play: '<path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6z"/>',
    pause:
      '<rect x="5.5" y="4" width="4.5" height="16" rx="1.4"/><rect x="14" y="4" width="4.5" height="16" rx="1.4"/>',
    back10:
      '<path d="M12 5a7.5 7.5 0 1 1-7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 1.8 8.3 5 12 8.2z"/><text x="12.2" y="15.8" font-size="7.4" font-weight="700" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif">10</text>',
    fwd10:
      '<path d="M12 5a7.5 7.5 0 1 0 7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 1.8 15.7 5 12 8.2z"/><text x="11.8" y="15.8" font-size="7.4" font-weight="700" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif">10</text>',
    volume:
      '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/><path d="m15.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    captions:
      '<rect x="2.5" y="5" width="19" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.2 10.4a2.3 2.3 0 1 0 0 3.2M16.7 10.4a2.3 2.3 0 1 0 0 3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    gear: '<path fill-rule="evenodd" d="M10.3 2.6h3.4l.5 2.6 1.6.9 2.5-.9 1.7 2.9-2 1.8v1.9l2 1.8-1.7 2.9-2.5-.9-1.6.9-.5 2.6h-3.4l-.5-2.6-1.6-.9-2.5.9-1.7-2.9 2-1.8v-1.9l-2-1.8 1.7-2.9 2.5.9 1.6-.9zM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>',
    pip: '<rect x="2.5" y="4.5" width="19" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11.5" y="11.5" width="7.5" height="5.5" rx="1.4"/>',
    pipExit:
      '<rect x="2.5" y="4.5" width="19" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8 9 5 5m0-4.5V14H8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    fullscreen:
      '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    speed:
      '<path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="m12 14 4.5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="14" r="1.8"/>',
    chevronLeft:
      '<path d="m14.5 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    chevronRight:
      '<path d="m9.5 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    person:
      '<circle cx="12" cy="8" r="4.2"/><path d="M4 20.2c.6-4 3.8-6.2 8-6.2s7.4 2.2 8 6.2a.8.8 0 0 1-.8.8H4.8a.8.8 0 0 1-.8-.8z"/>',
    comments:
      '<path d="M4.5 4h15A1.5 1.5 0 0 1 21 5.5v10a1.5 1.5 0 0 1-1.5 1.5H10l-4.6 3.6a.6.6 0 0 1-1-.5V17h.1A1.5 1.5 0 0 1 3 15.5v-10A1.5 1.5 0 0 1 4.5 4z"/>',
    close:
      '<path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    grid: '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/><rect x="13" y="13" width="7.5" height="7.5" rx="2"/>',
    live: '<circle cx="12" cy="12" r="3.2"/><path d="M7.2 7.2a6.8 6.8 0 0 0 0 9.6m9.6 0a6.8 6.8 0 0 0 0-9.6M4.4 4.4a10.8 10.8 0 0 0 0 15.2m15.2 0a10.8 10.8 0 0 0 0-15.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    next: '<path d="M4.5 5.2v13.6a.9.9 0 0 0 1.4.75l9.6-6.8a.9.9 0 0 0 0-1.5L5.9 4.45a.9.9 0 0 0-1.4.75z"/><rect x="17" y="4.5" width="3" height="15" rx="1.2"/>',
    back: '<path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    chevronDown:
      '<path d="m5 9.5 7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    playlist:
      '<rect x="3" y="5" width="12" height="2.2" rx="1.1"/><rect x="3" y="10" width="12" height="2.2" rx="1.1"/><rect x="3" y="15" width="8" height="2.2" rx="1.1"/><path d="M15 13.5v6.8a.7.7 0 0 0 1.05.6l5-3.4a.7.7 0 0 0 0-1.2l-5-3.4a.7.7 0 0 0-1.05.6z"/>',
    returnTab:
      '<rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8m-3.5-3.5L16 12l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  GT.ICONS = ICONS;

  /** Returns a fresh <svg> element for a named icon (parsed from our own static markup). */
  GT.svg = (name, cls = 'gt-icon') => {
    const tpl = document.createElement('template');
    // Icon markup is a static, trusted constant defined above.
    tpl.innerHTML = `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    return tpl.content.firstElementChild;
  };

  GT.waitFor = (selector, { timeout = 15000, root = document } = {}) =>
    new Promise((resolve) => {
      const found = root.querySelector(selector);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = root.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(root.documentElement || root, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(null);
      }, timeout);
    });

  GT.formatTime = (secs) => {
    if (!Number.isFinite(secs) || secs < 0) secs = 0;
    secs = Math.floor(secs);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = String(secs % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  };

  GT.isTyping = (e) => {
    const t = e.composedPath?.()[0] || e.target;
    return !!(
      t &&
      (t.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.closest?.('[contenteditable]'))
    );
  };

  // ── Main-world bridge ─────────────────────────────────────────────────────
  const BRIDGE_IN = 'glasstube:bridge';
  const BRIDGE_OUT = 'glasstube:content';
  const dataListeners = new Set();
  let requestSeq = 0;
  const pending = new Map();

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== BRIDGE_IN) return;
    const msg = e.data;
    if (msg.type === 'reply' && pending.has(msg.id)) {
      pending.get(msg.id)(msg.value);
      pending.delete(msg.id);
    } else if (msg.type === 'data') {
      dataListeners.forEach((fn) => fn(msg));
    }
  });

  const post = (payload) => window.postMessage({ source: BRIDGE_OUT, ...payload }, location.origin);

  /** Ask the main world to run a player command, resolving with its return value. */
  GT.bridge = (command, ...args) =>
    new Promise((resolve) => {
      const id = ++requestSeq;
      pending.set(id, resolve);
      post({ type: 'command', id, command, args });
      setTimeout(() => {
        if (pending.delete(id)) resolve(undefined);
      }, 2000);
    });

  /** Subscribe to page data (ytInitialData / innertube responses) captured by the bridge. */
  GT.onPageData = (fn) => dataListeners.add(fn);

  /** SPA-navigate like a native YouTube link; falls back to a full load. */
  GT.navigate = (url, meta = {}) => {
    post({ type: 'navigate', url: new URL(url, location.origin).href, meta });
  };

  /** Attach SPA navigation to a link while keeping middle-click / modifier-click behaviour. */
  GT.linkify = (anchor, meta) => {
    anchor.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      e.preventDefault();
      GT.navigate(anchor.href, typeof meta === 'function' ? meta() : meta);
    });
    return anchor;
  };

  GT.post = post;
})();
