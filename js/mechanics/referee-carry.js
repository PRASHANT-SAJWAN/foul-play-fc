/* Foul Play FC · js/mechanics/referee-carry.js
   Lifting, carrying and throwing the referee.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

// Referee lifting: carry them on your shoulders (they keep watching where you face), put them down, or throw them.
function liftRef(p) {
  if (p.carry != null) {   // put them down gently
    const r = S.refs[p.carry]; p.carry = null; if (r) { r.carriedBy = null; r.z = 0; r.x = clamp(p.x + Math.cos(p.face) * 16, 10, W - 10); r.y = clamp(p.y + Math.sin(p.face) * 16, 10, H - 10); r.downT = 0.4; }
    feed(`${p.name} put the referee down`, '#e9d8a6'); return;
  }
  if (!able(p) || p.z > 0) return;
  const r = S.refs.find(r => !r.human && !(r.gone > 0) && r.carriedBy == null && !r.fly && dist(p, r) < 36);
  if (!r) { if (p.human) floatText(p, 'Get next to the referee to lift them', '#c8c8c8'); return; }
  if (S.ball.owner === p) loseBall(p, p.face);
  p.carry = S.refs.indexOf(r); p.carryT = 0; r.carriedBy = p.id; r.blind = 0;
  addKarma(p, -3); M(p, 'refLifts'); EV('refLift', p); crowdEvent(p.team, { fun: 6, drama: 4, vill: 2 });
  floatText(p, 'GOT THE REF!', '#ffd23f'); cheer('roar', p.x, 'HE’S GOT THE REF!'); S.excite += 0.3;
  if (loud(p)) feed(`${p.name} hoisted the referee onto their shoulders. The ref still sees wherever ${p.name} faces`, '#ffd23f');
}
function throwRef(p) {
  const r = S.refs[p.carry]; p.carry = null; if (!r) return;
  const a = passDir(p), d = 260 + 220 * Math.min(1, p.stamina / 100);
  const tx = clamp(p.x + Math.cos(a) * d, 20, W - 20), ty = clamp(p.y + Math.sin(a) * d, 20, H - 20);
  r.carriedBy = null; r.fly = { sx: r.x, sy: r.y, tx, ty, t: 0, dur: 0.6 + Math.hypot(tx - r.x, ty - r.y) / 900 }; r.face = a;
  p.stamina = Math.max(0, p.stamina - 10); addKarma(p, -4); M(p, 'refThrows'); EV('refThrow', p);
  a0Anim(p, 'swing', 0.4); sfx('whoosh'); crowdEvent(p.team, { fun: 8, drama: 6, vill: 3 }); cheer('roar', p.x, 'REF OVERBOARD!'); S.excite += 0.4;
  if (loud(p)) feed(`${p.name} threw the referee across the pitch!`, '#ffd23f');
}
function updateRefCarry(r, dt) {   // true while the referee is being carried or is in flight
  if (r.carriedBy != null) {
    const c = S.players[r.carriedBy]; r.carryT = (r.carryT || 0) + dt;
    if (!c || !onPitch(c) || c.stun > 0 || c.ko > 0 || c.carry !== S.refs.indexOf(r) || r.carryT > 8) {
      if (c && c.carry === S.refs.indexOf(r)) c.carry = null;
      r.carriedBy = null; r.carryT = 0; r.z = 0; r.downT = 0.6;
      if (c) feed(c.stun > 0 || c.ko > 0 ? `${c.name} dropped the referee` : 'The referee wriggled free', '#e9d8a6');
      return false;
    }
    r.x = c.x; r.y = c.y; r.z = 26; r.face = c.face; r.run = c.run; return true;
  }
  r.carryT = 0;
  if (r.fly) {
    const f = r.fly; f.t += dt; const u = Math.min(1, f.t / f.dur);
    r.x = f.sx + (f.tx - f.sx) * u; r.y = f.sy + (f.ty - f.sy) * u; r.z = 26 * (1 - u) + 170 * u * (1 - u);
    if (u >= 1) {
      r.fly = null; r.z = 0; r.downT = 1.2; burst(r.x, r.y, '#e8e0c8', 14, 10); thump(80, 0.25, 0.14); S.shake = Math.max(S.shake, 4);
      for (const q of S.players) if (onPitch(q) && q.z <= 0 && dist(q, r) < 18) { q.stun = Math.max(q.stun, 1); loseBall(q, q.face); floatText(q, 'SQUASHED!', '#ffd23f'); }
    }
    return true;
  }
  if (r.downT > 0) { r.downT -= dt; return true; }   // getting back up: still watching, not moving
  return false;
}
