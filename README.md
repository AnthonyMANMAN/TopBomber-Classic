# TopBomber Classic — Netlify Edition

Game-style rankings dashboard, scheduled data collection, and archived daily snapshots.

## Deploy (recommended: Git repository)

1. Create a new GitHub repository, e.g. `TopBomber-Classic`.
2. Upload the **contents** of this project folder (keep `netlify.toml`, `public/`, `lib/`, and `netlify/functions/` together).
3. In Netlify: **Add new project → Import an existing project → GitHub**, select the repo.
4. Let Netlify read `netlify.toml`: publish directory `public`, functions `netlify/functions`. No build command required. Node 20+.
5. Deploy to production. Scheduled Functions only operate on production deploys.
6. Check **Logs → Functions → collect** after a scheduled run. The first scheduled run may take up to 15 minutes.
7. Browse your deployed site. Collection stores into Netlify Blobs automatically. Keep the same Netlify site when redeploying to retain its store.
8. To test manually on your own computer: install Node 20+, run `npm install`, `npx netlify login`, `npx netlify link`, then `npm run dev`. Visit localhost URL from CLI.

**Do not drag-and-drop only the `public` directory.** Static-only uploads cannot run the scheduled functions or store history. Use Git-integrated deployment.

## Game API / collection

Known endpoint: `https://gameofbombs.com/api/v3/stat/top?period=prev30days&filter=EU&sort=score&from=0&count=25&auth=b`.

The app assumes `period=today` and `period=all`, `sort=score|kills|hoarders` and filters `ALL|EU|US|RU|BR|Asia` (these values have not all been verified). Inspect function logs for rejected combinations. It *never* invents scores. Some API filters may be lowercase; edit `lib/config.js` once confirmed. **Check the live API before publicly promoting historical accuracy.**

Each scheduled run fetches **up to 25 players per board**, across 6 regions × 3 categories × 2 periods (36 boards) using 6 concurrent workers. This bounded default avoids hundreds of requests per run. For all 1,000 reported rows, implement a queue/background function and staggered page collection; simply raising the limit could exceed the Netlify execution limit or game rate limits. Individual failures are logged and do not replace good snapshots.

## Daily archive caveat

`GAME_TIMEZONE` defaults to `America/Toronto` and game day rollover is set to 19:00 local time. Reset is approximate. On an actual delayed or earlier reset, a snapshot could belong to the wrong date. The archived record is the **last successfully captured** snapshot of the game day, not a guarantee of the exact final official standings. History starts after deployment; historical data cannot be reconstructed automatically.

## Sprites and styling

`public/assets/ranks.png` is the user's supplied 16-pixel-wide vertical rank strip, using the first 16 cells for ranks 0–15. Original game charcoal/gold styles and row density are recreated in `public/css/game.css`.

## Privacy

No bsession cookie or login credential is stored or transmitted by our code. Only public leaderboard queries are issued. Public skin thumbnails are loaded from the game domain in browsers.

## Project files

- `netlify.toml` — deploy settings and `*/15 * * * *` schedule
- `netlify/functions/collect.mjs` — fetches and stores snapshots
- `netlify/functions/data.mjs` — public read-only API
- `lib/leaderboard.js` — API parsing, pagination, ALL fallback
- `lib/storage.js` — Netlify Blobs persistence
- `lib/config.js` — region/category and reset configuration
- `public/` — HTML, CSS and JS frontend
- `tests/` — basic parsing and reset tests

## Fixes for first-deploy 404 / empty history URLs

- A missing latest board is now fetched on-demand (up to 25 entries) and saved, rather than returning 404 before the first scheduled job. An upstream failure is shown as 503 with a reason.
- Archive view no longer calls `/api/history//...` when no dates exist. It displays an explanatory empty state.
- Scheduled collection uses 6 bounded workers instead of sequentially requesting 36 boards; each successful board is saved immediately.
- Deploy **the entire repository** through Netlify's Git integration. After deploy, open `/.netlify/functions/data/status` and check `collect` Function logs for errors.
- The game's endpoint may reject some combinations, or block calls from Netlify. If the first-load board shows 503, inspect function logs; this is separate from the route bug.
