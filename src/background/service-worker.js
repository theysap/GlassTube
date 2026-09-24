/**
 * GlassTube service worker: seeds default settings and mirrors the on/off state on the
 * toolbar badge. It holds no state of its own and makes no network requests.
 */
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
  heroStyle: 'calm',
};

const updateBadge = async (enabled) => {
  await chrome.action.setBadgeBackgroundColor({ color: '#3a3a44' });
  await chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(null);
  const missing = Object.fromEntries(Object.entries(DEFAULTS).filter(([key]) => !(key in stored)));
  if (Object.keys(missing).length) await chrome.storage.sync.set(missing);
  updateBadge(stored.enabled ?? DEFAULTS.enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const { enabled } = await chrome.storage.sync.get({ enabled: true });
  updateBadge(enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && 'enabled' in changes) updateBadge(changes.enabled.newValue !== false);
});
