/* Foul Play FC · js/match/teams.js
   Team names and colours: the saved choice, applying it everywhere (HUD, kits, crowd, lobby, 3D), and the copy an online host sends.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

// Kit colours to choose from. Each team keeps its own shorts; socks are a darker shade of the shirt.
const TEAM_COLS = ['#3fa9ff', '#ff6a3d', '#5ccf6a', '#ffd23f', '#c45cff', '#ff4d9a', '#2fd4c4', '#e8e2d0', '#ff3b3b', '#7a8cff', '#f28c28', '#9aa8b4'];
const TEAM_DEFAULT = [{ name: 'Harbor Hounds', col: '#3fa9ff' }, { name: 'Ember Vipers', col: '#ff6a3d' }];
const cleanTeamName = (v, i) => { const s = String(v || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18); return s || TEAM_DEFAULT[i].name; };
const cleanTeamCol = (v, i) => /^#[0-9a-f]{6}$/i.test(v || '') ? v.toLowerCase() : TEAM_DEFAULT[i].col;
const teamShort = name => (name.split(' ').filter(Boolean).pop() || name).toUpperCase().slice(0, 9);
function shadeHex(hex, k) {   // k < 0 darkens, k > 0 lightens
  const n = parseInt(hex.slice(1), 16), f = c => Math.round(clamp(k < 0 ? c * (1 + k) : c + (255 - c) * k, 0, 255));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(c => f(c).toString(16).padStart(2, '0')).join('');
}
// The saved setup screen choices: team names and colours, which side player 1 plays for, and player 2's class.
let SETUP = (() => {
  const v = store.get('fpfc-setup') || {}, t = Array.isArray(v.teams) ? v.teams : [];
  return { teams: [0, 1].map(i => ({ name: cleanTeamName(t[i] && t[i].name, i), col: cleanTeamCol(t[i] && t[i].col, i) })), side: v.side === 1 ? 1 : 0, p2: typeof v.p2 === 'string' ? v.p2 : 'striker' };
})();
if (SETUP.teams[0].col === SETUP.teams[1].col) SETUP.teams[1].col = SETUP.teams[0].col === TEAM_DEFAULT[1].col ? TEAM_DEFAULT[0].col : TEAM_DEFAULT[1].col;
function saveSetup() { store.set('fpfc-setup', SETUP); }

// Put a pair of {name, col} into TEAM and everything that shows it. Returns true if a colour changed.
function applyTeams(teams) {
  let colChanged = false;
  teams.forEach((t, i) => {
    const name = cleanTeamName(t.name, i), col = cleanTeamCol(t.col, i), T = TEAM[i];
    if (T.col !== col) colChanged = true;
    T.name = name; T.short = teamShort(name); T.col = col; T.socks = shadeHex(col, -0.45);
  });
  document.documentElement.style.setProperty('--hounds', TEAM[0].col); document.documentElement.style.setProperty('--vipers', TEAM[1].col);
  for (const i of [0, 1]) { const h = document.getElementById('on-tname' + i); if (h) h.textContent = TEAM[i].name; }
  if (colChanged) {
    if (typeof buildCrowd2D === 'function') buildCrowd2D();
    if (typeof R3 !== 'undefined' && R3) { try { R3.dispose(); } catch (e) {} R3 = null; if (GFX3D) setGraphics(true); }   // kits are baked into the 3D models
  }
  return colChanged;
}
const teamsSnap = () => TEAM.map(t => [t.name, t.col]);
function applyTeamsSnap(tm) {   // an online player takes the host's teams (their own saved choice comes back in the menu)
  if (!Array.isArray(tm) || tm.length !== 2) return;
  if (tm.every((t, i) => Array.isArray(t) && t[0] === TEAM[i].name && t[1] === TEAM[i].col)) return;
  applyTeams(tm.map(t => ({ name: t && t[0], col: t && t[1] })));
}
applyTeams(SETUP.teams);
