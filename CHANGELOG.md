# Changelog

All notable changes to GlassTube are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). Every commit is versioned (`vX.Y.Z: summary`) and every version is published as a GitHub Release.

## [0.1.0] - 2026-09-24

### Added

- Manifest V3 extension skeleton for `www.youtube.com` with a main-world bridge for native single-page navigation, player commands and page-data capture.
- Global Liquid Glass theme: deep dark palette, SF-style typography, glass masthead, guide, chips, menus and rounded thumbnails, all scoped so it switches off instantly.
- Toolbar popup styled after tvOS Settings with a master switch and a Reduce Transparency option; badge shows `OFF` while paused.
- App icon.
- Build script producing a deterministic store zip, plus `chrome/vX.Y.Z/` release folders (git-ignored) with the zip, store icon, listing copy and privacy policy.
- Tooling: ESLint, Stylelint, Prettier, Husky + lint-staged pre-commit checks, a commit message guard (`vX.Y.Z: summary`) and a manifest / version validator.

[0.1.0]: https://github.com/theysap/GlassTube/releases/tag/v0.1.0
