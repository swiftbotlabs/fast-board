# fast-board

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A frontend for make.fun's open bounties, built from plain static files with no build step. It opens on a board that leads with the money: the total in live pots, then one card per bounty with its pot first, then the entry fee, time left and entries. You can search the board and filter it by category. Each bounty also has its own page and leaderboard, and each entrant has a public profile, all read straight from make.fun's public API. It comes in a light theme and a dark theme. It stays fast because the first load is just one HTML page with inline CSS plus one script. Other views load only when you open them. API answers are cached and revalidated by ETag, and live updates change only the DOM nodes whose values changed.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (add `--port <n>` to use a different port). Use Node 22.18 or later, which runs `.ts` files directly; on older 22.x versions, add `--experimental-strip-types`.

## Themes

The page is warm off-white with white cards and near-black text in the light theme, and deep ink with slightly lighter cards in the dark theme. Pots are money green in both, the only accent color. Bounties in their last 24 hours get an amber top rule and an amber countdown. The font is the system UI stack, with tabular numerals so money and countdowns line up. Body text contrast is at least 5.6:1 in both themes.

Every color is a CSS variable set once with `light-dark()` in `app/index.html`, so each theme is one `color-scheme` value and no rule is written twice. The theme follows the system setting (`prefers-color-scheme`) until you pick one with the half-circle button at the right of the top bar (`themeToggle` in `app.js`), which remembers your choice in `localStorage`. A `?theme=dark` or `?theme=light` hint in the URL forces a theme without saving it (e.g. `/?theme=dark#/bounty/<slug>`; on the board, `#theme=dark` also works). A small script in `<head>` applies the hint or saved choice before the first paint.

## How it is built

Four hash routes, all handled by `route()` in `app/app.js`:

- `#/`: the board (`renderBoard`, in `app.js`). A headline gives the total in live pots, how many bounties are open and when the next one closes. The top bar holds a search box, category chips, a sort menu and a "No fee" toggle on one row. A bounty counts as closed once its deadline passes, even while the API still says open, and its card flips at that moment
- `#/bounty/<slug>`: one bounty with its live pot, dates, rules and rewards table (`renderBounty`, in `bounty.js`)
- `#/bounty/<slug>/leaderboard`: the pot, paid places and top prize, then the ranked entries, each linking to the entrant's profile (`renderLeaderboard`, in `leaderboard.js`)
- `#/u/<handle>`: a public profile, with the person's record (prizes won, entered, placed, won, podiums, best place) and their entries (`renderProfile`, in `profile.js`)

In the rewards table, the leaderboard and the profile's entries, places 1 to 3 get a green badge, solid for first. Money is right-aligned. The router ignores anything after `?` or `&` in the hash, so a theme hint never changes the route.

The first load is 2 files: `index.html` and `app.js`, 18,536 bytes raw or 7,427 bytes gzip-9, including both themes. The three other views add 18,263 bytes raw (7,776 gzip-9) between them, fetched only when opened.

Speed techniques, named as they are in the code:

- **`import()` per view**: only the board and router load up front. `bounty.js`, `leaderboard.js` and `profile.js` load the first time you open one of those views.
- **`cachedFetch`**: keeps each API answer in memory and in `sessionStorage`, merges requests already in flight for the same path, and revalidates stale copies by ETag through the HTTP cache. If the ETag hasn't changed, it reuses the copy it already parsed. It retries once on a 5xx error.
- **`patchList` / `patchText`**: keyed DOM updates. Existing cards and rows are kept, moved only when out of place, and their text is rewritten only when it changed. A value that changes flashes briefly.
- **`timeLeftTicker`**: a single one-second interval updates every `[data-ends]` countdown on the page. On the board, a pulsing dot beside "Time left" marks the countdowns that are live.
- **`livePot`**: on a bounty page, one `EventSource` on make.fun's live stream signals new entries and fees. The page then re-reads the detail at most once a minute, and falls back to 60-second polling if the stream drops. The board itself revalidates every 60 seconds.
- **Small shaped payloads**: the board and leaderboard trim API answers before caching them (`leaderboardApi` asks for `?rows=first`). `pageLeaderboard` shows 50 rows at a time and the profile shows 20 entries at a time.
- **Inline CSS and `preconnect`** to make.fun in `index.html`, so nothing blocks the first paint. Both themes are in the same variables, so dark mode costs no extra rules.
- **`perfMeter`**: the footer shows this visit's requests and bytes, measured by the Performance API, plus how many API calls the cache saved.

`node main.ts` packages `app/` and `screenshots/` with `dossier.json` for judging (set `MAKEFUN_OUTPUT_DIR=out` to write it somewhere other than `/output`). It first checks that `app/index.html` exists and that `screenshots/` holds 1 to 3 `.jpg` or `.png` files of at most 256 KiB each, and stops with a message if not. When it is done, it prints one line: the files copied, the screenshots and the size of `dossier.json`.
