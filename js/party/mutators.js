/* Foul Play FC · js/party/mutators.js
   Party mutators (big heads, low gravity and so on).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- party mutators ---------- */
const MUT_LIST = [['bigHead', 'Big heads'], ['bananaRain', 'Banana rain'], ['noRef', 'No referee'], ['lowGrav', 'Low gravity'], ['sprint', 'Super sprint'], ['noPowerups', 'Classic gifts only']];
let MUT_PREF = (() => { const v = store.get('fpfc-mut'); return v && typeof v === 'object' ? v : {}; })();
let MUT = {};
const GRAV = () => MUT.lowGrav ? 450 : 900;
function applyMutators() { MUT = {}; for (const [k] of MUT_LIST) MUT[k] = !!MUT_PREF[k]; }
