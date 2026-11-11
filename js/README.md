# Game code

The game is plain JavaScript with no build step. `index.html` holds the page (menus, overlays, the canvases) and loads the files below in order. The styles live in `../css/game.css`.

## How the files fit together

Every file except `render/render3d.js` is a **classic script**, and they all share one global scope. A `const`, `let` or `function` declared at the top level of one file can be used by name in any other file. Each file starts with `'use strict';`.

There is one rule to follow. Code that **runs while a file loads** can only use names from files **earlier in the load order** (the `<script>` list in `index.html`): top-level statements, and `const x = f()` initialisers. Code inside functions runs later (each frame, on a key press, at kick-off), so it can use anything from any file. When you add a new file, add a `<script>` tag for it in `index.html`. If it only declares functions and constants, any position works; put it next to its neighbours in the same folder.

`render/render3d.js` is an ES module. `render/view.js` loads it with `import('./render3d.js')` at start-up; it is the only view, and everything else on screen (HUD, labels, aim guides) is drawn on a 2D canvas laid over it. It receives everything it needs as arguments to `createRenderer3D(canvas, G)` (see `setGraphics`) and never reads game globals directly. Dynamic imports in classic scripts resolve relative to the importing file, so `ui/creator.js` uses `import('../render/render3d.js')`.

## Folders

| Folder | What's in it |
|---|---|
| `core/` | `config.js`: constants, the 2D drawing space (`LW`×`LH`), pitch formats (`FORMATS`, `applyFormat`), referee vision (`REF_VIS`), `ITEM_LABEL`, math helpers (`rand`, `clamp`, `dist`, `angDiff`), the 2D projection and camera. `input.js`: `ACTIONS`, default keys, saving and migrating them (`BINDS_VERSION`). `audio.js`: `whistle`, `sfx`, crowd noise |
| `match/` | `state.js`: the state `S`, `makePlayer`, player predicates (`onPitch`, `onBench`, `able`), `newMatch`, `kickoff`. `feedback.js`: feed messages, floating text, particles, mood, charge, karma, cheers, animation helpers. `fouls.js`: base attacks landing (`doFoul`), injuries, sand, what referees see (`sees`, `watched`), `callFoul` and cards. `scoring.js`: `goal`, full time, results. `teams.js` (team names and kit colours: `SETUP`, `applyTeams`, synced online with `teamsSnap`), `var.js` (VAR check and bribery on red cards), `shootout.js`, `awards.js`, and `report.js` (metrics `M`/`EV` and the end-of-match report) |
| `mechanics/` | How football is played: `passing.js` (power, assist cone, long and through balls), `shooting.js`, `tackles.js` (jumps, tackles, slides, volleys and headers), `referee-carry.js`, `setpieces.js` (free kicks and penalties), `ball-extras.js` (woodwork, body blocks), `combat.js` (rage meter and Overdrive, each character's tackle `tackleMove`, enforcer and speedster traits, scorch and ice patches, hitstop, dizzy spins), `dribbling.js` (close control with touches, and how a loose ball rolls, skids and bounces: `dribble`, `rollBall`, `bounceBall`), `ai.js` (bots), `control.js` (keyboard, touch and network input; human players), `referee-mode.js`, and `simulation.js`, which holds `update(dt)`: movement, ball physics, referees and collisions |
| `abilities/` | The 12 classes: `classes.js` (data, synergies, line-ups, assigning), `buffs.js`, `aiming.js` (aim assist: `assistPick`, `castAim`, which the aim guide draws too), `skills.js` (`castSkill` and every effect in `SKILL_FX`), `weapons.js` (the base attack: `attackPlan`, `baseAttack`, and ranged weapons), `update.js` (per-frame class logic, attack lunges), `bot-skills.js` |
| `player/` | `player.js`: the player's loadout, one place to extend weapons and abilities. `defineWeapon` (melee or ranged: reach, damage, knockback, stun, projectile, hit effect, in-hand drawing), `weaponOf`, `giveWeapon`; `defineAbility`, `setClassAbility` (change a class's skill for everyone), `setPlayerAbility` (give one player an ability for the match), `ABILITIES` (every castable skill). The sword, bat, slingshot and foam blaster are defined here. `defineClass` adds a whole class with passives (`mods`). `creatures.js`: six creature classes (Cinderwyrm, Hollow, Bulwark, Brawn, Shogun, Ronin) built with these. `models.js`: `CLASS_MODELS`, which swaps a class's blocky model for a `.glb` from `models/` with animations (see `models/README.md`) |
| `items/` | `field-items.js`: `FIELD_ITEMS` (the five items that reach the pitch), `ITEM_COL`, crowd gifts (`throwItem`), `pickup`, power-ups and throwables. `bench.js`: the team benches for red-carded players |
| `party/` | `arenas.js` (hazard pitches: Volcano, Power Plant, Swamp), `ball-mods.js` (crates, volt and iron balls, bicycle-kick rings), `mutators.js`, `effects.js` (`fxEvent`/`playFx`, whack bursts, fire trails, camera effects, `fxTick`), `replay.js`, `crowd.js`, `bounties.js`, `taunts.js`, `spectators.js`, `skins.js` |
| `anomalies/` | `anomalies.js` (`ANOM_LIST`, `startAnomaly`, each anomaly, `anomSnap`) and `draw.js` |
| `render/` | `canvas.js` (overlay helpers: shapes, label pills, chants, `drawIcon`, `ballLanding`), `hud.js` (scoreboard, panels, minimap, aim lines, whacks, fire), `setpieces-draw.js`, `abilities-draw.js` (class effects, hotbar), `view.js` (`setGraphics`, `view3d`: the data handed to the 3D renderer each frame, and `draw`), `render3d.js` (three.js: stadium, benches, player rigs, items, effects, cameras, creator preview) |
| `ui/` | `shell.js` (`resize`: full window, wider screens see more; overlays; pace and key settings), `guide.js` (How to play), `settings.js` (`renderOpts`, the Game tab), `menus.js` (starting and pausing matches, touch controls), `setup.js` (the pre-match screen: teams, sides, classes), `admin.js` (Playground panel), `creator.js`, `catalog.js`, `lobby.js` |
| `net/` | Online play: `peer.js` (PeerJS rooms, the `$` helper), `relay.js` (fallback through `server.py`), `host.js`, `join.js`, `roster.js` (the lobby: character cards, bot class picks in `NET.meta.bots`, ready-up), `sync.js` (host snapshots `sendSnap`/`applySnap`, and `sendInput`) |
| `main.js` | Spectator buttons, the `?debug` hook (`window.__fpfc`), the main loop and start-up. Loaded last |

