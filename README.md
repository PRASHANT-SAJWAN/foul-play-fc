# Foul Play FC

A 2.5D five-a-side football game in the browser: foul anyone in reach, blind the referees, and earn gifts from the crowd.
Plain HTML and JavaScript: no build step and no backend. The game lives in `index.html`; the 3D view is in `render3d.js` and uses [three.js](https://threejs.org) from a CDN.

- **Graphics:** 3D (default) or Classic 2.5D, under **Pace and controls → Game**. The 3D view draws the same match with low-poly player models, a floodlit stadium, shadows and a broadcast camera that follows the ball. If WebGL isn't available, the game falls back to Classic automatically.

- **Formats:** 5v5 on a full-size pitch (four times the area of 3v3, marked like a FIFA pitch) or 3v3 on a small pitch. The camera keeps your player in the middle of the screen, with a mini-map at the bottom and an edge pointer to the ball.
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

## Run it on your computer (macOS or Windows)

Running locally also saves every finished match to `data-metric/` (see below). You need Python 3.7 or newer.

| | macOS | Windows |
|---|---|---|
| Start | Double-click **`start-mac.command`** | Double-click **`start-windows.bat`** |
| Python | Already on most Macs; otherwise [python.org](https://www.python.org/downloads/macos/) or `xcode-select --install` | [python.org](https://www.python.org/downloads/windows/) (tick "Add python.exe to PATH") or `winget install --id Python.Python.3.12 -e` |
| Cloudflare link (optional) | Offers `brew install cloudflared` | Offers `winget install --id Cloudflare.cloudflared -e` |

Both launchers start the game at http://localhost:8080, open it in your browser, and ask whether to share it online with a temporary Cloudflare link. With a link, friends open `https://….trycloudflare.com` and join your room with the code. The link changes every run and stops when you close the window.

The first time on macOS, if Finder says the file can't be opened, right-click it and choose **Open**. On Windows, SmartScreen may ask you to confirm: choose **More info → Run anyway**.

From a terminal instead:

```sh
python3 server.py --open            # macOS / Linux   (Windows: py server.py --open)
python3 server.py --open --tunnel   # plus a public Cloudflare link
python3 server.py --port 9000       # if 8080 is taken
```

### Match files

At full time the game writes all the match metrics into `data-metric/` in this folder:
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
