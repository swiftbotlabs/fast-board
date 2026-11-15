# fast-board

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/swiftbotlabs/fast-board/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A frontend for make.fun's open bounties, built from plain static files with no build step. It shows a board of live pots, entry fees and countdowns, a page for each bounty, its leaderboard, and public profiles, all read straight from make.fun's public API. It stays fast because the first load is just one HTML page with inline CSS plus one script. Other views load only when you open them. API answers are cached and revalidated by ETag, and live updates change only the DOM nodes whose values changed.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (add `--port <n>` to use a different port). Use Node 22.18 or later, which runs `.ts` files directly; on older 22.x versions, add `--experimental-strip-types`.

## How it is built

Four hash routes, all handled by `route()` in `app/app.js`:

- `#/`: the board (`renderBoard`, in `app.js`)
- `#/bounty/<slug>`: one bounty with its rewards and rules (`renderBounty`, in `bounty.js`)
- `#/bounty/<slug>/leaderboard`: the ranked entries (`renderLeaderboard`, in `leaderboard.js`)
- `#/u/<handle>`: a public profile (`renderProfile`, in `profile.js`)

The first load is 2 files: `index.html` and `app.js`, 16,236 bytes raw or 6,492 bytes gzip-9. The three other views add 17,161 bytes raw (7,317 gzip-9) between them, fetched only when opened.

Speed techniques, named as they are in the code:

- **`import()` per view**: only the board and router load up front. `bounty.js`, `leaderboard.js` and `profile.js` load the first time you open one of those views.
- **`cachedFetch`**: keeps each API answer in memory and in `sessionStorage`, merges requests already in flight for the same path, and revalidates stale copies by ETag through the HTTP cache. If the ETag hasn't changed, it reuses the copy it already parsed. It retries once on a 5xx error.
- **`patchList` / `patchText`**: keyed DOM updates. Existing cards and rows are kept, moved only when out of place, and their text is rewritten only when it changed. A value that changes flashes briefly.
- **`timeLeftTicker`**: a single one-second interval updates every `[data-ends]` countdown on the page.
- **`livePot`**: on a bounty page, one `EventSource` on make.fun's live stream signals new entries and fees. The page then re-reads the detail at most once a minute, and falls back to 60-second polling if the stream drops. The board itself revalidates every 60 seconds.
- **Small shaped payloads**: the board and leaderboard trim API answers before caching them (`leaderboardApi` asks for `?rows=first`). `pageLeaderboard` shows 50 rows at a time and the profile shows 20 entries at a time.
- **Inline CSS and `preconnect`** to make.fun in `index.html`, so nothing blocks the first paint.
- **`perfMeter`**: the footer shows this visit's requests and bytes, measured by the Performance API, plus how many API calls the cache saved.

`node main.ts` packages `app/` and `screenshots/` with `dossier.json` for judging (set `MAKEFUN_OUTPUT_DIR=out` to write it somewhere other than `/output`).
