/* Foul Play FC · js/party/skins.js
   Character skins and skin codes.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- skins ---------- */
const SKIN_OPTS = {
  skinTone: ['#f6d2b4', '#edc09a', '#d9a477', '#c58c5e', '#a8714a', '#8a5a37', '#6e432a', '#4f2f1d'],
  hair: ['Buzz', 'Crop', 'Curls', 'Bun', 'Mohawk', 'Long', 'Bald', 'Afro', 'Spiky', 'Twin tails'],
  hairColour: ['#1b120c', '#3a2416', '#6b4a2a', '#a36b3a', '#c9a050', '#e6d3a3', '#8e1f1f', '#d65a8a', '#4f7fd9', '#e8e8e8', '#2f9f4f', '#ffcc33', '#d63030', '#ff7ab8'],
  facial: ['None', 'Stubble', 'Beard', 'Moustache'],
  trim: ['#ffffff', '#111111', '#ffd23f', '#ff4d6d', '#5ccf6a', '#6fc4ff', '#c9a0ff', '#ff9f43', '#d8dde0', '#0b6e4f'],
  sleeves: ['Short', 'Long'], socks: ['Plain', 'Hoops', 'Stripes'],
  boots: ['#151515', '#f4f4f0', '#ff4d6d', '#ffd23f', '#5ccf6a', '#6fc4ff', '#ff9f43', '#c9a0ff'],
  accessory: ['None', 'Headband', 'Wristbands', 'Sunglasses', 'Mask', 'Hood', 'Hat', 'Glasses'],
  celebration: ['Knee slide', 'Aeroplane', 'Backflip', 'Robot dance', 'Shush the crowd', 'Cup to ear'],
  trail: ['#4fd6ff', '#ff7a2f', '#ffd23f', '#ff4d6d', '#5ccf6a', '#c9a0ff'],
  build: ['Slim', 'Regular', 'Stocky']
};
function sanitizeSkin(o) {
  o = o && typeof o === 'object' ? o : {};
  const i = (k, n, d) => { const v = Math.round(+o[k]); return Number.isFinite(v) && v >= 0 && v < n ? v : d; };
  const num = Math.round(+o.number);
  return { v: 1, skinTone: i('skinTone', 8, 2), height: clamp(Math.round(+o.height) || 0, -6, 6), build: i('build', 3, 1), hair: i('hair', 8, 1), hairColour: i('hairColour', 10, 1),
    facial: i('facial', 4, 0), trim: i('trim', 10, 0), sleeves: i('sleeves', 2, 0), socks: i('socks', 3, 0), boots: i('boots', 8, 0),
    number: num >= 1 && num <= 99 ? num : 10, accessory: i('accessory', 5, 0), celebration: i('celebration', 6, 0), trail: i('trail', 6, 0) };
}
function randomSkin() { const r = n => Math.floor(Math.random() * n); return sanitizeSkin({ skinTone: r(8), height: r(13) - 6, build: r(3), hair: r(8), hairColour: r(10), facial: r(4), trim: r(10), sleeves: r(2), socks: r(3), boots: r(8), number: 1 + r(99), accessory: r(5), celebration: r(6), trail: r(6) }); }
let MY_SKIN = sanitizeSkin(store.get('fpfc-skin') || randomSkin());
const SKIN_KEYS = ['skinTone', 'height', 'build', 'hair', 'hairColour', 'facial', 'trim', 'sleeves', 'socks', 'boots', 'number', 'accessory', 'celebration', 'trail'];
function skinCode(sk) { return SKIN_KEYS.map(k => (k === 'height' ? sk[k] + 6 : sk[k]).toString(36)).join('.').toUpperCase(); }
function parseSkinCode(code) {
  const parts = String(code || '').trim().toLowerCase().split('.'); if (parts.length !== SKIN_KEYS.length) return null;
  const o = {}; SKIN_KEYS.forEach((k, i) => { const v = parseInt(parts[i], 36); o[k] = k === 'height' ? v - 6 : v; });
  return sanitizeSkin(o);
}
function applySkin(p, sk) {   // a human's look replaces the slot's default look (team colours stay the shirt base)
  if (!p) return;
  if (!sk) { p.skinData = null; return; }
  p.skinData = sk; p.skin = SKIN_OPTS.skinTone[sk.skinTone]; p.hair = SKIN_OPTS.hairColour[sk.hairColour]; p.num = sk.number;
  p.trailCol = SKIN_OPTS.trail[sk.trail]; p.celebration = sk.celebration;
}
