# Foul Play FC

A 2.5D five-a-side football game in the browser: foul anyone in reach, blind the referees, and earn gifts from the crowd.
Plain HTML and JavaScript in a single `index.html`: no build step and no backend.

- **Offline modes:** solo vs bots, 2 players on one keyboard (versus or co-op), watch the bots.
- **Online:** one person hosts and friends join with a 5-letter room code. Up to 10 people; bots fill the empty spots and both goalkeepers.

## How online play works

```
        ┌──────────── Host's browser ────────────┐
        │  game logic + the "true" game state    │
        └───▲──────────────▲──────────────▲──────┘
            │ WebRTC       │ WebRTC       │ WebRTC
        Player 2       Player 3       Player 4
```

- **The host's browser is the server.** It keeps the roster and the game state in memory, runs the simulation (physics, bots, referees, foul detection), and sends a snapshot to every player about 20 times a second.
- **Players send only their inputs** (movement plus button presses) and draw the snapshots they receive, smoothed between updates.
- **Room codes** use [PeerJS](https://peerjs.com). The room code becomes the host's peer ID on the free public PeerJS server (`0.peerjs.com`). That server only introduces browsers to each other; game traffic then goes directly between browsers over WebRTC.
- **Nothing is stored anywhere.** When the host closes the tab, the room is gone and players return to the lobby.

## Host it on GitHub Pages

1. Create an empty **public** repository on GitHub, e.g. `foul-play-fc`.
2. Push this folder:
   ```sh
   git remote add origin https://github.com/<your-username>/foul-play-fc.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.**
4. After a minute the game is live at `https://<your-username>.github.io/foul-play-fc/`.

To play: everyone opens that link. The host chooses **Play online → Create room** and shares the code; friends choose **Join room**.

## Optional: share straight from your computer (Cloudflare tunnel)

`host.sh` runs `server.py` (so matches are saved to `data-metric/` on your Mac) and opens a free, temporary Cloudflare **quick tunnel**: a public `https://….trycloudflare.com` link to the game on your Mac.
It's handy for testing changes with friends before pushing to GitHub. Rooms work the same way.

```sh
./host.sh          # installs cloudflared via Homebrew if needed (asks first)
```

The link changes on every run and stops working when you press Ctrl+C.

## Run locally (saves every match to `data-metric/`)

```sh
python3 server.py            # then open http://localhost:8080
```

`server.py` serves the game and, at full time, writes all the match metrics into `data-metric/` in this folder:
a `.json` (raw: every metric, rating and the event timeline), an `.html` report and a `.csv` per match, plus
`index.html` (every match), `index.json` and `all-players.csv` (every player row from every match).
See `data-metric/README.md`. Match files stay out of git.

On GitHub Pages (or any other static host) the game can't write to your disk, so the full-time screen offers
**Save match report / raw data / player table** download buttons instead, plus an optional auto-download
under **Pace and controls → Match files**.

To try online play alone, create a room in one browser window and join it from another.

## Known limits

- **The host has an advantage** (no lag) and could cheat, because the referees run in their browser.
- **The host's tab must stay open and visible.** Browsers slow down background tabs, which freezes the match.
- **Some networks block direct connections** (strict corporate firewalls, some mobile carriers). Joining then times out with a message. Fixing that needs a TURN relay server (e.g. Cloudflare Calls TURN or a self-hosted coturn), which would require a small backend to issue credentials.
- **The public PeerJS server** is free and shared, with no uptime guarantee. If it's down, rooms can't be created or joined until it's back. You can run your own with `npx peerjs --port 9000` and point the game at it.
