# data-metric

Match metrics from Foul Play FC. `server.py` writes here automatically at full time.

| File | What it holds |
|---|---|
| `<match>.json` | Raw data for one match: meta, teams, every player's metrics and ratings, balance notes and the full event timeline (schema `foulplayfc.match.v1`). |
| `<match>.html` | Readable report for that match. Open it in a browser. |
| `<match>.csv` | One row per player for that match. |
| `index.html` | Every saved match, newest first, with links to each report. |
| `index.json` | One summary per match. |
| `all-players.csv` | Every player row from every match, with a `match` column. Good for spreadsheets and charts. If the set of metrics changes in a game update, the old file is kept as `all-players-until-<date>.csv`. |

`<match>` looks like `foulplayfc-2026-11-10-153012-hounds-2-1-vipers`.

Match files are not committed to git (see `.gitignore`). Remove the `data-metric` lines there if you want to version them.
