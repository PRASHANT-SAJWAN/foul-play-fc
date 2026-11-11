/* Foul Play FC · js/items/field-items.js
   Crowd gifts and pick-ups, the five field items, power-ups and throwables.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

function throwItem(p, force) {
  // The crowd favours the team it supports: some gifts go to them instead.
  if (!force && S.crowd && Math.random() < 0.35) {
    const fav = S.crowd.support >= 0.5 ? 0 : 1;
    if (Math.max(S.crowd.support, 1 - S.crowd.support) > 0.6 && p.team !== fav) { const pool = S.players.filter(q => q.team === fav && onPitch(q) && !q.gk); if (pool.length) p = pick(pool); }
  }
  const type = fieldItemFor(p);
  const tx = clamp(p.x + rand(-40, 40), 20, W - 20), ty = clamp(p.y + rand(-40, 40), 20, H - 20);
  const near = Math.random() < 0.4;
  const sx = clamp(tx + rand(-120, 120), -40, W + 40), sy = near ? H + 60 : -40;
  S.items.push({ type, sx, sy, tx, ty, t: 0, dur: 1.15, x: sx, y: sy, z: 30, landed: false, for: p, age: 0 });
  M(p, 'giftsReceived'); EV('gift', p, { item: type });
  feed(`The crowd throws a ${ITEM_LABEL[type]} to ${p.name}`, '#ffd23f');
  S.excite += 0.25;
}
function pickup(p, it) {
  M(p, 'itemsPicked');
  if (POWERUPS.includes(it.type)) { applyPowerup(p, it.type); thump(500, 0.08, 0.08); return; }
  if (it.type === 'medkit') { p.hp = Math.min(100, p.hp + 45); floatText(p, '+45 HP', '#7dff9b'); healInjury(p); }
  if (WEAPONS[it.type]) giveWeapon(p, it.type);   // any weapon from js/player/player.js
  if (it.type === 'ultcharge') { p.ult = Math.min(100, (p.ult || 0) + 50); floatText(p, 'ULTIMATE +50%', ITEM_COL.ultcharge); burst(p.x, p.y, ITEM_COL.ultcharge, 12, 20); }
  if (it.type === 'flash') { p.items.flash += 1; floatText(p, 'FLASH', '#fff6c0'); }
  if (it.type === 'banana') { p.items.banana += 2; p.throwSel = 'banana'; floatText(p, 'BANANA ×2', '#ffe14d'); }
  if (it.for !== p && loud(p, it.for)) feed(`${p.name} grabbed the ${ITEM_LABEL[it.type]} meant for ${it.for.name}`, '#ffd23f');
  thump(500, 0.08, 0.08);
}

/* ---------- power-ups and throwables ---------- */
// The only items that reach the pitch (from the crowd or the bench). Hurt players are more likely to get health.
const FIELD_ITEMS = ['medkit', 'ultcharge', 'sword', 'rocket', 'whistle'];
function fieldItemFor(p) {
  const pool = MUT.noPowerups ? ['medkit', 'sword', 'whistle'] : FIELD_ITEMS.slice();
  if (p && (p.hp < 55 || p.injury > 0)) pool.push('medkit', 'medkit');
  return pick(pool);
}
const POWERUPS = ['rocket', 'magnet', 'smoke', 'whistle', 'glue', 'megaball', 'shield', 'decoy', 'megaphone', 'replay'];
const THROWABLES = ['banana', 'glue', 'smoke', 'whistle', 'decoy'];
Object.assign(ITEM_LABEL, { rocket: 'pair of rocket boots', magnet: 'pair of magnet boots', smoke: 'smoke bomb', whistle: 'fake whistle', glue: 'pot of glue', megaball: 'mega ball', shield: 'shield', decoy: 'decoy', megaphone: 'megaphone', replay: 'instant replay' });
const ITEM_COL = { sword: '#d9e2ec', ultcharge: '#b98cff', sling: '#c9b48a', blaster: '#ff9f43', medkit: '#f4f4f0', bat: '#b07a3c', flash: '#ffd23f', banana: '#ffe14d', rocket: '#ff7a2f', magnet: '#e2404f', smoke: '#9aa3a8', whistle: '#d8dde0', glue: '#5ccf6a', megaball: '#ffffff', shield: '#6fc4ff', decoy: '#c9b7ff', megaphone: '#ff9fd0', replay: '#ffd23f' };
const throwCount = p => THROWABLES.reduce((s, k) => s + (p.items[k] || 0), 0);
function selectedThrowable(p) { if ((p.items[p.throwSel] || 0) > 0) return p.throwSel; return THROWABLES.find(k => (p.items[k] || 0) > 0) || 'banana'; }
function applyPowerup(p, type) {
  p.fx = p.fx || {}; M(p, 'powerups'); EV('powerup', p, { item: type });
  const say = (t, c = ITEM_COL[type]) => floatText(p, t, c);
  if (type === 'rocket') { p.fx.rocket = 3; say('ROCKET BOOTS ×3'); }
  else if (type === 'magnet') { p.fx.magnet = 8; say('MAGNET BOOTS'); }
  else if (type === 'megaball') { S.megaBall = 10; say('MEGA BALL!'); cheer('roar', p.x, 'MEGA BALL!'); }
  else if (type === 'shield') { p.fx.shield = 20; say('SHIELD'); }
  else if (type === 'megaphone') { p.fx.megaphone = 15; say('MEGAPHONE'); }
  else if (type === 'replay') instantReplay(p);
  else { p.items[type] = (p.items[type] || 0) + (type === 'glue' ? 2 : 1); p.throwSel = type; say(type.toUpperCase()); }
}
function instantReplay(p) {
  const r = S.refs[0], f = (S.recentUnseen || []).filter(u => u.a.team !== p.team && S.time - u.time < 4).pop();
  if (!r || MUT.noRef || !f) { floatText(p, 'NOTHING TO REVIEW', '#c8c8c8'); return; }
  S.recentUnseen = S.recentUnseen.filter(u => u !== f);
  feed(`${p.name} calls for an instant replay of ${f.a.name}'s foul…`, '#9fe8ff');
  if (Math.random() < 0.5) { feed('Replay: foul given!', '#ffd23f'); callFoul(f, r); }
  else { feed('Replay: no clear evidence, play on', '#9fe8ff'); cheer('boo', r.x, 'WHAT?!'); }
}
