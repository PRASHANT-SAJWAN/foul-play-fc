# Foul Play FC

A 2.5D five-a-side football game in the browser: foul anyone in reach, blind the referee, and earn gifts from the crowd.
Plain HTML and JavaScript: no build step and no backend. The game lives in `index.html`; the 3D view is in `render3d.js` and uses [three.js](https://threejs.org) from a CDN.

- **Graphics:** 3D (default) or Classic 2.5D, under **Pace and controls → Game**. The 3D view draws the same match with low-poly player models, a floodlit stadium, shadows and a broadcast camera that follows the ball. If WebGL isn't available, the game falls back to Classic automatically.

- **Full screen, any monitor:** the game fills the browser window at native resolution. Wider screens (16:10, 16:9, 21:9, 32:9) see more of the pitch from side to side; anything taller than 4:3 or wider than 3.6:1 is letterboxed.
- **Referee vision:** set the referee's vision distance (50% to 200%) and cone width in **Pace and controls → Game**, or the distance from the pause menu. Online, the host's setting is used.
- **Formats:** 5v5 on a full-size pitch (four times the area of 3v3, marked like a FIFA pitch) or 3v3 on a small pitch. The camera keeps the ball in the middle of the screen, with a mini-map at the bottom and an edge arrow to your player when they're off screen. One referee works inside the pitch.
- **Offline modes:** solo vs bots, 2 players on one keyboard (versus or co-op), watch the bots.
- **Online:** one person hosts and friends join with a 5-letter room code. Up to 10 people; bots fill the empty spots and both goalkeepers.
- **Players:** each has health, a rechargeable **stamina** bar (sprinting and shot power), and a **mood** (in the zone, tilted, meltdown). Hard fouls can **injure**, which caps stamina until a med kit heals it.
- **Party features:** crowd opinion meter with chants and banners, taunt wheel, 10 power-ups and throwables, goal replays, golden goal and penalty shoot-outs, bounties, grudges, post-match awards, party mutators, spectator cheers and gifts, lobby ready-up and rematch votes.
- **Your character:** a character creator with a 3D preview; your look is shared with everyone in the online lobby, or as a skin code.
- **Anomalies:** at random intervals, crowd fights, UFO abductions (players or the referee), pirates, pitch invasions, heatwaves and ice ages. Set how often with the anomaly meter (Off to Chaos) and pick which can happen in **Pace and controls → Game**, or change the meter from the pause menu.
- **Free kicks and penalties:** 15 seconds to set up under the real rules (9.15 m for defenders, attackers onside, everyone out of the box for penalties), a camera behind the ball in 3D, bot walls that jump, and an aim-assisted curling shot with a power sweet spot.
- **Physics:** curl and spin on the ball, bounces and rolling resistance, posts and crossbar, blocks off bodies and heads, and player momentum.
- **Classes:** 12 classes (Striker, Assassin, Speedster, Tank, Defender, Goalkeeper, Playmaker, Healer, Aura, Brawler, Trickster, Ranger), each with a passive, three skills and an ultimate on a hotbar, plus synergies and bot line-ups. Blocky characters with faces wear their class look by default. Full list in **Classes & skills** in the game and in [docs/feature-catalog.md](docs/feature-catalog.md).
- **Keyboard aiming:** everything aims along your movement direction, which turns smoothly instead of snapping, for steady passes and shots. Holding shoot or a pass key draws a direction line; pass assist only picks a team-mate you're facing (about 30°), and through balls have none.
- **Effects:** power shots leave a trail of fire on the grass, and hits land with animated comic-book "WHACK!" bursts. You can lock yourself to one character instead of switching team-mates.
- **Ranged weapons:** slingshots and foam blasters from the crowd.

### Default keys (player 1)

| Keys | Action |
|---|---|
| W A S D | Move and aim (the direction turns smoothly, so tap to fine-tune) |
| Left Shift | Sprint |
| Space | Shoot (hold to power) · jump without the ball · volley or header in the air |
| L | Short pass (hold to power) · switch player without the ball |
| J | Long pass (hold to power) · sliding tackle |
| K | Through ball along the ground (hold to power, no assist) · tackle |
| Q | Punch · jump kick in the air · fires a slingshot or blaster if you have one |
| E | Item: lift or throw the referee when next to them, otherwise your throwable |
| R | Sand at the referee |
| U I O | Class skills |
| P | Ultimate |
| T | Taunt (hold and pick a direction) |

Player 2 uses the arrows, Right Shift, `/` (shoot), `.` (short pass), `,` (long pass), `N` (through ball), `;` `'` `[`, 8 9 0, `-` and `]`. The full list is in **How to play** and **Pace and controls → Controls**.

Change them in **Pace and controls → Controls**; changes are saved in the browser. This layout replaces older custom keys once (a copy is kept in `fpfc-binds-old`).

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

### When a friend can't connect directly: the backup link

Some networks block direct browser-to-browser connections. For those players, the host can run the game on their computer with a Cloudflare link (`start-mac.command` / `start-windows.bat`, answer **Y**, or `python3 server.py --tunnel`).

- The host's lobby then shows a **backup link** like `https://….trycloudflare.com/?room=ABCDE`.
- Friends who open it (or paste it into the code box, even on GitHub Pages) join **the same room** as everyone else. Their messages go through the host's `server.py` and the Cloudflare tunnel instead of a direct connection.
- Players who join directly and players who join through the link play together; the lobby marks relayed players with "via link".
- A guest who opens the host's link and enters the code tries a direct connection first and switches to the link automatically if it fails.
- If the PeerJS matchmaking server is unreachable, a host on `server.py` can still open a link-only room.

The match still runs in the host's browser either way. Relayed players have a little more lag (their traffic passes through Cloudflare).

### Hosting from GitHub Pages with a relay

The host doesn't need to play from their computer for the backup link to work. Someone (usually the host) runs the relay on any computer, and the host plays on GitHub Pages:

1. Run `start-mac.command` / `start-windows.bat` and answer **Y** (or `python3 server.py --tunnel`). Copy the `https://….trycloudflare.com` link it prints, and keep that window open during the match.
2. On GitHub Pages, create the room. Paste the link into **Relay link (optional)** in the lobby and choose **Connect relay**.
3. The lobby shows a backup link like `https://<you>.github.io/foul-play-fc/?room=ABCDE&relay=xyz.trycloudflare.com`. Send it to friends who can't connect directly.

Friends who open it stay on GitHub Pages, try a direct connection first and fall back to the relay automatically. Everyone else keeps joining with the room code. The relay only forwards messages; it can't save match files for other sites.

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

- **The host has an advantage** (no lag) and could cheat, because the referee runs in their browser.
- **The host's tab must stay open and visible.** Browsers slow down background tabs, which freezes the match.
- **Some networks block direct connections** (strict corporate firewalls, some mobile carriers). PeerJS's public relay usually rescues them; if not, use the backup link above.
- **The public PeerJS server** is free and shared, with no uptime guarantee. If it's down, rooms can't be created or joined until it's back. You can run your own with `npx peerjs --port 9000` and point the game at it.
