# Changelog

All notable changes to GlassTube are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). Every commit is versioned (`vX.Y.Z: summary`); public releases (e.g. `v1.0.0`) are published as GitHub Releases with a Chrome Web Store bundle.

## [0.8.0] - 2026-09-24

### Added

- **Top Shelf Background** setting (Artwork / Calm). Calm swaps busy full-bleed thumbnails for a soothing gradient with the artwork framed as a poster, and a matching calm glow behind the shelves.
- Segmented controls in the popup for multi-choice settings.

### Fixed

- **Reduce Transparency** now makes every glass surface solid (sidebar, buttons, player controls, menus, tabs, badges, search, PiP window) — previously it only removed the blur, which left surfaces looking more see-through.
- Video titles no longer render condensed (YouTube's `font-stretch`) or get clipped/overlapped when long; they wrap to up to three lines.
- The speed button's icon sat off-centre when hovered.
- Sidebar icons are exactly centred in the collapsed pill.
- The “GlassTube Home / View” return pill is now a bright, clearly visible button on YouTube's native pages.
- The popup no longer stretches wider than its content (it is centred at 360 px).

## [0.7.0] - 2026-09-24

### Added

- **GitHub Actions** — `CI` (lint, unit tests, validation, commit-message convention for the pushed range, build + zip artifact) and `Release` (on `vX.Y.Z` tags: full checks, tag ⇄ manifest check, zip, GitHub Release with notes from the changelog).
- **Chrome Web Store pipeline** — `npm run release:local` assembles `chrome/vX.Y.Z/` with the zip, store icon, 1280×800 screenshots, 440×280 and 1400×560 promo tiles (rendered from the real extension with freely licensed Blender/NASA content), listing copy with reviewer notes, and the privacy policy.
- `scripts/check-history.mjs`, `scripts/release-notes.mjs`, issue and pull-request templates.
- A full README with screenshots, settings, shortcuts, architecture, development and release guides.

## [0.6.0] - 2026-09-24

### Added

- **tvOS browse pages** for everything else YouTube offers, built from each page's own data:
  - **Channels** — full-bleed banner, large avatar, subscriber line, description, a Subscribe button that drives YouTube's own, glass tab pills (Home, Videos, Shorts, Live, Playlists…), the featured trailer and every channel shelf.
  - **Playlists** (incl. Watch Later and Liked videos) — a stacked collection header with Play All and a numbered, TV-app-style episode list.
  - **Subscriptions** (with a “Your Channels” strip), **History** (grouped by day), **You**, **Playlists**, **search results**, **hashtags** and **hub pages** (Gaming, Music, News…) — big titles, titled grids and shelves.
  - Endless paging on every grid, fed by YouTube's own feed underneath.
  - Pages without cards (Posts, settings, signed-out feeds) stay native and themed; **Classic View** / **Edit** / **Manage History** hand any page back to YouTube's layout.
- **Cinematic Shorts** — YouTube's Shorts player (gestures intact) on an ambient glow from the current Short, glass action buttons, rounded player, no masthead or guide, plus the GlassTube sidebar.
- Playlist, mix, album and podcast cards (stacked artwork, item-count badge); a “Mixes & Playlists” shelf on Home and a Playlists row in search.
- Parser support for hub video cards, grid channels, playlist renderers and titled hub lists; `extractPage` with tests.
- New settings: **tvOS Browse Pages** and **Cinematic Shorts**.

### Fixed

- Filled buttons (Subscribe) stay readable everywhere, not only inside `yt-button-shape`.

## [0.5.0] - 2026-09-24

### Added

- Full settings in the toolbar popup: Top Shelf Home, Cinematic Watch Page, tvOS Player Controls, Picture in Picture, Auto-rotate Top Shelf, Explore Rows, Parallax Tilt and Reduce Transparency — all applied live, without reloading YouTube.
- Dependent options dim when their parent feature is off.
- Keyboard shortcut reference in the popup.

## [0.4.0] - 2026-09-24

### Added

- **Picture in Picture, redesigned** — the video moves into a Document Picture-in-Picture window with tvOS-style glass controls: −10 s / play-pause / +10 s, a scrubber with elapsed and remaining time, mute, “Back to tab”, a centre glyph and auto-hiding chrome. Keyboard: Space/K, ←/→ (or J/L), M, Esc.
- The tab shows a glass “Playing in Picture in Picture” card with a Bring Back button; playback continues seamlessly in both directions.
- `Alt+P` toggles Picture in Picture on the watch page; when GlassTube's controls are off, a PiP button is added to YouTube's own control bar.
- Falls back to the browser's standard video PiP where Document PiP isn't available.

## [0.3.0] - 2026-09-24

### Added

- **Cinematic watch page** — the player fills the screen (theater mode stretched to full height), YouTube's masthead steps aside and a floating glass pill offers Home and Search.
- **tvOS player controls** — glass capsule buttons (−10 s, play/pause, +10 s, next, volume with slider, captions, playback speed menu, settings, Picture in Picture, full screen), a thick scrubber with storyboard thumbnail previews, elapsed / remaining time, a LIVE pill, a centre glyph on play/pause/skip and auto-hide with the cursor. YouTube's own controls return during ads.
- Up Next and playlist shelves under the title, a glass description card and comments tucked behind a glass toggle.
- Storyboard spec parser (with tests) for scrub previews.

### Changed

- Page data now comes from YouTube's `yt-navigate-finish` payloads and live renderer data, which also covers back/forward navigation and the home feed paging in.
- YouTube's own components are switched to their dark theme while GlassTube is on; filled buttons (Subscribe) keep readable contrast.

## [0.2.0] - 2026-09-24

### Added

- **Top Shelf home** — a full-screen Apple TV-style layer over youtube.com: a rotating hero with Play / Channel buttons, capsule page indicators, Ken Burns motion, scroll parallax and an ambient colour glow from the artwork.
- Shelves: Continue Watching (with progress), Top Picks, From Your Subscriptions, Shorts, Live Now, YouTube's own shelves, Watch Later, Explore categories and endless “More for You” rows paged in from YouTube's native feed.
- tvOS cards: lift on focus, parallax tilt and specular glare following the cursor, duration / LIVE badges and resume bars.
- Floating glass sidebar (Search, Home, Subscriptions, Shorts, You, History, Watch Later, Classic Home).
- Remote-style spatial navigation with the arrow keys; `/` opens search.
- Full-screen search with live results (videos, channels, Shorts) and recent searches.
- Explore rows fill the home screen when the personal feed is empty (signed out or history paused).
- JSON data layer that normalises YouTube's `videoRenderer`, `lockupViewModel`, Shorts, playlist and channel renderers, with unit tests.
- `npm run smoke` — drives real youtube.com in Chrome for Testing with the extension loaded; `npm run bump -- x.y.z` keeps versions in sync.

## [0.1.0] - 2026-09-24

### Added

- Manifest V3 extension skeleton for `www.youtube.com` with a main-world bridge for native single-page navigation, player commands and page-data capture.
- Global Liquid Glass theme: deep dark palette, SF-style typography, glass masthead, guide, chips, menus and rounded thumbnails, all scoped so it switches off instantly.
- Toolbar popup styled after tvOS Settings with a master switch and a Reduce Transparency option; badge shows `OFF` while paused.
- App icon.
- Build script producing a deterministic store zip, plus `chrome/vX.Y.Z/` release folders (git-ignored) with the zip, store icon, listing copy and privacy policy.
- Tooling: ESLint, Stylelint, Prettier, Husky + lint-staged pre-commit checks, a commit message guard (`vX.Y.Z: summary`) and a manifest / version validator.

[0.8.0]: https://github.com/theysap/GlassTube/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/theysap/GlassTube/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/theysap/GlassTube/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/theysap/GlassTube/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/theysap/GlassTube/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/theysap/GlassTube/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/theysap/GlassTube/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/theysap/GlassTube/commits/v0.1.0
