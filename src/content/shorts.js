/**
 * GlassTube Shorts: keeps YouTube's own Shorts player (swipe, scroll and gestures intact) but
 * stages it cinematically — an ambient glow from the current Short, glass action buttons,
 * no masthead or guide, and the GlassTube sidebar for navigation.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h } = GT;
  const root = document.documentElement;

  let stage = null;
  let lastId = '';

  const currentId = () => location.pathname.split('/')[2] || '';

  const refreshAmbient = () => {
    const id = currentId();
    if (!stage || !id || id === lastId) return;
    lastId = id;
    const ambient = stage.querySelector('.gt-ambient');
    const img = GT.ui.img([GT.data.thumbUrl(id, 'oar2'), GT.data.thumbUrl(id, 'hqdefault')], {
      minWidth: 1,
    });
    ambient.append(img);
    // Crossfade: drop older frames once the new one has faded in.
    img.addEventListener('load', () => {
      setTimeout(() => [...ambient.children].slice(0, -1).forEach((n) => n.remove()), 1200);
    });
  };

  const mount = () => {
    root.classList.add('gt-shorts-active');
    stage = h(
      'div#gt-shorts-stage',
      h('div.gt-ambient', { 'aria-hidden': 'true' }),
      GT.ui.sidebar({ current: 'shorts' }),
    );
    document.body.append(stage);
    lastId = '';
    refreshAmbient();
  };

  const unmount = () => {
    root.classList.remove('gt-shorts-active');
    stage?.remove();
    stage = null;
  };

  GT.register({
    name: 'shorts',
    active: (s, route) => s.shorts && route === 'shorts',
    mount,
    unmount,
    update: refreshAmbient,
  });
})();
