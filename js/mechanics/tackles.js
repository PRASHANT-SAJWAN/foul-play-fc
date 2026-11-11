/* Foul Play FC · js/mechanics/tackles.js
   Jumping, short and sliding tackles, slide fouls and mid-air volleys and headers.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- jumping, tackles and carrying the referee ---------- */
const own0 = p => S.ball.owner === p;
function jump(p, vz = 270) {
  if (p.z > 0 || p.slide > 0 || !able(p) || p.carry != null) return false;
  if (p.stamina < 4) { if (p.human) floatText(p, 'Too tired to jump', '#c8c8c8'); return false; }
  p.vz = vz; p.z = 0.01; p.stamina -= 4; M(p, 'jumps'); return true;
}
function shortTackle(p) { if (p.lungeCd > 0 || p.stamina < 6 || p.z > 0 || p.carry != null) return; p.lunge = 0.22; p.lungeCd = 0.8; p.stamina -= 6; }
function slideTackle(p) {
  if (p.slideCd > 0 || p.slide > 0 || p.z > 0 || p.carry != null) return;
  if (p.stamina < 12) { if (p.human) floatText(p, 'Too tired to slide', '#c8c8c8'); return; }
  p.slide = 0.5; p.slideA = passDir(p); p.face = p.slideA; p.slideCd = 1.6; p.stamina -= 12; p.slideHit = false; M(p, 'slides');
}
function slideContacts(p) {   // called every frame while sliding
  if (!(p.slide > 0) || p.slideHit) return;
  const b = S.ball;
  if (!b.owner && dist(p, b) < 20 && (b.z || 0) < 12) {   // knock a loose ball on
    b.vx = Math.cos(p.slideA) * 300; b.vy = Math.sin(p.slideA) * 300; b.vz = 40; b.lastTouch = p; p.slideHit = true; thump(150, 0.1, 0.06); return;
  }
  for (const q of S.players) {
    if (q === p || !onPitch(q) || q.ko > 0 || q.z > 20 || dist(p, q) > 18) continue;
    if (q.team === p.team && b.owner !== q) continue;   // slide past team-mates
    p.slideHit = true;
    const behind = Math.abs(angDiff(q.face, p.slideA)) < 0.9;   // sliding the same way they face: from behind
    if (b.owner === q && q.team !== p.team && !behind && Math.random() < 0.75) {
      b.owner = null; b.vx = Math.cos(p.slideA) * 260; b.vy = Math.sin(p.slideA) * 260; b.vz = 30; b.lastTouch = p; q.pickCd = 0.6;
      p.stats.tackles++; addPop(p, 4); addMood(p, 6); addKarma(p, 2); crowdEvent(p.team, { perf: 4, drama: 2 }); bountyCollect(p, q); EV('tackle', p, { from: q.name, slide: true });
      floatText(p, 'CLEAN SLIDE', '#7dff9b'); whack(q, 'tackle'); cheer('roar', p.x, 'WHAT A TACKLE!'); thump(140, 0.15, 0.08);
    } else slideFoul(p, q, behind);
    return;
  }
}
function slideFoul(a, t, behind) {
  t.stun = Math.max(t.stun, behind ? 1.6 : 1.2); t.hp = Math.max(1, t.hp - (behind ? 12 : 8)); t.hitT = 2; a0Anim(t, 'fall', 0.6); loseBall(t, a.slideA); addMood(t, -6);
  if (Math.random() < (behind ? 0.4 : 0.2)) injure(t, behind ? 12 : 8, a);
  a.stats.fouls++; a.lastFoulT = S.time; addKarma(a, behind ? -8 : -5); M(a, 'fouls'); M(t, 'fouledReceived'); noteGrudge(a, t);
  floatText(t, behind ? 'FROM BEHIND!' : 'TRIPPED', '#ff9a9a'); thump(100, 0.2, 0.1); whack(t, 'slide'); S.shake = 3; S.excite += 0.2;
  crowdEvent(a.team, a.team === t.team ? { noob: 5, fun: 3 } : { vill: behind ? 5 : 3, drama: 2 }); if (a.team !== t.team) crowdEvent(t.team, { symp: 3 });
  if (loud(a, t)) feed(`${a.name} ${behind ? 'slid in from behind on' : 'tripped'} ${t.name}`, '#f2c9c9');
  EV('foul', a, { target: t.name, kind: 'slide', fromBehind: behind, teammate: a.team === t.team, x: Math.round(a.x), y: Math.round(a.y) });
  S.pend.push({ a, t, x: a.x, y: a.y, kind: 'slide', heavy: false, ttl: (S.refHuman ? 2.2 : 0.75) * (behind ? 1.4 : 1), inBox: t.team !== a.team && inBox(t.x, t.y, a.team), mate: a.team === t.team });
  alertRefs(a.x, a.y, 330, behind ? 0.7 : 0.5);
}
// A mid-air strike: once the ball is within reach of a jumping player who pressed shoot or pass.
function airStrike(p) {
  const A = p.airAct, b = S.ball; if (!A || b.owner || p.z <= 0) return;
  const dz = (b.z || 0) - p.z; if (dist(p, b) > 24 || dz < -6 || dz > 56) return;
  const header = dz > 26; p.airAct = null;
  b.owner = p; b.x = p.x; b.y = p.y;   // borrow the normal shot and pass aiming, then fix up the height
  if (A.k === 'shoot') {
    const st = p.stamina; shoot(p, header ? 0.7 : 0.9); p.stamina = Math.max(0, st - (header ? 4 : 8));
    b.z = p.z + (header ? 40 : 10);
    if (header) { b.vx *= 0.82; b.vy *= 0.82; b.vz = rand(-40, 40); }
    else b.vz = rand(40, 140);
    floatText(p, header ? 'HEADER!' : 'VOLLEY!', '#ffd23f'); cheer('roar', p.x, header ? 'WHAT A HEADER!' : 'ON THE VOLLEY!'); S.excite += 0.3;
    M(p, header ? 'headers' : 'volleys'); fxEvent('kick', p);
  } else {
    if (A.k === 'lpass') humanLongPass(p, 0.5); else humanPass(p, 0.5);
    if (b.owner === p) { b.owner = null; b.vx = Math.cos(p.face) * 320; b.vy = Math.sin(p.face) * 320; b.vz = 60; b.lastTouch = p; }   // nobody to pass to: knock it on
    b.z = p.z + (header ? 40 : 10); if (header) { b.vx *= 0.8; b.vy *= 0.8; }
    floatText(p, header ? 'HEADED PASS' : 'FIRST TIME', '#9fe8ff'); M(p, 'headers');
  }
  a0Anim(p, 'shoot', 0.3);
}
