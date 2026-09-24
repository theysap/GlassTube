/**
 * GlassTube boot: applies root classes and mounts / unmounts feature modules as the
 * route or the user's settings change. Modules register with GlassTube.register().
 */
(() => {
  const GT = globalThis.GlassTube;
  const root = document.documentElement;
  const mounted = new Set();

  const domReady = new Promise((resolve) => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });

  // GlassTube is a dark interface: switch YouTube's own components to their dark theme too,
  // and hand the page back untouched when GlassTube is turned off.
  let addedDark = false;
  const applyDark = (on) => {
    if (on && !root.hasAttribute('dark')) {
      root.setAttribute('dark', 'true');
      addedDark = true;
    } else if (!on && addedDark) {
      root.removeAttribute('dark');
      addedDark = false;
    }
  };
  new MutationObserver(() => applyDark(GT.settings.enabled)).observe(root, {
    attributes: true,
    attributeFilter: ['dark'],
  });

  const applyClasses = (s, route) => {
    applyDark(s.enabled);
    root.classList.toggle('gt-on', s.enabled);
    root.classList.toggle('gt-solid', s.enabled && s.reduceTransparency);
    for (const cls of [...root.classList]) {
      if (cls.startsWith('gt-route-')) root.classList.remove(cls);
    }
    root.classList.add(`gt-route-${route}`);
  };

  const sync = async () => {
    const s = GT.settings;
    const route = GT.route();
    applyClasses(s, route);
    await domReady;
    for (const mod of GT.modules) {
      const want = s.enabled && mod.active(s, route);
      try {
        if (want && !mounted.has(mod)) {
          mounted.add(mod);
          mod.mount(route);
        } else if (!want && mounted.has(mod)) {
          mounted.delete(mod);
          mod.unmount();
        } else if (want) {
          mod.update?.(route);
        }
      } catch (err) {
        console.warn(`[GlassTube] ${mod.name} failed`, err);
      }
    }
  };

  GT.sync = sync;

  (async () => {
    // Paint the base theme immediately on first load, then apply stored settings.
    applyClasses(GT.settings, GT.route());
    await GT.loadSettings();
    GT.onSettingsChange(sync);
    GT.onNavigate(sync);
    sync();
  })();
})();
