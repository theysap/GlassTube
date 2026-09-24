/**
 * GlassTube Picture in Picture: moves YouTube's <video> into a Document Picture-in-Picture
 * window dressed with tvOS-style glass controls (−10 s / play / +10 s, scrubber, mute and
 * "back to tab"). Falls back to the browser's standard video PiP where the API is missing.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;
  const IDLE_MS = 2200;

  let win = null;
  let video = null;
  let origin = null;
  let placeholder = null;
  let nativeButton = null;
  let cleanup = [];

  const findVideo = () =>
    document.querySelector('#movie_player video.html5-main-video') ||
    document.querySelector('#movie_player video');
  const supported = () => 'documentPictureInPicture' in window;

  const PIP_CSS = `
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #000; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Inter, system-ui, sans-serif;
      color: #fff; -webkit-font-smoothing: antialiased; user-select: none; }
    .stage { position: fixed; inset: 0; background: #000; }
    .stage video { position: absolute !important; inset: 0 !important; left: 0 !important; top: 0 !important;
      width: 100% !important; height: 100% !important; object-fit: contain; }
    .ui { position: fixed; inset: 0; opacity: 0; transition: opacity .35s cubic-bezier(.2,.8,.2,1); }
    body.show .ui, body.paused .ui { opacity: 1; }
    body.idle { cursor: none; }
    .scrim { position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.1) 30%, rgba(0,0,0,.1) 60%, rgba(0,0,0,.7)); }
    .top { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; }
    .center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 22px; pointer-events: none; }
    .center > * { pointer-events: auto; }
    .bottom { position: absolute; left: 14px; right: 14px; bottom: 10px; }
    .title { font-size: 13px; font-weight: 600; margin-bottom: 8px; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; text-shadow: 0 1px 8px rgba(0,0,0,.6); }
    .title small { display: block; font-size: 11px; font-weight: 600; color: rgba(235,235,245,.7); }
    .btn { all: unset; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      font-size: 20px; cursor: pointer; background: rgba(60,60,70,.45);
      backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255,255,255,.14); box-shadow: inset 0 1px 0 rgba(255,255,255,.18);
      transition: transform .3s cubic-bezier(.34,1.4,.64,1), background .2s, color .2s; }
    .btn:hover, .btn:focus-visible { background: rgba(255,255,255,.92); color: #000; transform: scale(1.08); outline: none; }
    .btn.big { width: 60px; height: 60px; font-size: 28px; }
    .btn svg { width: 1em; height: 1em; display: block; }
    .scrub { position: relative; height: 16px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
    .track { position: relative; width: 100%; height: 5px; border-radius: 99px; overflow: hidden;
      background: rgba(255,255,255,.25); transition: height .2s; }
    .scrub:hover .track, .scrub.drag .track { height: 8px; }
    .track i { position: absolute; inset: 0; transform-origin: left; }
    .buf { background: rgba(255,255,255,.25); transform: scaleX(var(--buf, 0)); }
    .played { background: #fff; transform: scaleX(var(--played, 0)); }
    .times { display: flex; justify-content: space-between; margin-top: 2px; font-size: 11px; font-weight: 600;
      font-variant-numeric: tabular-nums; color: rgba(235,235,245,.75); }
    .live .scrub, .live .remaining { visibility: hidden; }
    .glyph { position: absolute; top: 50%; left: 50%; width: 72px; height: 72px; margin: -36px 0 0 -36px;
      display: grid; place-items: center; border-radius: 50%; font-size: 30px; pointer-events: none; opacity: 0;
      background: rgba(40,40,48,.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    .glyph svg { width: 1em; height: 1em; }
    .glyph.flash { animation: glyph .7s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes glyph { 0% { opacity: 0; transform: scale(.7) } 25% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1.15) } }
    @media (max-height: 200px) { .center { gap: 12px } .btn.big { width: 46px; height: 46px; font-size: 22px } .title { display: none } }
  `;

  const titleInfo = () => {
    const md = navigator.mediaSession?.metadata;
    return {
      title:
        md?.title ||
        document.querySelector('ytd-watch-metadata #title h1')?.textContent?.trim() ||
        'YouTube',
      channel:
        md?.artist ||
        document
          .querySelector('ytd-watch-metadata #owner ytd-channel-name a')
          ?.textContent?.trim() ||
        '',
    };
  };

  const buildWindow = (w, v) => {
    const d = w.document;
    const style = d.createElement('style');
    style.textContent = PIP_CSS;
    d.head.append(style);

    const icon = (name) => d.adoptNode(svg(name, ''));
    const btn = (name, label, onclick, cls = '') => {
      const b = d.createElement('button');
      b.className = `btn ${cls}`.trim();
      b.type = 'button';
      b.title = label;
      b.setAttribute('aria-label', label);
      b.append(icon(name));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onclick();
      });
      return b;
    };
    const el = (tag, cls, ...kids) => {
      const n = d.createElement(tag);
      if (cls) n.className = cls;
      n.append(...kids);
      return n;
    };

    const stage = el('div', 'stage');
    stage.append(v);

    const playBtn = btn(
      'pause',
      'Pause',
      () => (v.paused ? v.play().catch(() => {}) : v.pause()),
      'big',
    );
    const muteBtn = btn('volume', 'Mute', () => {
      GT.bridge(v.muted ? 'unMute' : 'mute');
    });
    const backBtn = btn('returnTab', 'Back to tab', () => w.close());
    const title = el('div', 'title');
    const played = el('i', 'played');
    const buf = el('i', 'buf');
    const track = el('div', 'track', buf, played);
    const scrub = el('div', 'scrub', track);
    const elapsed = el('span', 'elapsed');
    const remaining = el('span', 'remaining');
    const glyph = el('div', 'glyph');
    const ui = el(
      'div',
      'ui',
      el('div', 'scrim'),
      el('div', 'top', backBtn, muteBtn),
      el(
        'div',
        'center',
        btn('back10', 'Back 10 seconds', () => skip(-10)),
        playBtn,
        btn('fwd10', 'Forward 10 seconds', () => skip(10)),
      ),
      el('div', 'bottom', title, scrub, el('div', 'times', elapsed, remaining)),
    );
    d.body.append(stage, ui, glyph);

    let lastInput = 0;
    const flash = (name) => {
      if (Date.now() - lastInput > 900) return;
      glyph.replaceChildren(icon(name));
      glyph.classList.remove('flash');
      void glyph.offsetWidth;
      glyph.classList.add('flash');
    };
    const skip = (delta) => {
      lastInput = Date.now();
      GT.bridge('seekTo', Math.max(0, v.currentTime + delta));
      flash(delta < 0 ? 'back10' : 'fwd10');
    };

    let idle = 0;
    const show = () => {
      d.body.classList.add('show');
      d.body.classList.remove('idle');
      clearTimeout(idle);
      idle = setTimeout(() => {
        if (dragging) return;
        d.body.classList.remove('show');
        d.body.classList.add('idle');
      }, IDLE_MS);
    };

    const refresh = () => {
      const dur = v.duration;
      const live = !Number.isFinite(dur);
      ui.classList.toggle('live', live);
      if (!dragging && dur > 0 && !live) ui.style.setProperty('--played', v.currentTime / dur);
      if (v.buffered.length && dur > 0 && !live) {
        ui.style.setProperty('--buf', v.buffered.end(v.buffered.length - 1) / dur);
      }
      elapsed.textContent = live ? 'LIVE' : GT.formatTime(v.currentTime);
      remaining.textContent = live ? '' : `−${GT.formatTime(dur - v.currentTime)}`;
      playBtn.replaceChildren(icon(v.paused ? 'play' : 'pause'));
      playBtn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      d.body.classList.toggle('paused', v.paused);
      muteBtn.replaceChildren(icon(v.muted ? 'mute' : 'volume'));
      const info = titleInfo();
      if (d.title !== info.title) {
        d.title = info.title;
        title.replaceChildren(el('small', null, info.channel), info.title);
      }
    };

    let dragging = false;
    const timeAt = (x) => {
      const r = track.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (x - r.left) / r.width));
      return { k, t: k * (v.duration || 0) };
    };
    scrub.addEventListener('pointerdown', (e) => {
      dragging = true;
      scrub.setPointerCapture(e.pointerId);
      scrub.classList.add('drag');
      ui.style.setProperty('--played', timeAt(e.clientX).k);
    });
    scrub.addEventListener('pointermove', (e) => {
      if (dragging) ui.style.setProperty('--played', timeAt(e.clientX).k);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      scrub.classList.remove('drag');
      GT.bridge('seekTo', timeAt(e.clientX).t);
      show();
    };
    scrub.addEventListener('pointerup', endDrag);
    scrub.addEventListener('pointercancel', endDrag);

    d.addEventListener('pointermove', show);
    d.addEventListener('keydown', (e) => {
      lastInput = Date.now();
      show();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        v.paused ? v.play().catch(() => {}) : v.pause();
      } else if (e.key === 'ArrowLeft' || e.key === 'j') skip(-10);
      else if (e.key === 'ArrowRight' || e.key === 'l') skip(10);
      else if (e.key === 'm') GT.bridge(v.muted ? 'unMute' : 'mute');
      else if (e.key === 'Escape') w.close();
    });
    stage.addEventListener('click', () => {
      lastInput = Date.now();
      v.paused ? v.play().catch(() => {}) : v.pause();
    });
    stage.addEventListener('dblclick', () => w.close());

    const events = {
      timeupdate: refresh,
      progress: refresh,
      durationchange: refresh,
      volumechange: refresh,
      loadedmetadata: refresh,
      play: () => {
        refresh();
        flash('play');
      },
      pause: () => {
        refresh();
        flash('pause');
      },
    };
    Object.entries(events).forEach(([ev, fn]) => v.addEventListener(ev, fn));
    const metaTimer = setInterval(refresh, 1000);
    cleanup.push(() => {
      Object.entries(events).forEach(([ev, fn]) => v.removeEventListener(ev, fn));
      clearInterval(metaTimer);
      clearTimeout(idle);
    });
    refresh();
    show();
  };

  const showPlaceholder = () => {
    const player = document.getElementById('movie_player');
    if (!player) return;
    placeholder = h(
      'div.gt-pip-placeholder',
      h(
        'div.gt-pip-card.gt-glass',
        svg('pip'),
        h('strong', 'Playing in Picture in Picture'),
        h(
          'button.gt-btn',
          { type: 'button', onclick: () => close() },
          svg('pipExit'),
          'Bring Back',
        ),
      ),
    );
    player.append(placeholder);
  };

  const restore = () => {
    cleanup.forEach((fn) => fn());
    cleanup = [];
    if (video && origin) {
      const { parent, next } = origin;
      if (parent?.isConnected) {
        if (next && next.parentNode === parent) parent.insertBefore(video, next);
        else parent.append(video);
      } else {
        document.querySelector('#movie_player .html5-video-container')?.append(video);
      }
    }
    placeholder?.remove();
    placeholder = null;
    win = null;
    video = null;
    origin = null;
    document.documentElement.classList.remove('gt-pip-open');
    GT.controls?.refresh();
    [30, 300].forEach((ms) => setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
  };

  const open = async () => {
    if (win) return win.focus();
    const v = findVideo();
    if (!v) return;
    if (!supported()) {
      // Standard video PiP: unstyled, but better than nothing.
      if (document.pictureInPictureElement) return document.exitPictureInPicture();
      return v.requestPictureInPicture?.().catch(() => {});
    }
    const ratio = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9;
    const width = 560;
    let w;
    try {
      w = await documentPictureInPicture.requestWindow({
        width,
        height: Math.round(width / ratio),
      });
    } catch (err) {
      console.warn('[GlassTube] Picture in Picture was blocked', err);
      return;
    }
    win = w;
    video = v;
    origin = { parent: v.parentNode, next: v.nextSibling };
    const wasPlaying = !v.paused;
    buildWindow(w, v);
    if (wasPlaying && v.paused) v.play().catch(() => {});
    showPlaceholder();
    document.documentElement.classList.add('gt-pip-open');
    GT.controls?.refresh();
    w.addEventListener('pagehide', restore, { once: true });
  };

  const close = () => win?.close();
  const toggle = () => (win ? close() : open());

  // YouTube's own control bar gets a GlassTube PiP button when our controls are switched off.
  const injectNativeButton = async () => {
    const controls = await GT.waitFor('#movie_player .ytp-right-controls');
    if (!controls || nativeButton?.isConnected) return;
    nativeButton = h(
      'button.ytp-button.gt-ytp-pip',
      {
        type: 'button',
        title: 'Picture in Picture (GlassTube)',
        'aria-label': 'Picture in Picture',
      },
      svg('pip'),
    );
    nativeButton.addEventListener('click', toggle);
    controls.prepend(nativeButton);
  };

  const onKey = (e) => {
    if (e.altKey && (e.code === 'KeyP' || e.key === 'p') && !GT.isTyping(e)) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }
  };

  GT.register({
    name: 'pip',
    active: (s, route) => s.pip && route === 'watch',
    mount: () => {
      document.addEventListener('keydown', onKey, true);
      if (!document.documentElement.classList.contains('gt-controls-on')) injectNativeButton();
    },
    update: () => {
      const ours = document.documentElement.classList.contains('gt-controls-on');
      if (ours) nativeButton?.remove();
      else injectNativeButton();
    },
    unmount: () => {
      document.removeEventListener('keydown', onKey, true);
      nativeButton?.remove();
      nativeButton = null;
    },
  });

  GT.pip = { open, close, toggle, isOpen: () => !!win, video: () => video, supported };
})();
