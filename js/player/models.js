/* Foul Play FC · js/player/models.js
   Real 3D models for classes. Leave a class out and it keeps its blocky model.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order.

   Put a .glb file (binary glTF: mesh, skeleton, textures and animations in one file) in the
   models/ folder and add a line below. The 3D view loads it in the background, sizes it to
   player height, and plays the clip that matches what the player is doing. If the file is
   missing or fails to load, the blocky model stays.

     file:   path to the .glb, relative to index.html
     height: how tall the model stands in game units (players are about 42)
     rotY:   turn the model if it faces the wrong way (radians; Math.PI turns it round)
     y:      lift or lower it
     anims:  game state -> clip name in the file. States: idle, run, sprint, kick, attack, jump,
             slide, fall, celebrate, sit. Missing states fall back (sprint -> run, attack -> kick,
             slide/fall -> idle, sit -> idle).
     loops:  clips that always play on top, e.g. wing flaps or a tail sway that only move those bones
     teamMaterial: name of the material to recolour in the team's kit colour (optional)
     maxWidth: this model's own width limit, if it should differ from MODEL_LIMITS
     credit: who made it and the licence, shown in How to play → Credits (required for CC BY models)

   Without clips (or without one for a move) the whole model still moves: it bobs and leans when running,
   leans into attacks and kicks, tips over when knocked down, and breathes when idle. Without a
   teamMaterial, a ring in the team's colour at its feet tells the two sides apart.

   Size limits (MODEL_LIMITS) apply to every model: height is kept between minHeight and maxHeight,
   and if the model is wider or longer than maxWidth (wingspan, tail) it is shrunk until it fits.
   Players are about 42 tall and 20 wide; these are visuals only, so hit areas don't change.
*/
'use strict';

const MODEL_LIMITS = { minHeight: 30, maxHeight: 56, maxWidth: 52 };

const CLASS_MODELS = {
  // cinderwyrm: { file: 'models/cinderwyrm.glb', height: 46, anims: { idle: 'Idle', run: 'Run', kick: 'Kick', attack: 'Attack' }, loops: ['WingFlap', 'TailSway'], teamMaterial: 'Scarf' },
  brawler: { file: 'models/peasant_character.glb', height: 42, credit: '"Peasant Character" by Inuciian (sketchfab.com/Inuciian), CC BY 4.0' },
};
