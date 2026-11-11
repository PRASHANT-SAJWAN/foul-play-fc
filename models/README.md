# Character models

Put one `.glb` file per character here, then add a line for it in `js/player/models.js`.

**Format:** binary glTF (`.glb`), with the mesh, skeleton, textures and animations all in one file. glTF is the standard format for three.js and the web. If a model comes as FBX, OBJ, DAE or a `.gltf` with separate files, open it in Blender (free) and use File → Export → glTF 2.0 with the format set to "glTF Binary (.glb)". Zip files must be unpacked and converted first.

**What each model needs:**
- A rig (skeleton) if it should animate.
- Animation clips with clear names, for example Idle, Run, Sprint, Kick, Attack, Jump, Fall, Celebrate, Sit. Map them to game states in `js/player/models.js`; any state without a clip falls back to a similar one.
- Optional always-on loops that only move some bones, such as a wing flap or tail sway. List them under `loops` and they play on top of everything else.
- Optional: a material for the team colour (for example a scarf or band). Name it and set `teamMaterial`, and it's recoloured in each team's kit colour.
- Size and facing don't matter: the game scales each model to player height (`height`), and `rotY` turns it if it faces the wrong way. Every model is capped by `MODEL_LIMITS` in `js/player/models.js` (height 30–56, and at most 52 wide, wings and tails included; players are about 42 tall). A model wider than that is shrunk until it fits, so give a big wingspan a slightly higher `maxWidth` if it ends up too small.
- The match setup screen shows the selected class's model turning on a plinth, so you can check the size, colours and idle animation before kick-off.

**Budget:** about 5,000–15,000 triangles and 1–2 textures of 1024 px per character keeps 12+ players smooth. Draco or meshopt compression shrinks downloads.

**Credits:** `peasant_character.glb` (used for the Brawler) is "Peasant Character" by Inuciian, https://sketchfab.com/3d-models/peasant-character-df91025680a5433eb5917a466211dba1, licensed CC BY 4.0. Put a `credit` on each model's line in `js/player/models.js`; the game lists them under How to play → Credits.

**Licences:** only use models you made, commissioned, or whose licence allows use in your game (and, if the repo is public, allows sharing the files).
