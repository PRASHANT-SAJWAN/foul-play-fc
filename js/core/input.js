/* Foul Play FC · js/core/input.js
   Actions and key bindings: defaults, saving, migration between layouts, key labels.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- input ---------------- */
const ACTIONS = [['up', 'Move up'], ['down', 'Move down'], ['left', 'Move left'], ['right', 'Move right'], ['sprint', 'Sprint'],
  ['shoot', 'Shoot (hold) · jump without the ball · volley or header in the air'], ['pass', 'Short pass (hold for power) · switch player without the ball'], ['lpass', 'Long pass (hold for power) · sliding tackle'], ['through', 'Through ball along the ground (hold for power) · tackle'], ['view', 'Free kicks: switch between the view behind the ball and the side view'],
  ['foul', 'Punch · jump kick in the air · fire a weapon'], ['item', 'Item: lift or throw the referee when next to them, otherwise throwables'], ['blind', 'Sand at the referee'],
  ['skill1', 'Skill 1'], ['skill2', 'Skill 2'], ['skill3', 'Skill 3'], ['ult', 'Ultimate'], ['taunt', 'Taunt (hold + direction)']];
const BINDS_VERSION = 7;
const DEFAULT_BINDS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', shoot: 'Space', pass: 'KeyL', lpass: 'KeyJ', through: 'KeyK', view: 'KeyV',
    foul: 'KeyQ', item: 'KeyE', blind: 'KeyR', skill1: 'KeyU', skill2: 'KeyI', skill3: 'KeyO', ult: 'KeyP', taunt: 'KeyT' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', sprint: 'ShiftRight', shoot: 'Slash', pass: 'Period', lpass: 'Comma', through: 'KeyN', view: 'Backslash',
    foul: 'Semicolon', item: 'Quote', blind: 'BracketLeft', skill1: 'Digit8', skill2: 'Digit9', skill3: 'Digit0', ult: 'Minus', taunt: 'BracketRight' }
];
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
// Key bindings: the player's saved set in localStorage always wins; defaults only fill gaps.
const RESERVED_KEYS = new Set(['Escape']);
const validCode = c => typeof c === 'string' && /^[A-Za-z0-9]{2,24}$/.test(c) && !RESERVED_KEYS.has(c);
function loadBinds() {
  const ver = store.get('fpfc-binds-v');
  if (ver === 5 || ver === 6) {   // v6: skills on U I O P; v7: L short pass, J long pass, K through ball. Keys still on old defaults follow, custom ones stay
    const sv = store.get('fpfc-binds'), was = [{ pass: 'KeyJ', lpass: 'KeyK', switch: 'KeyL' }, { pass: 'Period', lpass: 'Comma', switch: 'KeyN' }];
    if (ver === 5) { Object.assign(was[0], { skill1: 'Digit1', skill2: 'Digit2', skill3: 'Digit3', ult: 'KeyF' }); was[1].blind = 'KeyP'; }
    if (Array.isArray(sv)) sv.forEach((m, i) => { if (m && was[i]) for (const a in was[i]) if (m[a] === was[i][a]) delete m[a]; });
    store.set('fpfc-binds', sv || null); store.set('fpfc-binds-v', BINDS_VERSION);
  } else if (ver !== BINDS_VERSION) {   // older than v5: a new, smaller layout; keep a copy of older custom keys and start fresh once
    const old = store.get('fpfc-binds'); if (old) store.set('fpfc-binds-old', old);
    store.set('fpfc-binds', null); store.set('fpfc-binds-v', BINDS_VERSION);
  }
  const saved = store.get('fpfc-binds'), out = DEFAULT_BINDS.map(d => ({ ...d }));
  if (!Array.isArray(saved)) return out;
  // 1) Take every valid saved key (first use of a key wins if the saved data has duplicates).
  const taken = new Set(), fromSave = out.map(() => ({}));
  saved.forEach((m, i) => {
    if (!out[i] || !m || typeof m !== 'object') return;
    for (const a of Object.keys(out[i])) if (validCode(m[a]) && !taken.has(m[a])) { out[i][a] = m[a]; taken.add(m[a]); fromSave[i][a] = true; }
  });
  // 2) Actions without a valid saved key keep their default, unless a saved choice already uses
  //    that key; then they get a free fallback key, so no two actions ever share one.
  const spare = ['KeyZ', 'KeyX', 'KeyC', 'KeyB', 'KeyN', 'KeyH', 'KeyR', 'KeyF', 'KeyG', 'KeyV', 'KeyY', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
  out.forEach((m, i) => { for (const a of Object.keys(m)) {
    if (fromSave[i][a]) continue;
    if (taken.has(m[a])) m[a] = spare.find(c => !taken.has(c)) || m[a];
    taken.add(m[a]);
  } });
  return out;
}
let BINDS = loadBinds();
// Keep every open tab in sync when the bindings change in another one.
addEventListener('storage', e => {
  if (e.key !== 'fpfc-binds') return;
  BINDS = loadBinds(); rebuildMaps();
  if (!document.getElementById('settings').hidden) renderBinds();
});
const PACES = [['Slow', 0.55], ['Relaxed', 0.7], ['Normal', 0.85], ['Turbo', 1]];
let PACE = (() => { const v = store.get('fpfc-pace'); return PACES.some(p => p[1] === v) ? v : 0.7; })();
const LENS = [['1 min', 60], ['3 min', 180], ['5 min', 300]];
let MATCH_LEN = (() => { const v = store.get('fpfc-len'); return LENS.some(l => l[1] === v) ? v : 180; })();
let SHOW_PING = store.get('fpfc-ping') !== false;
let AUTOSAVE = store.get('fpfc-autosave') === true;
const MAP1 = {}, MAP2 = {}, MAPSOLO = {};
let GAME_KEYS = new Set();
function rebuildMaps() {
  for (const [a] of ACTIONS) { MAP1[a] = [BINDS[0][a]]; MAP2[a] = [BINDS[1][a]]; MAPSOLO[a] = [BINDS[0][a], BINDS[1][a]]; }
  const used = new Set([...Object.values(BINDS[0]), ...Object.values(BINDS[1])]);
  if (!used.has('Space')) MAPSOLO.shoot.push('Space');
  GAME_KEYS = new Set([].concat(...Object.values(MAPSOLO)));
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function keyLabel(c) {
  if (!c) return '—';
  const named = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Period: '.', Comma: ',', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Space: 'Space', Enter: 'Enter', Tab: 'Tab', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', MetaLeft: 'L-Cmd', MetaRight: 'R-Cmd', Backspace: 'Bksp', CapsLock: 'Caps' };
  if (named[c]) return named[c];
  if (c.startsWith('Key')) return c.slice(3);
  if (c.startsWith('Digit')) return c.slice(5);
  if (c.startsWith('Numpad')) return 'Num ' + c.slice(6);
  return c;
}
function assignKey(pi, a, code) {
  const old = BINDS[pi][a];
  for (let q = 0; q < 2; q++) for (const k in BINDS[q]) if (BINDS[q][k] === code && !(q === pi && k === a)) BINDS[q][k] = old;
  BINDS[pi][a] = code;
  store.set('fpfc-binds', BINDS); rebuildMaps();
}
rebuildMaps();
let rebinding = null;
const keys = new Set();
const virt = { jx: 0, jy: 0, pass: false, shoot: false, foul: false, blind: false, item: false, cycle: false };
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (rebinding) {
    e.preventDefault(); e.stopPropagation();
    const r = rebinding; rebinding = null;
    if (e.code !== 'Escape') assignKey(r.p, r.a, e.code);
    keys.clear(); renderBinds();
    const b = document.getElementById(`bind-${r.p}-${r.a}`); if (b) b.focus();
    return;
  }
  const settingsOpen = !document.getElementById('settings').hidden;
  if (e.code === 'Escape' && settingsOpen) { closeSettings(); return; }
  if (e.code === 'Escape' && !document.getElementById('guide').hidden) { closeGuide(); return; }
  if (e.code === 'Escape' && !document.getElementById('creator').hidden) { closeCreator(false); return; }
  if (e.code === 'Escape' && !document.getElementById('roles').hidden) { showOverlay(rolesFrom); return; }
  if (S.phase === 'play' && (GAME_KEYS.has(e.code) || e.code === 'Tab')) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Escape' && S.phase === 'play') togglePause();
  if (e.code === 'KeyM' && !GAME_KEYS.has('KeyM')) muted = !muted;
  if (e.code === 'Backquote' && S.mode === 'playground' && S.phase === 'play' && !GAME_KEYS.has('Backquote')) toggleAdmin();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
