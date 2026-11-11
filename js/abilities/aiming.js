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
function skillTarget(p, def, range) {
  const pt = aimFor(p, range), mouse = false;
  if (def.aim === 'enemy') {
    const cand = enemiesOf(p).filter(q => dist(q, p) <= range && q.ko <= 0);
    if (!mouse && S.ball.owner && cand.includes(S.ball.owner)) return S.ball.owner;
    return unitNear(cand, pt);
  }
  if (def.aim === 'ally') {
    const cand = alliesOf(p).filter(q => (def.self || q !== p) && dist(q, p) <= range);
    if (def.id === 'revive') return unitNear(cand.filter(q => q.ko > 0), pt);
    if (!mouse && (def.id === 'healBurst' || def.id === 'cleanse')) return cand.sort((u, v) => u.hp - v.hp)[0] || null;
    return unitNear(cand.filter(q => q.ko <= 0), pt);
  }
  return null;
}
