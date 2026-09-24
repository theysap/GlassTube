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
  reduceTransparency: false,
};

const GROUPS = [
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
            return el(
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
          }),
        ),
      ),
    ),
  );
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
    chrome.storage.sync.set({ [key]: e.target.checked });
    if (key === 'enabled') reflectMaster(e.target.checked);
  });
})();
