/* Foul Play FC · js/abilities/aiming.js
   Where skills aim.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- aiming ---------- */
function aimFor(p, range) {   // a point ahead of the player, along their aim
  const f = passDir(p);
  return { x: clamp(p.x + Math.cos(f) * range * 0.7, 8, W - 8), y: clamp(p.y + Math.sin(f) * range * 0.7, 8, H - 8) };
}
function unitNear(list, pt) { let best = null, bd = 1e9; for (const q of list) { const d = Math.hypot(q.x - pt.x, q.y - pt.y); if (d < bd) { bd = d; best = q; } } return best; }
// Aim assist: the player in list closest to where p is aiming, inside a cone (about ±34°) and range.
const ASSIST_CONE = 0.6;
function assistPick(p, list, range, cone = ASSIST_CONE, bias) {
  const f = passDir(p); let best = null, bs = 1e9;
  for (const q of list) {
    const d = dist(p, q); if (q === p || d > range || d < 1) continue;
    const da = Math.abs(angDiff(f, Math.atan2(q.y - p.y, q.x - p.x))); if (da > cone) continue;
    const s = da * 160 + d * 0.5 + (bias ? bias(q) : 0); if (s < bs) { bs = s; best = q; }
  }
  return best;
}
const skillRange = (p, def) => (def.range || 300) * (p.cls === 'ranger' ? 1.15 : 1);
function skillTarget(p, def, range) {
  let cand;
  if (def.aim === 'enemy') cand = enemiesOf(p).filter(q => dist(q, p) <= range && q.ko <= 0);
  else if (def.aim === 'ally') { cand = alliesOf(p).filter(q => (def.self || q !== p) && dist(q, p) <= range); cand = def.id === 'revive' ? cand.filter(q => q.ko > 0) : cand.filter(q => q.ko <= 0); }
  else return null;
  const aimed = assistPick(p, cand, range); if (aimed) return aimed;   // whoever you're aiming at first
  if (def.aim === 'enemy' && S.ball.owner && cand.includes(S.ball.owner)) return S.ball.owner;   // otherwise the best guess
  if (def.id === 'healBurst' || def.id === 'cleanse') return cand.slice().sort((u, v) => u.hp - v.hp)[0] || null;
  return unitNear(cand, aimFor(p, range));
}
// Where a point skill lands: on an opponent you're aiming at (unless it's meant for your own side), otherwise ahead along your aim.
const FRIENDLY_POINT = new Set(['tactical', 'lifeweaver', 'bodyBlock', 'diveSave', 'aerial']);
function skillPoint(p, def, range) {
  if (def.snap !== false && !FRIENDLY_POINT.has(def.id)) { const q = assistPick(p, enemiesOf(p).filter(q => q.ko <= 0), range); if (q) return { x: q.x, y: q.y, on: q }; }
  return aimFor(p, range);
}
// Everything a cast will use: the target player (enemy/ally skills) and the point. The aim guide draws exactly this.
function castAim(p, def) {
  const range = skillRange(p, def), u = def.aim === 'enemy' || def.aim === 'ally' ? skillTarget(p, def, range) : null;
  return { u, pt: u ? { x: u.x, y: u.y } : skillPoint(p, def, range), range };
}
