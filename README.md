# Fast Board: the make.fun board in 0.8 KB

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A frontend for make.fun's open bounties, built from plain static files with no build step. The first load is one file, `index.html`, 798 bytes gzip-9, and it paints the board on its own: one row per open bounty with its title, pot, entry fee and time left. Everything else loads after that by `import()`. The full board then leads with the money: the total in live pots, then one card per bounty with its pot first, its entry fee, time left and entries, plus search and category filters. On a wide screen, a bounty page and its leaderboard sit beside the board list (master-detail). That list is drawn from the board answer already in the cache, with no extra request. Leaderboards are windowed: of threejs-fps-02's 5,819 rows, only the ~23 in view are in the DOM. Each entrant has a public profile, which opens in a side panel next to the leaderboard. Everything is read straight from make.fun's public API. There is a light theme and a dark theme. API answers are cached and revalidated by ETag, and live updates change only the DOM nodes whose values changed. A footer on every view shows the speed as this browser measured it, with a live count of API requests.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (add `--port <n>` to use a different port). Use Node 22.18 or later, which runs `.ts` files directly; on older 22.x versions, add `--experimental-strip-types`.

## Themes

The page is warm off-white with white cards and near-black text in the light theme, and deep ink with slightly lighter cards in the dark theme. Pots are money green in both, the only accent color. Bounties in their last 24 hours get an amber top rule and an amber countdown. The font is the system UI stack, with tabular numerals so money and countdowns line up. Body text contrast is at least 5.6:1 in both themes.

Every color is a CSS variable set once with `light-dark()` in `app/styles-later.js`, so each theme is one `color-scheme` value and no rule is written twice. `index.html` carries only the page background and the pot green, the two colors the first paint needs. The theme follows the system setting (`prefers-color-scheme`) until you pick one with the half-circle button at the right of the top bar. That choice is saved in `localStorage`. A `?theme=dark` or `?theme=light` hint in the URL forces a theme without saving it (e.g. `/?theme=dark#/bounty/<slug>`; on the board, `#theme=dark` also works). `shell.js` applies the hint or the saved choice as it loads, right after the first paint. Keeping that out of `index.html` holds the first load under 0.8 KB, at the cost of the first paint using the system theme.

## How it is built

The first load is 1 file: `app/index.html`, 1,228 bytes raw or 798 bytes gzip-9 (the dossier's `Totals:` line). Everything else is fetched after first paint by `import()`: 13 files, 20,520 bytes gzip-9 in all. Each view's files load only when you open that view.

- `app/index.html`: a minimal style block, the board row template (`row()`: title, pot, fee, time left) and one `fetch` of `/api/competitions?status=open&activity=times` that paints the rows into `<main>`. It then calls `import('./shell.js')`. It has no static imports, so nothing else blocks the rows.
- `app/shell.js`: the hash router (`route()`), the theme (it applies a `?theme=` hint or your saved choice, and adds the toggle button) and one countdown ticker for every `[data-ends]` element. It seeds the API cache with the board answer `index.html` already fetched, so no view asks for the board again. With it come `styles-later.js` (the rest of the stylesheet, adopted as one constructable sheet), `api-cache.js`, `dom-patch.js` and `speed-meter.js`.
- `app/board-more.js`: the full board. It shows the pot headline (live pots, open count, next close), search, category chips, the sort menu, the "No fee" toggle and keyed cards. It revalidates every 60 seconds. A card turns urgent in its last 24 hours and closes at its deadline, even while the API still says open.
- `app/master-detail.js` (`masterDetail`): on screens wider than 1,000 px, it puts a bounty or leaderboard beside the board list. The list is compact rows drawn with `index.html`'s own `row()` template from the cached board answer (`ttl: Infinity`, so no request), and the open bounty is highlighted. The list stays in place as you move between bounties. Phones keep the single-column views.
- `app/views/`: `bounty.js` (live pot, dates, rules, rewards table, with `markdown.js` and `live-pot.js`), `leaderboard.js` with `windowed-rows.js`, and `profile.js`. Each is loaded by `import()` the first time you open it.

Routes:

- `#/`: the board
- `#/bounty/<slug>`: one bounty, beside the board list on wide screens
- `#/bounty/<slug>/leaderboard`: the ranked entries, windowed, beside the board list on wide screens. Its header shows the row count and "rendering N of M rows". Clicking an entrant opens their profile in a side panel beside the table (`?u=<handle>`), swapped in place without reloading the leaderboard.
- `#/u/<handle>`: a full public profile, with the person's record (prizes won, entered, placed, won, podiums, best place) and their entries

In the rewards table, the leaderboard and the profile's entries, places 1 to 3 get a green badge, solid for first. Money is right-aligned. The router ignores anything after `?` or `&` in the hash except `u`, so a theme hint never changes the route.

Speed techniques, named as they are in the code:

- **One-file first load**: `index.html` holds only what the board's first paint needs (798 bytes gzip-9). The router, the ETag cache, the rest of the CSS and the views arrive after the rows are on screen.
- **`import()` per view**: the bounty page, the leaderboard and the profile load the first time you open one. The profile panel uses the same `profile.js`.
- **`cachedFetch`** (`api-cache.js`): keeps each API answer in memory and in `sessionStorage`, merges requests already in flight for the same path, and revalidates stale copies by ETag through the HTTP cache. If the ETag hasn't changed, it reuses the copy it already parsed. It retries once on a 5xx error. The board's cached copy keeps only the short fields of each bounty.
- **`patchList` / `patchText`** (`dom-patch.js`): keyed DOM updates. Existing cards and rows are kept, moved only when out of place, and their text is rewritten only when it changed. A value that changes flashes briefly.
- **`livePot`**: on a bounty page, one `EventSource` on make.fun's live stream signals new entries and fees. The page then re-reads the detail at most once a minute, and falls back to 60-second polling if the stream drops.
- **`windowedRows`** (`views/windowed-rows.js`): a long leaderboard keeps only the rows in view, plus 8 above and 8 below, in the DOM. Two spacer rows hold the scroll height of the rest. It redraws once a frame on scroll and on resize, and reuses row nodes by key. The row height is measured as drawn, so the window doesn't drift over 5,000 rows.
- **Small shaped payloads**: the board asks for `activity=times` (about half the bytes of the full list). The leaderboard asks for `?rows=first` and trims rows before caching. The profile shows 20 entries at a time (6 in the panel).
- **Speed footer** (`speed-meter.js`): on every view it shows the first load's size in gzip, its file count, the requests made before first paint, when the board was painted and a live count of API requests that updates as each request finishes. The size comes from re-reading the first-load files from the HTTP cache and gzipping them with `CompressionStream`, so it can differ from gzip-9 by a few bytes. Everything else is read from the Performance API. After those come this view's render time and the visit's API requests, ETag revalidations and cache hits. On a deep link to another view, the first load honestly includes that view's modules.

`node main.ts` packages `app/` and `screenshots/` with `dossier.json` for judging (set `MAKEFUN_OUTPUT_DIR=out` to write it somewhere other than `/output`). It first checks that `app/index.html` exists and that `screenshots/` holds 1 to 3 `.jpg` or `.png` files of at most 256 KiB each, and stops with a message if not. When it is done, it prints one line: the files copied, the screenshots, the size of `dossier.json` and the dossier's first-load totals.
