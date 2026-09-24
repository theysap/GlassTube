# GlassTube — Chrome Web Store listing (v{{version}})

Copy/paste reference for the Chrome Web Store Developer Dashboard.

## Package

- **Upload:** `glasstube-v{{version}}.zip`

## Store listing

- **Name:** GlassTube
- **Summary (≤132 chars):** Reimagine YouTube as a cinematic, Apple TV-inspired experience with a Liquid Glass design.
- **Category:** Entertainment
- **Language:** English

### Description

GlassTube turns YouTube into a big-screen, lean-back experience inspired by the Apple TV app — with a Liquid Glass look, cinematic playback and a floating player.

★ Top Shelf home
A full-bleed hero that rotates through your top picks, followed by rows you scroll sideways: Continue Watching, Top Picks, Subscriptions, Shorts, Live and Explore. Cards lift and tilt under your cursor with a specular glare, just like on a TV.

★ Cinematic watch page
The player fills the screen. Glass controls fade in when you need them: play/pause, 10-second skips, a thick scrubber with thumbnail previews, captions, speed, volume, fullscreen and Picture in Picture. Scroll down for an Up Next row, the description and comments in glass panels.

★ Every page, redesigned
Channels get a full-bleed banner, big avatar and glass tab pills. Playlists, Watch Later and Liked videos become a collection page with a numbered episode list. Subscriptions, History, You, search results, hashtags and hubs like Gaming get big titles, shelves and grids — and Shorts play on an ambient glow with glass buttons.

★ Picture in Picture, redesigned
Pop the video into a floating window with tvOS-style controls, a scrubber and a one-click return to the tab.

★ Keyboard friendly
Move around the home screen with the arrow keys like a remote.

★ Yours to tune
Turn any part on or off from the toolbar popup, reduce transparency, switch a page back to YouTube's Classic View, or pause GlassTube with one switch.

Privacy: GlassTube collects no data, has no analytics and never contacts any server. It only restyles pages you open on youtube.com.

GlassTube is an independent project. It is not affiliated with, endorsed by or sponsored by YouTube, Google or Apple. YouTube is a trademark of Google LLC. Apple TV and tvOS are trademarks of Apple Inc.

### Graphic assets (in this folder)

Sizes follow the [Chrome Web Store image guidelines](https://developer.chrome.com/docs/webstore/images). All screenshots and tiles are opaque 24-bit PNGs.

| Dashboard field                    | File                                                                 | Size              | Required                        |
| ---------------------------------- | -------------------------------------------------------------------- | ----------------- | ------------------------------- |
| Store icon                         | `store-icon-128x128.png` (96 px artwork + 16 px transparent padding) | 128×128           | Yes                             |
| Screenshots (upload in this order) | `screenshot-1-*.png` … `screenshot-5-*.png`                          | 1280×800          | 1–5                             |
| Small promo tile                   | `promo-small-440x280.png`                                            | 440×280           | Yes                             |
| Marquee promo tile                 | `promo-marquee-1400x560.png`                                         | 1400×560          | Optional (needed for featuring) |
| Spare screenshots                  | `extras/` (only when more than five were captured)                   | 1280×800          | —                               |
| Logo masters (press / social)      | `brand/glasstube-logo-4096.png`, `-1024.png`, `-512.png`             | 4096 / 1024 / 512 | —                               |

Screenshots feature content from the official Formula 1 YouTube channel (@Formula1).

## Privacy practices

- **Single purpose:** Restyle youtube.com with an Apple TV-inspired interface (home, watch page and Picture-in-Picture player).
- **Permission — `storage`:** Saves the user's GlassTube preferences (feature switches) with `chrome.storage.sync`.
- **Host access — `https://www.youtube.com/*` (content scripts):** Needed to restyle YouTube pages and add the GlassTube home, player controls and Picture-in-Picture window.
- **Remote code:** No. All code ships inside the package.
- **Data usage:** GlassTube does not collect or transmit any user data. Tick none of the data categories.
- **Certifications:** No sale of data · no unrelated use · no creditworthiness use.
- **Privacy policy URL:** https://github.com/theysap/GlassTube/blob/master/PRIVACY.md

## Test instructions for the reviewer

No account or setup needed. Open https://www.youtube.com — the home page becomes a full-screen Top Shelf. Open any video for the cinematic player; click the Picture-in-Picture button in the glass control bar. Visit https://www.youtube.com/@BlenderStudio for a channel page. Toggle features from the toolbar popup.

## What's new in v{{version}}

{{changes}}
