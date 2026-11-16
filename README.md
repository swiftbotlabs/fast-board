# fast-board

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A frontend for make.fun's open bounties, built from plain static files with no build step. It opens on a board that leads with the money: the total in live pots, then one card per bounty with its pot first, then the entry fee, time left and entries. You can search the board and filter it by category. Each bounty also has its own page and leaderboard, and each entrant has a public profile, all read straight from make.fun's public API. It comes in a light theme and a dark theme. It stays fast because the first load is one file: `index.html`, 1,643 bytes gzip-9, which paints the board cards by itself. Everything else loads after that by `import()`. API answers are cached and revalidated by ETag, and live updates change only the DOM nodes whose values changed. A footer on every view shows the speed as this browser measured it.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (add `--port <n>` to use a different port). Use Node 22.18 or later, which runs `.ts` files directly; on older 22.x versions, add `--experimental-strip-types`.

## Themes

The page is warm off-white with white cards and near-black text in the light theme, and deep ink with slightly lighter cards in the dark theme. Pots are money green in both, the only accent color. Bounties in their last 24 hours get an amber top rule and an amber countdown. The font is the system UI stack, with tabular numerals so money and countdowns line up. Body text contrast is at least 5.6:1 in both themes.

Every color is a CSS variable set once with `light-dark()` in `app/index.html`, so each theme is one `color-scheme` value and no rule is written twice. The theme follows the system setting (`prefers-color-scheme`) until you pick one with the half-circle button at the right of the top bar (added by `shell.js`), which remembers your choice in `localStorage`. A `?theme=dark` or `?theme=light` hint in the URL forces a theme without saving it (e.g. `/?theme=dark#/bounty/<slug>`; on the board, `#theme=dark` also works). The inline script in `index.html` applies the hint or saved choice before the first paint.

## How it is built

The first load is 1 file: `app/index.html`, 2,898 bytes raw or 1,643 bytes gzip-9 (the dossier's `Totals:` line). Everything else is fetched after first paint by `import()`: 11 files, 17,940 bytes gzip-9 in all, each view's files only when you open it.

- `app/index.html`: inline CSS for the board cards only, and an inline script that fetches `/api/competitions?status=open` and paints each card's category, title, pot, entry fee, time left and entries. It reuses a copy younger than 30 seconds from `sessionStorage`; otherwise it asks with `cache: 'no-cache'`, so the browser revalidates by ETag. It then calls `import('./shell.js')`, with no static imports, so nothing else blocks the cards.
- `app/shell.js`: the hash router (`route()`), the theme button and one countdown ticker for every `[data-ends]` element. With it come `styles-later.js` (the rest of the stylesheet, adopted as one constructable sheet), `api-cache.js`, `dom-patch.js` and `speed-meter.js`.
- `app/board-more.js`: the board extras. It adds the pot headline (live pots, open count, next close), search, category chips, the sort menu and the "No fee" toggle, and takes over the painted cards by keyed patching. It revalidates every 60 seconds. A card turns urgent in its last 24 hours and closes at its deadline, even while the API still says open.
- `app/views/`: `bounty.js` (live pot, dates, rules, rewards table, with `markdown.js` and `live-pot.js`), `leaderboard.js` and `profile.js`, each loaded by `import()` the first time you open it.

Routes:

- `#/`: the board
- `#/bounty/<slug>`: one bounty
- `#/bounty/<slug>/leaderboard`: the ranked entries. Clicking an entrant opens their profile in a side panel beside the table (`?u=<handle>`), swapped in place without reloading the leaderboard.
- `#/u/<handle>`: a full public profile, with the person's record (prizes won, entered, placed, won, podiums, best place) and their entries

In the rewards table, the leaderboard and the profile's entries, places 1 to 3 get a green badge, solid for first. Money is right-aligned. The router ignores anything after `?` or `&` in the hash except `u`, so a theme hint never changes the route.

Speed techniques, named as they are in the code:

- **One-file first load**: `index.html` holds only what the board's first paint needs. The router, the rest of the CSS and the views arrive after the cards are on screen.
- **`import()` per view**: the bounty page, the leaderboard and the profile load the first time you open one. The profile panel uses the same `profile.js`.
- **`cachedFetch`** (`api-cache.js`): keeps each API answer in memory and in `sessionStorage`, merges requests already in flight for the same path, and revalidates stale copies by ETag through the HTTP cache. If the ETag hasn't changed, it reuses the copy it already parsed. It retries once on a 5xx error. The board's cached copy keeps only the short fields of each bounty.
- **`patchList` / `patchText`** (`dom-patch.js`): keyed DOM updates. Existing cards and rows are kept, moved only when out of place, and their text is rewritten only when it changed. A value that changes flashes briefly.
- **`livePot`**: on a bounty page, one `EventSource` on make.fun's live stream signals new entries and fees. The page then re-reads the detail at most once a minute, and falls back to 60-second polling if the stream drops.
- **Small shaped payloads**: the leaderboard asks for `?rows=first` and trims rows before caching. It shows 50 rows a page, and the profile shows 20 entries at a time (6 in the panel).
- **Speed footer** (`speed-meter.js`): on every view it shows the first load's size in gzip, its file count, the requests made before first paint and when the board was painted. The size comes from re-reading the first-load files from the HTTP cache and gzipping them with `CompressionStream`, so it can differ from gzip-9 by a few bytes. Everything else is read from the Performance API. After those come this view's render time and the visit's API requests, ETag revalidations and cache hits. On a deep link to another view, the first load honestly includes that view's modules.

`node main.ts` packages `app/` and `screenshots/` with `dossier.json` for judging (set `MAKEFUN_OUTPUT_DIR=out` to write it somewhere other than `/output`). It first checks that `app/index.html` exists and that `screenshots/` holds 1 to 3 `.jpg` or `.png` files of at most 256 KiB each, and stops with a message if not. When it is done, it prints one line: the files copied, the screenshots, the size of `dossier.json` and the dossier's first-load totals.
