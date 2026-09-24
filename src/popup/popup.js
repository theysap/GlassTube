/** GlassTube popup — a tvOS Settings-style panel over chrome.storage.sync. */
const DEFAULTS = {
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
};

const GROUPS = [
  {
    title: 'Experience',
    options: [
      { key: 'home', label: 'Top Shelf Home', hint: 'Hero, shelves and remote-style navigation' },
      { key: 'watch', label: 'Cinematic Watch Page', hint: 'Full-screen player, Up Next shelf' },
      {
        key: 'controls',
        label: 'tvOS Player Controls',
        hint: 'Glass controls with scrub previews',
        requires: 'watch',
      },
      {
        key: 'pages',
        label: 'tvOS Browse Pages',
        hint: 'Channels, playlists, library, search',
      },
      { key: 'shorts', label: 'Cinematic Shorts', hint: 'Ambient glow and glass actions' },
      { key: 'pip', label: 'Picture in Picture', hint: 'Floating player with glass controls' },
    ],
  },
  {
    title: 'Home',
    options: [
      {
        key: 'heroRotate',
        label: 'Auto-rotate Top Shelf',
        hint: 'Cycle featured videos',
        requires: 'home',
      },
      {
        key: 'exploreRows',
        label: 'Explore Rows',
        hint: 'Music, Gaming and News shelves',
        requires: 'home',
      },
      { key: 'tilt', label: 'Parallax Tilt', hint: 'Cards tilt and glint under the cursor' },
    ],
  },
  {
    title: 'Display',
    options: [
      {
        key: 'reduceTransparency',
        label: 'Reduce Transparency',
        hint: 'Solid surfaces instead of Liquid Glass',
      },
    ],
  },
];

const SHORTCUTS = [
  ['← ↑ → ↓', 'Move around Home'],
  ['/', 'Search'],
  ['Alt P', 'Picture in Picture'],
  ['K · J · L', 'Play · −10 s · +10 s'],
];

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const render = (settings) => {
  const groups = document.getElementById('groups');
  groups.replaceChildren(
    ...GROUPS.map((group) =>
      el(
        'section',
        { className: 'group' },
        el('h2', {}, group.title),
        el(
          'div',
          { className: 'card glass' },
          ...group.options.map((opt) => {
            const input = el('input', { type: 'checkbox', className: 'switch' });
            input.dataset.key = opt.key;
            input.checked = !!settings[opt.key];
            const row = el(
              'label',
              { className: 'row' },
              el(
                'span',
                { className: 'row-text' },
                el('strong', {}, opt.label),
                el('small', {}, opt.hint),
              ),
              input,
            );
            if (opt.requires) row.dataset.requires = opt.requires;
            return row;
          }),
        ),
      ),
    ),
    el(
      'section',
      { className: 'group' },
      el('h2', {}, 'Shortcuts'),
      el(
        'div',
        { className: 'card glass keys' },
        ...SHORTCUTS.map(([keys, what]) =>
          el('div', { className: 'key-row' }, el('kbd', {}, keys), el('span', {}, what)),
        ),
      ),
    ),
  );
  reflectDependencies(settings);
};

const reflectDependencies = (settings) => {
  for (const row of document.querySelectorAll('[data-requires]')) {
    row.classList.toggle('is-disabled', !settings[row.dataset.requires]);
  }
};

const reflectMaster = (enabled) => {
  document.body.classList.toggle('is-off', !enabled);
  document.getElementById('master-hint').textContent = enabled
    ? 'The tvOS look is on for YouTube'
    : 'Paused — YouTube looks like YouTube';
};

(async () => {
  document.getElementById('version').textContent =
    `Version ${chrome.runtime.getManifest().version}`;
  const settings = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  render(settings);
  const master = document.querySelector('.master .switch');
  master.checked = settings.enabled;
  reflectMaster(settings.enabled);

  document.addEventListener('change', (e) => {
    const key = e.target?.dataset?.key;
    if (!key) return;
    settings[key] = e.target.checked;
    chrome.storage.sync.set({ [key]: e.target.checked });
    if (key === 'enabled') reflectMaster(e.target.checked);
    reflectDependencies(settings);
  });
})();
