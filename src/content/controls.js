/**
 * GlassTube player controls: a tvOS-style glass control layer drawn over YouTube's player —
 * title, thick scrubber with storyboard previews, elapsed / remaining time and capsule buttons.
 * YouTube's own controls stay in the DOM (hidden) so captions, settings and ads keep working.
 */
(() => {
  const GT = globalThis.GlassTube;
  const { h, svg } = GT;
  const IDLE_MS = 2800;
  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  let ui = null;
  let cleanup = [];

  const player = () => document.getElementById('movie_player');
  const currentVideo = () =>
    GT.pip?.video?.() ||
    player()?.querySelector('video.html5-main-video') ||
    player()?.querySelector('video');
  const native = (sel) => player()?.querySelector(sel);
  const isShown = (el) => !!el && getComputedStyle(el).display !== 'none';

  const button = (icon, label, onclick, cls = '') =>
    h(
      `button.gt-cbtn${cls}`,
      { type: 'button', title: label, 'aria-label': label, onclick },
      svg(icon),
    );

  // ── State helpers ───────────────────────────────────────────────────────
  const setIcon = (btn, icon) => btn.replaceChildren(svg(icon));

  const flash = (icon) => {
    if (!ui || Date.now() - ui.lastInput > 900) return;
    const glyph = ui.glyph;
    glyph.replaceChildren(svg(icon));
    glyph.classList.remove('gt-flash');
    void glyph.offsetWidth;
    glyph.classList.add('gt-flash');
  };

  const show = (sticky = false) => {
    if (!ui) return;
    ui.player.classList.add('gt-ctl-visible');
    document.documentElement.classList.remove('gt-idle');
    clearTimeout(ui.idleTimer);
    if (sticky) return;
    ui.idleTimer = setTimeout(() => {
      const v = currentVideo();
      if (!ui || !v || v.paused || ui.dragging || ui.root.matches(':hover') || ui.menuOpen) return;
      ui.player.classList.remove('gt-ctl-visible');
      document.documentElement.classList.add('gt-idle');
    }, IDLE_MS);
  };

  const togglePlay = () => {
    const v = currentVideo();
    if (!v) return;
    ui.lastInput = Date.now();
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const skip = (delta) => {
    const v = currentVideo();
    if (!v) return;
    ui.lastInput = Date.now();
    const t = Math.max(0, Math.min((v.duration || Infinity) - 0.5, v.currentTime + delta));
    GT.bridge('seekTo', t);
    flash(delta < 0 ? 'back10' : 'fwd10');
  };

  // ── Scrubber ────────────────────────────────────────────────────────────
  const scrubTime = (clientX) => {
    const r = ui.track.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return { k, t: k * (currentVideo()?.duration || 0) };
  };

  const showPreview = (clientX) => {
    const { k, t } = scrubTime(clientX);
    const v = currentVideo();
    ui.scrub.style.setProperty('--gt-hover', k);
    ui.previewTime.textContent = GT.formatTime(t);
    const frame = GT.data.storyboardFrame(ui.board, t, v?.duration || 0, 320);
    const img = ui.previewImg;
    if (frame) {
      const scale = 256 / frame.width;
      img.hidden = false;
      img.style.width = `${frame.width * scale}px`;
      img.style.height = `${frame.height * scale}px`;
      img.style.backgroundImage = `url("${frame.url}")`;
      img.style.backgroundSize = `${frame.sheetWidth * scale}px ${frame.sheetHeight * scale}px`;
      img.style.backgroundPosition = `${-frame.x * scale}px ${-frame.y * scale}px`;
    } else {
      img.hidden = true;
    }
    const r = ui.track.getBoundingClientRect();
    const half = (frame ? 128 : 30) + 8;
    const x = Math.max(half, Math.min(r.width - half, k * r.width));
    ui.preview.style.transform = `translateX(${x}px) translateX(-50%)`;
  };

  const bindScrubber = () => {
    const { scrub } = ui;
    scrub.addEventListener('pointerenter', () => scrub.classList.add('gt-hovering'));
    scrub.addEventListener(
      'pointerleave',
      () => !ui.dragging && scrub.classList.remove('gt-hovering'),
    );
    scrub.addEventListener('pointermove', (e) => {
      showPreview(e.clientX);
      if (ui.dragging) paint(scrubTime(e.clientX).k);
    });
    scrub.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      scrub.setPointerCapture(e.pointerId);
      ui.dragging = true;
      scrub.classList.add('gt-dragging', 'gt-hovering');
      paint(scrubTime(e.clientX).k);
      showPreview(e.clientX);
    });
    const end = (e) => {
      if (!ui.dragging) return;
      ui.dragging = false;
      scrub.classList.remove('gt-dragging');
      if (!scrub.matches(':hover')) scrub.classList.remove('gt-hovering');
      GT.bridge('seekTo', scrubTime(e.clientX).t);
      show();
    };
    scrub.addEventListener('pointerup', end);
    scrub.addEventListener('pointercancel', end);
    scrub.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        skip(e.key === 'ArrowLeft' ? -10 : 10);
      }
    });
  };

  const paint = (k) => ui.scrub.style.setProperty('--gt-played', Math.max(0, Math.min(1, k)));

  // ── Menus ───────────────────────────────────────────────────────────────
  const closeMenu = () => {
    ui?.menu?.remove();
    if (ui) {
      ui.menu = null;
      ui.menuOpen = false;
    }
  };

  const openSpeedMenu = async (anchor) => {
    if (ui.menuOpen) return closeMenu();
    const current = (await GT.bridge('getPlaybackRate')) || currentVideo()?.playbackRate || 1;
    const menu = h(
      'div.gt-menu',
      { role: 'menu' },
      h('div.gt-menu-title', 'Playback Speed'),
      RATES.map((r) =>
        h(
          'button.gt-menu-item',
          {
            type: 'button',
            role: 'menuitemradio',
            'aria-checked': String(r === current),
            onclick: () => {
              GT.bridge('setPlaybackRate', r);
              closeMenu();
            },
          },
          r === 1 ? 'Normal' : `${r}×`,
        ),
      ),
    );
    const pr = ui.root.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    menu.style.right = `${pr.right - ar.right}px`;
    menu.style.bottom = `${pr.bottom - ar.top + 12}px`;
    ui.root.append(menu);
    ui.menu = menu;
    ui.menuOpen = true;
    show(true);
  };

  // ── Rendering ───────────────────────────────────────────────────────────
  const refreshMeta = () => {
    const md = navigator.mediaSession?.metadata;
    const title =
      document.querySelector('ytd-watch-metadata #title h1')?.textContent?.trim() ||
      md?.title ||
      '';
    const channel =
      document.querySelector('ytd-watch-metadata #owner ytd-channel-name a')?.textContent?.trim() ||
      md?.artist ||
      '';
    if (ui.title.textContent !== title) ui.title.textContent = title;
    if (ui.channel.textContent !== channel) ui.channel.textContent = channel;
  };

  const refresh = () => {
    const v = currentVideo();
    if (!ui || !v) return;
    const d = v.duration;
    const live = ui.live || !Number.isFinite(d);
    ui.root.classList.toggle('gt-live', live);
    if (!ui.dragging && Number.isFinite(d) && d > 0) paint(v.currentTime / d);
    if (v.buffered.length && Number.isFinite(d) && d > 0) {
      ui.scrub.style.setProperty('--gt-buffered', v.buffered.end(v.buffered.length - 1) / d);
    }
    ui.elapsed.textContent = GT.formatTime(v.currentTime);
    ui.remaining.textContent = Number.isFinite(d) ? `−${GT.formatTime(d - v.currentTime)}` : '';
    setIcon(ui.playBtn, v.paused ? 'play' : 'pause');
    ui.playBtn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
    ui.root.classList.toggle('gt-paused', v.paused);
    if (v.paused) show(true);
  };

  const refreshToggles = async () => {
    if (!ui) return;
    const cc = native('.ytp-subtitles-button');
    ui.ccBtn.hidden = !isShown(cc);
    ui.ccBtn.classList.toggle('gt-on', cc?.getAttribute('aria-pressed') === 'true');
    const fs = !!document.fullscreenElement;
    setIcon(ui.fsBtn, fs ? 'pipExit' : 'fullscreen');
    ui.fsBtn.setAttribute('aria-label', fs ? 'Exit full screen' : 'Full screen');
    const rate = currentVideo()?.playbackRate || 1;
    ui.speedLabel.textContent = rate === 1 ? '' : `${rate}×`;
    ui.pipBtn.hidden = !GT.settings.pip;
    ui.pipBtn.classList.toggle('gt-on', !!GT.pip?.isOpen?.());
    const muted = await GT.bridge('isMuted');
    const vol = await GT.bridge('getVolume');
    if (!ui) return;
    setIcon(ui.volBtn, muted || vol === 0 ? 'mute' : 'volume');
    if (typeof vol === 'number' && document.activeElement !== ui.volSlider) {
      ui.volSlider.value = muted ? 0 : vol;
      ui.volSlider.style.setProperty('--gt-vol', (muted ? 0 : vol) / 100);
    }
  };

  const onVideoChange = async () => {
    ui.board = null;
    ui.live = false;
    const [sb, info] = await Promise.all([GT.bridge('getStoryboard'), GT.bridge('getVideoData')]);
    if (!ui) return;
    ui.board = GT.data.parseStoryboard(sb?.spec);
    ui.live = !!info?.isLive;
    refreshMeta();
    refresh();
  };

  const attachVideo = (v) => {
    if (!v || ui.video === v) return;
    ui.detachVideo?.();
    ui.video = v;
    const on = {
      timeupdate: refresh,
      progress: refresh,
      durationchange: refresh,
      play: () => {
        refresh();
        flash('play');
        show();
      },
      pause: () => {
        refresh();
        flash('pause');
      },
      loadedmetadata: onVideoChange,
      volumechange: refreshToggles,
      ratechange: refreshToggles,
    };
    Object.entries(on).forEach(([ev, fn]) => v.addEventListener(ev, fn));
    ui.detachVideo = () => Object.entries(on).forEach(([ev, fn]) => v.removeEventListener(ev, fn));
    onVideoChange();
  };

  const build = (p) => {
    const stop = (e) => e.stopPropagation();
    const title = h('h2.gt-ctl-title');
    const channel = h('div.gt-ctl-channel');
    const playBtn = button('pause', 'Pause', () => togglePlay(), '.gt-cbtn-play');
    const volSlider = h('input.gt-vol', {
      type: 'range',
      min: '0',
      max: '100',
      step: '1',
      'aria-label': 'Volume',
    });
    volSlider.addEventListener('input', () => {
      volSlider.style.setProperty('--gt-vol', volSlider.value / 100);
      GT.bridge('setVolume', Number(volSlider.value));
    });
    const volBtn = button('volume', 'Mute', async () => {
      (await GT.bridge('isMuted')) ? GT.bridge('unMute') : GT.bridge('mute');
      setTimeout(refreshToggles, 60);
    });
    const ccBtn = button('captions', 'Subtitles', () => {
      native('.ytp-subtitles-button')?.click();
      setTimeout(refreshToggles, 60);
    });
    const speedLabel = h('span.gt-cbtn-label');
    const speedBtn = button('speed', 'Playback speed', (e) => openSpeedMenu(e.currentTarget));
    speedBtn.append(speedLabel);
    const gearBtn = button('gear', 'Settings', () => {
      closeMenu();
      native('.ytp-settings-button')?.click();
      show(true);
    });
    const pipBtn = button('pip', 'Picture in Picture', () => {
      if (GT.pip?.toggle) GT.pip.toggle();
      else
        currentVideo()
          ?.requestPictureInPicture?.()
          .catch(() => {});
    });
    const fsBtn = button('fullscreen', 'Full screen', () =>
      native('.ytp-fullscreen-button')?.click(),
    );
    const nextBtn = button('next', 'Next video', () => GT.bridge('nextVideo'));

    const previewImg = h('div.gt-preview-img', { hidden: true });
    const previewTime = h('span.gt-preview-time');
    const preview = h('div.gt-preview', previewImg, previewTime);
    const track = h(
      'div.gt-scrub-track',
      h('i.gt-buffered'),
      h('i.gt-played'),
      h('i.gt-hoverfill'),
    );
    const scrub = h(
      'div.gt-scrub',
      { role: 'slider', tabindex: '0', 'aria-label': 'Seek' },
      track,
      h('div.gt-knob'),
      preview,
    );
    const elapsed = h('span.gt-elapsed');
    const remaining = h('span.gt-remaining');
    const glyph = h('div.gt-glyph', { 'aria-hidden': 'true' });

    const bar = h(
      'div.gt-ctl-bar',
      h(
        'div.gt-ctl-head',
        h('div.gt-ctl-meta', channel, title),
        h(
          'div.gt-ctl-buttons',
          h(
            'div.gt-cgroup',
            button('back10', 'Back 10 seconds', () => skip(-10)),
            playBtn,
            button('fwd10', 'Forward 10 seconds', () => skip(10)),
            nextBtn,
          ),
          h('div.gt-cgroup.gt-cgroup-vol', volBtn, volSlider),
          h('div.gt-cgroup', ccBtn, speedBtn, gearBtn, pipBtn, fsBtn),
        ),
      ),
      scrub,
      h('div.gt-times', elapsed, h('span.gt-live-pill', svg('live'), 'LIVE'), remaining),
    );
    const root = h('div.gt-controls', glyph, h('div.gt-ctl-scrim'), bar);
    for (const ev of ['click', 'dblclick', 'pointerdown', 'mousedown', 'wheel']) {
      bar.addEventListener(ev, stop);
    }
    p.append(root);

    ui = {
      root,
      player: p,
      bar,
      glyph,
      title,
      channel,
      playBtn,
      volBtn,
      volSlider,
      ccBtn,
      speedBtn,
      speedLabel,
      gearBtn,
      pipBtn,
      fsBtn,
      scrub,
      track,
      preview,
      previewImg,
      previewTime,
      elapsed,
      remaining,
      lastInput: 0,
      board: null,
      live: false,
      dragging: false,
      menuOpen: false,
      idleTimer: 0,
    };
    bindScrubber();

    const onMove = () => show();
    const onLeave = () => {
      const v = currentVideo();
      if (v && !v.paused && !ui.dragging && !ui.menuOpen) {
        clearTimeout(ui.idleTimer);
        ui.idleTimer = setTimeout(() => ui?.player.classList.remove('gt-ctl-visible'), 600);
      }
    };
    const onKey = (e) => {
      if (GT.isTyping(e)) return;
      if (e.key === 'Escape' && ui.menuOpen) return closeMenu();
      ui.lastInput = Date.now();
      show();
    };
    const onDocClick = (e) => {
      if (ui?.menuOpen && !ui.menu.contains(e.target) && !ui.speedBtn.contains(e.target))
        closeMenu();
    };
    const onPlayerPointer = () => (ui.lastInput = Date.now());
    p.addEventListener('pointermove', onMove, { passive: true });
    p.addEventListener('pointerleave', onLeave);
    p.addEventListener('pointerdown', onPlayerPointer, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('fullscreenchange', refreshToggles);

    const tick = setInterval(() => {
      if (!ui) return;
      attachVideo(currentVideo());
      refreshMeta();
      refreshToggles();
    }, 1000);

    cleanup = [
      () => p.removeEventListener('pointermove', onMove),
      () => p.removeEventListener('pointerleave', onLeave),
      () => p.removeEventListener('pointerdown', onPlayerPointer, true),
      () => document.removeEventListener('keydown', onKey, true),
      () => document.removeEventListener('click', onDocClick, true),
      () => document.removeEventListener('fullscreenchange', refreshToggles),
      () => clearInterval(tick),
    ];

    attachVideo(currentVideo());
    refreshToggles();
    show();
  };

  let mountToken = 0;
  const mount = async () => {
    const token = ++mountToken;
    document.documentElement.classList.add('gt-controls-on');
    const p = await GT.waitFor('#movie_player video');
    if (token !== mountToken || !p) return;
    build(player());
  };

  const unmount = () => {
    mountToken++;
    document.documentElement.classList.remove('gt-controls-on', 'gt-idle');
    if (!ui) return;
    clearTimeout(ui.idleTimer);
    ui.detachVideo?.();
    cleanup.forEach((fn) => fn());
    cleanup = [];
    closeMenu();
    ui.player.classList.remove('gt-ctl-visible');
    ui.root.remove();
    ui = null;
  };

  GT.register({
    name: 'controls',
    active: (s, route) => s.watch && s.controls && route === 'watch',
    mount,
    unmount,
    update: () => {
      if (!ui) return;
      if (!ui.root.isConnected) {
        unmount();
        mount();
      } else {
        onVideoChange();
        show();
      }
    },
  });

  GT.controls = { show, refresh: () => ui && refreshToggles() };
})();
