# Game code

The game is plain JavaScript with no build step. `index.html` holds the page (menus, overlays, the canvases) and loads these files in order. The styles live in `../css/game.css`.

## How the files fit together

Every file except `render3d.js` is a **classic script**, and they all share one global scope. A `const`, `let` or `function` declared at the top level of one file can be used by name in any other file. Each file starts with `'use strict';`.

There is one rule to follow. Code that **runs while a file loads** can only use names from **earlier** files: top-level statements, and `const x = f()` initialisers. Code inside functions runs later (each frame, on a key press, at kick-off), so it can use anything from any file. If you add top-level code that needs something from a later file, either move it into the later file or into `17-main.js`, which loads last and starts the game.

`render3d.js` is an ES module, loaded with `import('./render3d.js')` only when the 3D view is turned on. It receives everything it needs as arguments to `createRenderer3D(canvas, G)` (see `setGraphics` in `13-draw.js`) and never reads game globals directly.

| File | What's in it |
|---|---|
| `01-core.js` | Constants, the 2D drawing space (`LW`×`LH`), pitch formats (`FORMATS`, `applyFormat`), referee vision settings, math helpers (`rand`, `clamp`, `dist`, `angDiff`), the 2D projection `proj2d` and the camera `CAM` |
| `02-input.js` | `ACTIONS`, default key bindings, saving and migrating them (`BINDS_VERSION`), key labels |
| `03-audio.js` | Web Audio: crowd noise, `whistle`, `sfx` |
| `04-match.js` | Match state `S`, `makePlayer`, `newMatch`, kick-offs, passing (`passTo`, `humanPass`, `throughBall`), shooting, tackles, fouls, `callFoul` and cards, `throwItem` and `pickup`, `goal`, results |
| `05-report.js` | Per-player metrics (`METRIC_KEYS`, `M`, `EV`), the end-of-match report (JSON, CSV, HTML) and saved history |
| `06-party.js` | Mutators, big-moment effects (`fxEvent`/`playFx`, whack bursts, fire trails), replays, crowd opinion, grudges and bounties, field items and power-ups (`FIELD_ITEMS`, `applyPowerup`, `useThrowable`), **the bench**, taunts, golden goal and shoot-outs, spectators, awards, skins |
| `07-anomalies.js` | `ANOM_LIST`, `startAnomaly`, each anomaly's start/update, network sync (`anomSnap`), drawing |
| `08-setpieces.js` | Free kicks and penalties: `setPiece`, `setPieceUpdate`, the curl solver `fkPlan`, woodwork and body blocks, set-piece drawing |
| `09-classes.js` | `CLASSES`, `SYNERGIES`, `LINEUPS`, skill effects `SKILL_FX`, `castSkill`, buffs, ranged weapons, bot skill use, the hotbar |
| `10-ai.js` | `botControl`: what bots do each frame |
| `11-control.js` | `readInput`/`localInput` (keyboard, touch, network), `humanControl`, referee mode |
| `12-update.js` | `update(dt)`: the simulation step (movement, ball physics, referees, collisions) |
| `13-draw.js` | The classic 2.5D view, `drawHUD`, overlays shared with 3D (`drawOverlays3D`), `setGraphics`, `view3d` (the data handed to the 3D renderer each frame), `draw` |
| `14-ui.js` | `resize` (full window, wider screens see more), menus and overlays, settings (`renderOpts`), key rebinding, How to play (`guideSections`) |
| `15-net.js` | Online play: PeerJS rooms, relay fallback, lobby roster, host snapshots (`sendSnap`) and their application on players (`applySnap`), input sending |
| `16-panels.js` | Playground admin panel (`admin`), character creator, class catalog, lobby extras |
| `17-main.js` | Spectator buttons, the `?debug` hook (`window.__fpfc`), the main loop and start-up |
| `render3d.js` | The three.js renderer: stadium, benches, player rigs, items, effects, cameras, and the creator preview |

## Where things happen each frame

The main loop is `loop` in `17-main.js`. On the host or offline it calls `update(dt)`; on an online player's machine it calls `clientUpdate(dt)` instead. After that, every machine runs `updateCamFx` and `fxTick` (visual-only effects), then `followCamera` and `draw`.

Only the host simulates. A player's machine draws snapshots, so anything that changes game state belongs in `update` and its helpers. To make something visible to online players, add it to the snapshot in `sendSnap` and read it back in `applySnap` (both in `15-net.js`). Player fields are a positional array, so append new ones at the end.

One-off visual effects that every machine should play, such as goals, cards and whack bursts, go through `fxEvent(type, player, extra)`. The host records the event, the snapshot carries it, and each machine runs `playFx`.

## Recipes

**Add a field item** (something the crowd or a bench can throw onto the pitch):
1. In `06-party.js`, add its id to `FIELD_ITEMS`, plus a name in `ITEM_LABEL` (`01-core.js`) and a colour in `ITEM_COL`.
2. Say what picking it up does in `pickup` (`04-match.js`), or, for a timed effect, in `applyPowerup` (also add it to `POWERUPS`).
3. Draw it: a 2D icon in `drawIcon` (`13-draw.js`) and a mesh in `makeItem` (`render3d.js`). Without a mesh you get a glowing gem in its colour.
4. If it stores a count on the player (like `p.items.sword`), add it to `makePlayer` and to the snapshot.

**Add an anomaly:** add `[id, name, description]` to `ANOM_LIST`, a start function to the table in `startAnomaly`, its per-frame logic in `updateAnomalies`, its fields in `anomSnap`, and its drawing in the anomaly drawing section. The settings screen picks it up from `ANOM_LIST` automatically.

**Add a class or skill:** add an entry to `CLASSES` (role, colours, passive, three skills and an ultimate) and an effect for each new skill id in `SKILL_FX`. The catalog, the hotbar and bot skill use all read from `CLASSES`.

**Add a key action:** add `[id, label]` to `ACTIONS`, default keys for both players to the default bindings, and the action to a `BIND_GROUPS` group (`14-ui.js`) so it can be rebound. Then read it in `localInput` and `readInput` (`11-control.js`, with a counter in `sendInput` for online play) and act on it in `humanControl`. If changing the defaults would clash with saved keys, bump `BINDS_VERSION` and handle the migration in `loadBinds`.

**Add a setting:** keep the value in a `let` with a `store.get`/`store.set` key (see `REF_VIS` in `01-core.js`), add a `field-group` to the settings markup in `index.html`, and render its buttons in `renderOpts`.

**Debugging:** open the game with `?debug` in the URL. `window.__fpfc` then exposes the state `S` and helpers such as `admin`, `startAnomaly`, `castSkill`, `whack`, `setPiece` and `passPreview`.
