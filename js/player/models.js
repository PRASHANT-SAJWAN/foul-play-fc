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
*/
'use strict';

const CLASS_MODELS = {
  // cinderwyrm: { file: 'models/cinderwyrm.glb', height: 46, rotY: 0, anims: { idle: 'Idle', run: 'Run', sprint: 'Sprint', kick: 'Kick', attack: 'Attack', jump: 'Jump', fall: 'Fall', celebrate: 'Roar' }, loops: ['WingFlap', 'TailSway'], teamMaterial: 'Scarf' },
};
