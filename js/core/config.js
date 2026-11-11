/* Foul Play FC · js/core/config.js
   Constants, the 2D drawing space, pitch formats, referee vision settings, math helpers, the 2D projection and the camera.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const cv = document.getElementById('game'), ctx = cv.getContext('2d'), cv3 = document.getElementById('game3d');
// The 2D drawing space is always 760 tall; its width follows the screen's shape, so wider screens see more of the pitch.
let LW = 1280;
const LH = 760, GOAL_H = 48, MIN_AR = 4 / 3, MAX_AR = 3.6;
// Match formats. 5v5 plays on a pitch with four times the area of 3v3 (twice as long and wide), marked like a FIFA pitch.
const FORMATS = {
  '5v5': { label: '5v5 · full pitch', W: 2000, H: 1240, size: 5, goalHalf: 68, boxD: 300, boxHalf: 366, pen: 200, arc: 166, circle: 166, gaD: 100, gaHalf: 166,
    refRange: 560, refSpeed: 118, refDist: 240, shootRange: 420, gkRush: 210, dive: 95,
    roles: [null, [0.2, 0.27], [0.2, 0.73], [0.44, 0.5], [0.68, 0.42]], roleNames: ['Goalkeeper', 'Defender', 'Defender', 'Midfielder', 'Forward'], names: [0, 1, 2, 3, 4], slots: [4, 3, 1, 2] },
  '3v3': { label: '3v3 · small pitch', W: 1000, H: 620, size: 3, goalHalf: 62, boxD: 150, boxHalf: 140, pen: 110, arc: 70, circle: 70, gaD: 50, gaHalf: 85,
    refRange: 380, refSpeed: 92, refDist: 170, shootRange: 300, gkRush: 130, dive: 75,
    roles: [null, [0.26, 0.5], [0.62, 0.5]], roleNames: ['Goalkeeper', 'Defender', 'Forward'], names: [0, 1, 4], slots: [2, 1] }
};
let FORMAT = null, W = 2000, H = 1240, TEAM_SIZE = 5, GOAL_HALF = 68, BOX_D = 300, BOX_HALF = 366, PEN_X = 200, ARC_R = 166, CIRCLE_R = 166, GA_D = 100, GA_HALF = 166;
let REF_RANGE = 560, REF_SPEED = 118, REF_DIST = 240, SHOOT_RANGE = 420, GK_RUSH = 210, DIVE_REACH = 95, ARC_A = 0.92;
const REF_DISTS = [[0.5, '50%'], [0.75, '75%'], [1, '100%'], [1.3, '130%'], [1.6, '160%'], [2, '200%']];
const REF_WIDTHS = [[0.7, 'Narrow'], [1, 'Normal'], [1.35, 'Wide'], [1.8, 'Very wide']];
let REF_VIS = (() => { let v = null; try { v = JSON.parse(localStorage.getItem('fpfc-refvis')); } catch (e) {} v = v && typeof v === 'object' ? v : {};
  return { dist: REF_DISTS.some(d => d[0] === v.dist) ? v.dist : 1, width: REF_WIDTHS.some(d => d[0] === v.width) ? v.width : 1 }; })();
function setRefVis(k, val) { REF_VIS[k] = val; try { localStorage.setItem('fpfc-refvis', JSON.stringify(REF_VIS)); } catch (e) {} applyRefVis(); }
function applyRefVis() { if (S.mode === 'client') return; for (const r of S.refs || []) { r.range = REF_RANGE * REF_VIS.dist; r.fov = 1.3 * REF_VIS.width; } }
let ROLES = FORMATS['5v5'].roles, ROLE_NAMES = FORMATS['5v5'].roleNames, NAME_IDX = FORMATS['5v5'].names, HUMAN_SLOTS = FORMATS['5v5'].slots;
let FORMAT_PREF = (() => { try { const v = JSON.parse(localStorage.getItem('fpfc-format')); return FORMATS[v] ? v : '5v5'; } catch (e) { return '5v5'; } })();
function applyFormat(key) {
  const F = FORMATS[key] || FORMATS['5v5']; FORMAT = FORMATS[key] ? key : '5v5';
  W = F.W; H = F.H; TEAM_SIZE = F.size; GOAL_HALF = F.goalHalf; BOX_D = F.boxD; BOX_HALF = F.boxHalf; PEN_X = F.pen; ARC_R = F.arc; CIRCLE_R = F.circle; GA_D = F.gaD; GA_HALF = F.gaHalf;
  REF_RANGE = F.refRange; REF_SPEED = F.refSpeed; REF_DIST = F.refDist; SHOOT_RANGE = F.shootRange; GK_RUSH = F.gkRush; DIVE_REACH = F.dive; ARC_A = Math.acos((BOX_D - PEN_X) / ARC_R);
  ROLES = F.roles; ROLE_NAMES = F.roleNames; NAME_IDX = F.names; HUMAN_SLOTS = F.slots;
  CAM.x = W / 2; CAM.y = H / 2;
  if (R3) { try { R3.dispose(); } catch (e) {} R3 = null; GFX3D = false; setGraphics(); }
}
const UI = "'Barlow Condensed','Arial Narrow',sans-serif", DISP = "'Teko','Arial Narrow',Impact,sans-serif";
const TEAM = [
  { name: 'Harbor Hounds', short: 'HOUNDS', col: '#3fa9ff', shorts: '#eef3f7', socks: '#1f5f99' },
  { name: 'Ember Vipers', short: 'VIPERS', col: '#ff6a3d', shorts: '#1c1512', socks: '#8f2a10' }
];
const NAMES = [['Okafor', 'Lindqvist', 'Moreau', 'Sato', 'Brennan'], ['Vargas', 'Kowalski', 'Ndiaye', 'Rossi', 'Haddad']];
const NUMS = [1, 4, 5, 8, 9];
const SKIN = ['#f1c9a5', '#d9a477', '#b07a50', '#7a4a2c', '#5a3520'];
const HAIR = ['#1b120c', '#3a2416', '#6b4a2a', '#c9a050', '#0e0e0e'];
const ITEM_LABEL = { medkit: 'med kit', bat: 'bat', flash: 'flash powder', banana: 'bunch of bananas', sling: 'slingshot', blaster: 'foam blaster', sword: 'sword', ultcharge: 'ultimate charge' };
const FOUL_NAME = { skill: 'dirty skill', ranged: 'ranged attack', slide: 'sliding tackle', pound: 'ground pound', lasso: 'trip', kick: 'jump kick', throw: 'unsporting throw', foul: 'foul', ko: 'knockout', blind: 'sand throw', banana: 'banana drop' };
const HUMAN_COL = ['#ffd23f', '#6ff0c0', '#ff8fd8', '#9fb4ff', '#ffffff', '#ffb36b', '#b6ff6b', '#6be3ff', '#e0a3ff', '#ff7a7a'];

const W_ = () => W;   // the pitch width, where W is shadowed by a local
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = a => a[Math.floor(Math.random() * a.length)];
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
// World point -> overlay screen point. The 3D renderer swaps in its camera projection once it starts,
// so labels and text land on the 3D scene; until then nothing is drawn over the world.
let proj = () => ({ x: LW / 2, y: LH / 2, s: 1 }), R3 = null, GFX3D = false, gfxNote = '';
const CAM = { x: 1000, y: 620 };
function focusPoint() {
  const mine = S.humans.filter(h => !h.remote).map(h => S.players[h.pid]).filter(p => p && onPitch(p));
  if (mine.length) return { x: mine.reduce((s, p) => s + p.x, 0) / mine.length, y: mine.reduce((s, p) => s + p.y, 0) / mine.length };
  if (S.refHuman && S.refs[0]) return { x: S.refs[0].x, y: S.refs[0].y };
  return { x: S.ball.x, y: S.ball.y };
}
// The camera keeps the ball in the middle of the screen.
function followCamera(dt, snap) { const f = CAMFX.cut ? CAMFX.cut : CAMFX.orbit ? CAMFX.orbit : { x: S.ball.x, y: S.ball.y }, k = snap ? 1 : Math.min(1, dt * 6); CAM.x += (f.x - CAM.x) * k; CAM.y += (f.y - CAM.y) * k; }
