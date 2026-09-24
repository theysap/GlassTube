# GlassTube User Manual

Everything you need to get the most out of GlassTube — what each part does, every option in the popup, shortcuts, known issues and how to report a problem.

> [!IMPORTANT]
> **Found a problem? Please tell us — it's the fastest way it gets fixed.**
>
> 1. Open **[github.com/theysap/GlassTube/issues/new/choose](https://github.com/theysap/GlassTube/issues/new/choose)** (or click **Report an issue** at the bottom of the GlassTube popup).
> 2. Pick **Bug report** (something is broken) or **Feature request** (an idea).
> 3. Tell us **which page** it happened on (Home, a video, a channel, Shorts, search…), **what you expected**, **what happened**, and your **GlassTube and Chrome versions** (GlassTube's version is under its name in the popup; Chrome's is at `chrome://settings/help`).
> 4. A screenshot helps a lot — **please blur anything personal** (your account, history, email).
> 5. First try **reloading the tab** — many hiccups (see [Known issues](#known-issues--what-to-expect)) disappear after one reload. If it still happens, say so in the report.
>
> Please don't include private links, passwords or account details in an issue — issues are public.

---

## Contents

- [Getting started](#getting-started)
- [The toolbar popup — every option](#the-toolbar-popup--every-option)
- [Home (Top Shelf)](#home-top-shelf)
- [The sidebar](#the-sidebar)
- [Search](#search)
- [Watching a video](#watching-a-video)
- [Picture in Picture](#picture-in-picture)
- [Channels, playlists and library pages](#channels-playlists-and-library-pages)
- [Shorts](#shorts)
- [Classic View — getting YouTube's layout back](#classic-view--getting-youtubes-layout-back)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Known issues & what to expect](#known-issues--what-to-expect)
- [Performance tips (if things feel laggy)](#performance-tips-if-things-feel-laggy)
- [Troubleshooting checklist](#troubleshooting-checklist)
- [FAQ](#faq)
- [How to report an issue](#how-to-report-an-issue)

---

## Getting started

1. Install GlassTube (from the Chrome Web Store, or **Load unpacked** from a release zip — see the [README](README.md#install)).
2. Pin it: click the puzzle-piece icon in Chrome's toolbar and pin **GlassTube** so its popup is one click away.
3. Open [youtube.com](https://www.youtube.com). If YouTube was already open, **reload the tab** once so GlassTube can start.
4. For the best look, **maximise the window** or go full screen (<kbd>F11</kbd> on Windows/Linux, <kbd>⌃</kbd><kbd>⌘</kbd><kbd>F</kbd> on macOS).
5. **Sign in to YouTube** for personal rows (Continue Watching, Subscriptions, Watch Later). Signed out, GlassTube fills Home with Explore rows instead.

---

## The toolbar popup — every option

Click the GlassTube icon in Chrome's toolbar. Every change applies **instantly** to open YouTube tabs — no reload needed. **Read manual** at the top opens this page.

### Master switch

| Option        | What it does                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GlassTube** | Turns the whole extension on or off. Off gives you plain YouTube immediately; the toolbar icon shows an **OFF** badge while paused. All other options are dimmed while this is off. |

### Experience

| Option                   | Default | What it does                                                                                                                                                  | Turn it off if…                                                                  |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Top Shelf Home**       | On      | Replaces YouTube's home grid with the Apple TV–style Top Shelf and shelves.                                                                                   | You prefer YouTube's grid on the home page only.                                 |
| **Cinematic Watch Page** | On      | Makes the player fill the screen (theater mode stretched to full height), hides YouTube's top bar, and lays out Up Next, comments and Shorts below the video. | You want YouTube's normal watch layout.                                          |
| **tvOS Player Controls** | On      | Replaces YouTube's control bar with glass buttons and a large scrubber with thumbnail previews. _Needs Cinematic Watch Page._                                 | You rely on YouTube's own control bar (e.g. chapters list, miniplayer button).   |
| **tvOS Browse Pages**    | On      | Redesigns channels, playlists, Subscriptions, History, You, search results, hashtags and hub pages.                                                           | You mostly manage playlists/history and want YouTube's editing tools everywhere. |
| **Cinematic Shorts**     | On      | Puts the Shorts player on an ambient glow with glass buttons and the GlassTube sidebar.                                                                       | You want YouTube's standard Shorts page.                                         |
| **Picture in Picture**   | On      | Enables GlassTube's floating player (button in the controls and <kbd>Alt</kbd>+<kbd>P</kbd>).                                                                 | You never use PiP.                                                               |

### Home

| Option                    | Default  | What it does                                                                                                                                                                                                                                      |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Top Shelf Background**  | **Calm** | **Calm** — a soft, soothing gradient with the video's thumbnail shown as a framed poster (easier on the eyes, never clashes with busy thumbnails). **Artwork** — the thumbnail fills the whole top of the screen, like a movie poster.            |
| **Auto-rotate Top Shelf** | On       | Moves to the next featured video every 9 seconds. Rotation pauses while you hover the hero, focus its buttons, scroll down, open search or switch tabs. The small capsule at the bottom-right fills up to show the timer — click any dot to jump. |
| **Explore Rows**          | On       | Adds Music, Gaming and News shelves to Home. When your personal feed is empty (signed out or watch history paused) Explore rows are always shown so Home is never blank.                                                                          |
| **Parallax Tilt**         | On       | Cards tilt towards the cursor and a soft light glints across them. Turn it off for a calmer look or on slower computers.                                                                                                                          |

### Display

| Option                  | Default | What it does                                                                                                                                                                                                      |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reduce Transparency** | Off     | Replaces every glass (blurred, see-through) surface with a solid one — sidebar, buttons, player controls, menus, tabs, search and the PiP window. Easier to read and **lighter on older or low-power computers**. |

### Shortcuts & footer

The **Shortcuts** card lists the most useful keys (full list [below](#keyboard-shortcuts)). The footer links to **GitHub**, this **User manual** and **Report an issue**.

---

## Home (Top Shelf)

- **The hero (Top Shelf)** shows your top picks. Use **Play** to start the video or **Channel** to open its channel. The dots at the bottom-right switch between featured videos.
- **Shelves** scroll sideways — use a trackpad/shift+wheel, the round **‹ ›** arrows that appear when you hover a shelf, or the arrow keys.
- **Shelf titles with a ›** (e.g. _Continue Watching ›_, _From Your Subscriptions ›_) open the full page.
- Shelves you may see: **Continue Watching** (with a progress bar), **Top Picks for You**, **From Your Subscriptions**, **Shorts**, **Mixes & Playlists**, **Live Now**, YouTube's own shelves (e.g. _Breaking news_), **Watch Later**, **Explore** (Music, Gaming, News…) and endless **More for You / Recommended** rows.
- **Keep scrolling** — more rows load automatically as you reach the bottom.
- **Middle-click or ⌘/Ctrl-click** any card to open it in a new tab.

## The sidebar

The floating glass pill on the left of Home, browse pages and Shorts. Hover it (or move focus into it with <kbd>←</kbd>) to expand the labels.

| Item                        | Goes to                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 🔍 Search                   | Opens GlassTube's full-screen search                                                                                |
| 🏠 Home                     | The Top Shelf                                                                                                       |
| Subscriptions               | Your subscriptions feed                                                                                             |
| Shorts                      | The Shorts feed                                                                                                     |
| You                         | Your library (history, playlists, Watch Later, liked videos)                                                        |
| History                     | Watch history                                                                                                       |
| Watch Later                 | Your Watch Later playlist                                                                                           |
| Classic Home / Classic View | Switches the current page to YouTube's own layout (see [Classic View](#classic-view--getting-youtubes-layout-back)) |

On the **watch page**, a small glass pill at the top-left gives you **‹ Home** and **Search**; it fades away with the controls while a video plays.

## Search

- Open it from the sidebar, the watch page pill, or press <kbd>/</kbd> on Home and browse pages.
- **Results appear as you type**: _Top Results_, _Channels_, _Shorts_ and _Playlists_ shelves.
- Press <kbd>Enter</kbd> to open YouTube's full results page (shown in the GlassTube layout), <kbd>↓</kbd> to move into the results, <kbd>Esc</kbd> to close.
- **Recent searches** are remembered on your computer only; use **Clear** to remove them.

## Watching a video

- Move the mouse over the video to show the controls; they hide again after ~3 seconds while playing. When paused they stay visible.
- **Control bar, left to right:**

  | Button      | Action                                                                     |
  | ----------- | -------------------------------------------------------------------------- |
  | ⟲10 / ⟳10   | Back / forward 10 seconds                                                  |
  | ▶︎ / ❚❚      | Play / pause (clicking the video also works)                               |
  | ▶︎❘          | Next video (next in the playlist, or YouTube's autoplay pick)              |
  | 🔊          | Mute; hover it for a volume slider                                         |
  | CC          | Captions on/off (only shown when the video has captions)                   |
  | Speedometer | Playback speed — 0.5× to 2× (the button shows e.g. _1.5×_ when not normal) |
  | ⚙︎           | YouTube's settings menu (quality, audio track, sleep timer…)               |
  | ▭           | Picture in Picture                                                         |
  | ⛶           | Full screen (double-click the video also works)                            |

- **Scrubber:** hover to preview any moment with a thumbnail; click or drag to jump. Elapsed time is on the left, remaining time on the right.
- **Live streams** show a red **LIVE** pill instead of the scrubber.
- **Ads** use YouTube's own controls (so _Skip_ always works); GlassTube's controls return afterwards.
- **Below the video** (scroll down): title, channel, Subscribe, likes and share (YouTube's own buttons), the description card (**…more** expands it), **Up Next**, a **playlist** shelf when you're in a playlist, **Comments** (click the button to open) and a **Shorts** shelf.

## Picture in Picture

1. On a watch page, click the **▭** button (or press <kbd>Alt</kbd>+<kbd>P</kbd>).
2. The video moves to a floating window you can drag anywhere and resize. The tab shows _Playing in Picture in Picture_ with a **Bring Back** button.
3. In the window: **⟲10 / ❚❚ / ⟳10** in the centre, a scrubber at the bottom, **mute** at the top-right and **Back to tab** at the top-left. Keys: <kbd>Space</kbd>/<kbd>K</kbd>, <kbd>←</kbd>/<kbd>J</kbd>, <kbd>→</kbd>/<kbd>L</kbd>, <kbd>M</kbd>, <kbd>Esc</kbd>. Double-click the video to return it.
4. Close the window (or click Back to tab / Bring Back) to return the video to the page — playback continues without interruption.

> Chrome only allows Picture in Picture after a click or key press, so it can't open by itself when you switch tabs.

## Channels, playlists and library pages

- **Channels:** banner, avatar, subscriber count, description (**More / Less** expands long ones), a **Subscribe** button (it presses YouTube's own, so notifications/bell settings still work), and **tabs** — Home, Videos, Shorts, Live, Playlists, Posts. Tabs that have nothing to lay out (e.g. _Posts_) show YouTube's own page, still in the dark theme.
- **Playlists, Watch Later and Liked videos:** a collection header with **Play All**, then a numbered list. To remove, reorder or edit videos, use **Edit** (opens YouTube's layout for that page).
- **Subscriptions:** a _Your Channels_ strip, then your latest uploads.
- **History:** grouped by day. To search, pause or clear history use **Manage History** (YouTube's layout).
- **You, Playlists, search results, hashtags, Gaming/Music/News hubs:** big title, shelves and grids.
- Grids keep **loading more as you scroll**.

## Shorts

GlassTube keeps YouTube's own Shorts player, so **scrolling, swiping, the ↑/↓ buttons and keyboard arrows** work exactly as usual. GlassTube adds a soft glow taken from the current Short, glass action buttons, rounded corners and the sidebar. Shorts opened from any GlassTube shelf continue into the normal, endless Shorts feed.

## Classic View — getting YouTube's layout back

- **Classic Home** (Home sidebar) or **Classic View** (browse page sidebar) switch to YouTube's layout for the rest of **this tab session**. A bright **GlassTube Home / GlassTube View** pill at the bottom-right brings the GlassTube layout back.
- **Edit** (playlists) and **Manage History** (History) do the same for those pages.
- To turn a part off everywhere and permanently, use the switches in the popup instead.

## Keyboard shortcuts

| Keys                                                                   | Where                      | Action                                                     |
| ---------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd>                    | Home, browse pages, search | Move focus between cards, like a TV remote                 |
| <kbd>Enter</kbd>                                                       | Anywhere                   | Open the focused item                                      |
| <kbd>/</kbd>                                                           | Home, browse pages         | Open search                                                |
| <kbd>Esc</kbd>                                                         | Search, menus, PiP         | Close                                                      |
| <kbd>Alt</kbd> + <kbd>P</kbd>                                          | Watch page                 | Toggle Picture in Picture                                  |
| <kbd>K</kbd> or <kbd>Space</kbd>                                       | Watch page                 | Play / pause (YouTube's key)                               |
| <kbd>J</kbd> / <kbd>L</kbd>                                            | Watch page                 | −10 s / +10 s (YouTube's keys)                             |
| <kbd>F</kbd>, <kbd>M</kbd>, <kbd>C</kbd>, <kbd>T</kbd>                 | Watch page                 | Full screen, mute, captions, theater mode (YouTube's keys) |
| <kbd>Space</kbd> <kbd>←</kbd> <kbd>→</kbd> <kbd>M</kbd> <kbd>Esc</kbd> | PiP window                 | Play-pause, −10 s, +10 s, mute, close                      |

---

## Known issues & what to expect

GlassTube redraws YouTube's pages from the same data YouTube uses, while YouTube keeps running underneath. That keeps things reliable, but it also means a few rough edges — none of them affect your account or data.

### Loading and reloading

- **Channel pages can take a moment to appear** (typically 1–3 seconds, longer on big channels or slow connections), because GlassTube waits for YouTube to finish loading the channel before drawing it. **If a channel page stays blank or shows the plain dark YouTube layout, reload the tab once** — it almost always fixes it.
- The same can occasionally happen on **playlists, History or Subscriptions** right after switching between them quickly — reload once.
- **Home's personal rows fill in a few seconds after the page opens** (Continue Watching, Subscriptions, Watch Later are fetched separately), so shelves may appear one after another.
- **After installing or updating GlassTube, reload YouTube tabs** that were already open; old tabs keep the previous version (or none) until reloaded.
- **Signed out, or with watch history paused**, YouTube has no personal home feed — GlassTube shows Explore rows and a note instead.

### Lag and smoothness

- **Glass effects are GPU-heavy.** On older laptops, integrated graphics, 4K/5K external displays or battery-saver mode, scrolling Home or opening search can stutter. Turn on **Reduce Transparency** (and optionally turn off **Parallax Tilt**) — this removes most of the cost.
- **Very long scrolling sessions** on Home or a channel's _Videos_ tab keep adding cards; after hundreds of cards scrolling can get heavier. Reload the page to start fresh.
- **The first open of search** may take a moment while results load; later searches are quicker (recent results are cached for a minute).
- **Scrub previews** appear once YouTube's preview images have loaded — on a new video the first hover may show only the time.
- **Switching tabs back** to YouTube can take a second for the hero rotation and ambient glow to catch up.

### Behaviour you might notice

- **Theater mode stays on.** The cinematic player uses YouTube's theater mode, which YouTube remembers. If you turn GlassTube off while not on a video, press <kbd>T</kbd> on any video to switch theater mode off.
- **YouTube's top bar is hidden** on the watch page and Shorts; use the glass pill / sidebar for Home and Search, or turn off _Cinematic Watch Page_ / _Cinematic Shorts_ if you need YouTube's bar (notifications, upload, account menu).
- **Chat replays on premieres** stay collapsed (the page uses the full-width layout); live streams with an open chat keep YouTube's side-by-side layout.
- **Features YouTube's own control bar has but GlassTube's doesn't** (chapter list, miniplayer, autoplay toggle, "Stable volume" shortcut) are still reachable via the ⚙︎ settings button, keyboard shortcuts, or by turning off _tvOS Player Controls_.
- **Editing tools** (remove from Watch Later, reorder playlists, clear history) live in YouTube's layout — use **Edit** / **Manage History** / **Classic View**.
- **When YouTube changes its website**, a page may temporarily look off or fall back to YouTube's layout until GlassTube is updated. Please [report it](#how-to-report-an-issue) with the page type.

---

## Performance tips (if things feel laggy)

1. Turn on **Reduce Transparency**.
2. Turn off **Parallax Tilt** and **Auto-rotate Top Shelf**.
3. Use the **Calm** Top Shelf background (fewer large images).
4. Reload long-running YouTube tabs now and then.
5. Make sure Chrome's **hardware acceleration** is on: `chrome://settings/system` → _Use graphics acceleration when available_.
6. Close other heavy tabs; YouTube itself is demanding.

## Troubleshooting checklist

| Problem                                 | Fix                                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page blank, half-drawn or plain YouTube | **Reload the tab.** Check the popup's master switch is on, and that you haven't switched that page to Classic View (look for the white pill at the bottom-right). |
| Nothing changes on YouTube at all       | Reload the tab; check `chrome://extensions` that GlassTube is enabled and allowed on youtube.com.                                                                 |
| Home only shows Explore rows            | Sign in to YouTube and make sure watch history isn't paused.                                                                                                      |
| Controls don't appear                   | Move the mouse over the video; during ads YouTube's own controls are shown. Check _tvOS Player Controls_ is on.                                                   |
| PiP button does nothing                 | Needs Chrome 116+; click the button (PiP can't open without a click). Check _Picture in Picture_ is on.                                                           |
| Text or buttons hard to read            | Turn on **Reduce Transparency**; try the **Calm** background.                                                                                                     |
| Something else                          | Toggle GlassTube off and on in the popup, reload, then [report it](#how-to-report-an-issue).                                                                      |

## FAQ

**Does GlassTube collect my data?** No. No analytics, no servers, no tracking. Settings are stored by Chrome (and synced if you use Chrome Sync); recent searches stay on your computer. See the [privacy policy](PRIVACY.md).

**Does it block ads?** No. GlassTube only changes how YouTube looks; ads play with YouTube's own controls.

**Will it affect my YouTube account or recommendations?** No — it shows the same feed YouTube would, and watching through GlassTube is the same as watching on YouTube.

**Does it work in other browsers?** It's built for Chrome; other Chromium browsers (Edge, Brave, Arc) generally work. Picture in Picture needs Chromium 116+.

**Is it made by YouTube or Apple?** No. GlassTube is an independent project inspired by the Apple TV app's design.

---

## How to report an issue

> [!IMPORTANT]
> **Raising an issue takes two minutes:**
>
> 1. Go to **[github.com/theysap/GlassTube/issues/new/choose](https://github.com/theysap/GlassTube/issues/new/choose)** — or click **Report an issue** in the GlassTube popup.
> 2. Choose **Bug report** or **Feature request**.
> 3. Include: the **page** (Home, video, channel, Shorts, search…), **steps** to see the problem, **what you expected** vs **what happened**, and your **GlassTube + Chrome versions**.
> 4. Add a **screenshot or short screen recording** — blur your account, history or anything personal.
> 5. Mention whether **reloading the tab** helped and which **popup options** you have turned on/off.
>
> 🔒 Issues are public — never paste passwords, private links or personal details.