## Where things happen each frame

The main loop is `loop` in `main.js`. On the host or offline it calls `update(dt)` (`mechanics/simulation.js`); on an online player's machine it calls `clientUpdate(dt)` (`net/sync.js`) instead. After that, every machine runs `updateCamFx` and `fxTick` (visual-only effects), then `followCamera` and `draw`.

Only the host simulates. A player's machine draws snapshots, so anything that changes game state belongs in `update` and its helpers. To make something visible to online players, add it to the snapshot in `sendSnap` and read it back in `applySnap`. Player fields are a positional array, so append new ones at the end.

One-off visual effects that every machine should play, such as goals, cards and whack bursts, go through `fxEvent(type, player, extra)`. The host records the event, the snapshot carries it, and each machine runs `playFx`.

## Recipes

**Add a field item** (something the crowd or a bench can throw onto the pitch):
1. In `items/field-items.js`, add its id to `FIELD_ITEMS` and a colour to `ITEM_COL`; add a name to `ITEM_LABEL` in `core/config.js`.
2. Say what picking it up does in `pickup`, or for a timed effect in `applyPowerup` (and add it to `POWERUPS`).
3. Draw it: a mesh in `makeItem` (`render/render3d.js`) and an icon for the HUD in `drawIcon` (`render/canvas.js`). Without a mesh you get a glowing gem in its colour.
4. If it stores a count on the player (like `p.items.sword`), add it to `makePlayer` and to the snapshot.

**Add a weapon:** one `defineWeapon({ id, name, kind: 'melee' | 'ranged', ... })` call in `player/player.js` (the comment at the top lists every option). Fouls, the hotbar, bots, pick-ups, online sync and the 3D hand mesh all read the registry. To let it land on the pitch, also add its id to `FIELD_ITEMS`, and give it an icon in `drawIcon` if you like.

**Add an ability:** `defineAbility({ id, name, cd, aim, range, desc }, effect)` in `player/player.js`, then put it in a class with `setClassAbility(classId, slot, id)` or give it to one player with `setPlayerAbility(p, slot, id)`.

**Add an anomaly:** in `anomalies/anomalies.js`, add `[id, name, description]` to `ANOM_LIST`, a start function to the table in `startAnomaly`, its per-frame logic in `updateAnomalies` and its fields in `anomSnap`. Draw it in `anomalies/draw.js`. The settings screen picks it up from `ANOM_LIST` automatically.

**Add a class or skill:** add an entry to `CLASSES` (`abilities/classes.js`) and an effect for each new skill id in `SKILL_FX` (`abilities/skills.js`). The catalog, the hotbar and bot skill use all read from `CLASSES`.

**Add a key action:** add `[id, label]` to `ACTIONS` and default keys for both players in `core/input.js`, and the action to a `BIND_GROUPS` group (`ui/shell.js`) so it can be rebound. Read it in `localInput` and `readInput` (`mechanics/control.js`; add a counter in `sendInput` for online play) and act on it in `humanControl`. If new defaults would clash with saved keys, bump `BINDS_VERSION` and migrate in `loadBinds`.

**Add a setting:** keep the value in a `let` with a `store.get`/`store.set` key (see `REF_VIS` in `core/config.js`), add a `field-group` to the settings markup in `index.html`, and render its buttons in `renderOpts` (`ui/settings.js`).

**Debugging:** open the game with `?debug` in the URL. `window.__fpfc` then exposes the state `S` and helpers such as `admin`, `startAnomaly`, `castSkill`, `whack`, `setPiece` and `passPreview`.
