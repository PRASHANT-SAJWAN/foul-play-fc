/* Foul Play FC · js/party/ball-mods.js
   Ball modifiers from supply crates, and bicycle-kick rings.
     Crates      drop onto the pitch when the match gets frantic. Run into one to change the ball.
     Volt ball   hard kicks and tackles charge it; fully charged, it explodes on the next player who
                 touches it (or the net), throwing everyone near it backwards.
     Iron ball   for 14 seconds: kicks lose half their pace, it doesn't bounce, and carriers slow down,
                 so it's all close-range wrestling.
     Rings       a high ball dropping into the box shows a target ring where it lands. Jump and strike
                 it there for a bicycle kick: much faster, and the keeper can't hold it.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const BALL_MODS = { volt: { name: 'Volt ball', col: '#ffe14d' }, iron: { name: 'Iron ball', col: '#7d8790' } };
function resetBallMods() { S.crates = []; S.crateT = rand(25, 40); S.ballMod = null; S.ring = null; }
const ballModSpeed = p => S.ballMod && S.ballMod.k === 'iron' && S.ball.owner === p ? 0.82 : 1;
function updateBallMods(dt) {
  const b = S.ball; S.crates = S.crates || [];
  // crates: dropped in when the match is frantic and no modifier is active
  S.crateT = (S.crateT == null ? 30 : S.crateT) - dt * (S.excite > 0.55 ? 1.6 : 0.6);
  if (S.crateT <= 0 && !S.ballMod && S.crates.length < 1 && S.mode !== 'menu') {
    S.crateT = rand(25, 40);
    S.crates.push({ x: rand(W * 0.2, W * 0.8), y: rand(H * 0.2, H * 0.8), z: 320, vz: 0, landed: false, kind: Math.random() < 0.55 ? 'volt' : 'iron', age: 0 });
    feed('A supply crate is dropping onto the pitch!', '#ffd23f');
  }
  for (let i = S.crates.length - 1; i >= 0; i--) {
    const c = S.crates[i];
    if (!c.landed) { c.vz -= 600 * dt; c.z += c.vz * dt; if (c.z <= 0) { c.z = 0; c.landed = true; burst(c.x, c.y, '#d9c08a', 14, 6); thump(90, 0.2, 0.12); } continue; }
    c.age += dt; if (c.age > 20) { S.crates.splice(i, 1); continue; }
    const p = S.players.find(q => able(q) && (q.z || 0) < 10 && dist(q, c) < 16);
    if (p) {
      S.crates.splice(i, 1); S.ballMod = c.kind === 'volt' ? { k: 'volt', charge: 0, armed: false } : { k: 'iron', t: 14 };
      burst(c.x, c.y, BALL_MODS[c.kind].col, 22, 20); floatText(p, BALL_MODS[c.kind].name.toUpperCase() + '!', BALL_MODS[c.kind].col);
      feed(`${p.name} cracked open a crate: ${BALL_MODS[c.kind].name.toLowerCase()}!`, BALL_MODS[c.kind].col); fxEvent('crate', p);
    }
  }
  // the modifiers
  const M2 = S.ballMod, spd = Math.hypot(b.vx || 0, b.vy || 0), kicked = !b.owner && spd > 360 && (b.prevSpd || 0) < spd - 200;
  const ownerTeam = b.owner ? b.owner.team : null, stolen = ownerTeam != null && b.prevTeam != null && ownerTeam !== b.prevTeam;
  if (M2 && M2.k === 'iron') {
    M2.t -= dt; if (kicked) { b.vx *= 0.5; b.vy *= 0.5; b.vz = Math.min(b.vz, 60); }
    if (M2.t <= 0) { S.ballMod = null; feed('The iron ball is back to normal', '#c9d3cb'); }
  }
  if (M2 && M2.k === 'volt') {
    if (kicked) M2.charge += 34; if (stolen) M2.charge += 20;
    if (!M2.armed && M2.charge >= 100) { M2.armed = true; M2.armT = S.time; floatText(b, 'VOLT BALL ARMED', '#ffe14d'); feed('The volt ball is fully charged. Whoever touches it next gets a shock!', '#ffe14d'); }
    const atNet = !b.owner && (b.x < 3 || b.x > W - 3) && Math.abs(b.y - H / 2) < GOAL_HALF + 6;
    if (M2.armed && S.time - M2.armT > 0.4 && ((b.owner && b.owner !== b.prevOwner) || atNet)) voltBoom(b);
  }
  b.prevSpd = spd; b.prevOwner = b.owner; if (ownerTeam != null) b.prevTeam = ownerTeam;
  // bicycle rings: a high ball dropping into the box
  if (S.ring) { S.ring.ttl -= dt; if (S.ring.ttl <= 0 || b.owner) S.ring = null; }
  else if (!b.owner && (b.z || 0) > 40 && b.vz > 0 && b.lastTouch) {
    const L = ballLanding(b), att = b.lastTouch.team;
    if (L && inBox(L.x, L.y, 1 - att)) { S.ring = { x: L.x, y: L.y, z: 30, ttl: L.t + 0.4, team: att }; }
  }
}
function voltBoom(b) {
  const a = b.lastTouch || b.owner; S.ballMod = null;
  fxEvent('boom', null, { x: b.x, y: b.y, side: 90 }); hitstop(0.12, 16); burst(b.x, b.y, '#ffe14d', 40, 40);
  for (const q of S.players) if (onPitch(q) && q.ko <= 0 && dist(q, b) < 90) {
    const ang = Math.atan2(q.y - b.y, q.x - b.x); q.stun = Math.max(q.stun, 1.3); q.vx = Math.cos(ang) * 340; q.vy = Math.sin(ang) * 340; q.vz = 200; q.z = Math.max(q.z || 0, 0.01);
    q.hp = Math.max(1, q.hp - 8); q.dizzy = q.stun; floatText(q, 'ZZZAP!', '#ffe14d'); if (S.ball.owner === q) S.ball.owner = null;
  }
  b.owner = null; b.vx = rand(-200, 200); b.vy = rand(-200, 200); b.vz = 380; if (a) b.lastTouch = a;
  feed('BOOM! The volt ball exploded', '#ffe14d'); cheer('roar', b.x, 'KABOOM!'); S.excite += 0.7;
}
// Called by airStrike when a player in the air strikes the ball: inside an attacking ring, it's a bicycle kick.
function bicycleKick(p) {
  const R = S.ring, b = S.ball; if (!R || R.team !== p.team || Math.hypot(p.x - R.x, p.y - R.y) > 44) return false;
  S.ring = null; const v0 = Math.hypot(b.vx, b.vy) || 1, k = Math.min(1.35, 1500 / v0); b.vx *= k; b.vy *= k; b.vz = rand(-30, 40); b.unstoppable = S.time + 1.6; b.trail = '#ff4d4d';
  a0Anim(p, 'cel2', 0.6); floatText(p, 'BICYCLE KICK!', '#ff4d4d'); cheer('roar', p.x, 'BICYCLE KICK!'); fxEvent('bicycle', p); S.excite += 0.8; M(p, 'bicycles');
  return true;
}
const ballModSnap = () => ({ bm: S.ballMod ? [S.ballMod.k, Math.round(S.ballMod.charge || 0), S.ballMod.armed ? 1 : 0, Math.round((S.ballMod.t || 0) * 10) / 10] : 0, cr: (S.crates || []).map(c => [Math.round(c.x), Math.round(c.y), Math.round(c.z), c.kind]), rn: S.ring ? [Math.round(S.ring.x), Math.round(S.ring.y), S.ring.team] : 0 });
function ballModApply(s) {
  if (!s) return;
  S.ballMod = s.bm ? { k: s.bm[0], charge: s.bm[1], armed: !!s.bm[2], t: s.bm[3] } : null;
  S.crates = (s.cr || []).map(c => ({ x: c[0], y: c[1], z: c[2], kind: c[3], landed: c[2] <= 0 }));
  S.ring = s.rn ? { x: s.rn[0], y: s.rn[1], z: 30, team: s.rn[2] } : null;
}
// Over the 3D scene: crates, the target ring, and a charge meter over the volt ball.
function drawBallMods() {
  for (const c of S.crates || []) {
    const P = proj(c.x, c.y, c.z), G = proj(c.x, c.y, 0), s = Math.max(0.7, P.s), w = 22 * s, col = BALL_MODS[c.kind].col;
    if (!c.landed) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ell(G.x, G.y, 14 * G.s, 5 * G.s); ctx.fill(); }
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(P.x - w / 2, P.y - w, w, w); ctx.strokeStyle = '#3b2410'; ctx.lineWidth = 2 * s; ctx.strokeRect(P.x - w / 2, P.y - w, w, w);
    ctx.beginPath(); ctx.moveTo(P.x - w / 2, P.y - w); ctx.lineTo(P.x + w / 2, P.y); ctx.moveTo(P.x + w / 2, P.y - w); ctx.lineTo(P.x - w / 2, P.y); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `700 ${13 * s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('?', P.x, P.y - w / 2 + 4 * s);
  }
  const R = S.ring;
  if (R) { const P = proj(R.x, R.y, R.z), pulse = 1 + Math.sin(S.time * 10) * 0.08; ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 3 * P.s; ell(P.x, P.y, 26 * P.s * pulse, 10 * P.s * pulse); ctx.stroke(); ctx.fillStyle = '#ff4d4d'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('BICYCLE!', P.x, P.y - 16 * P.s); }
  const M2 = S.ballMod, b = S.ball;
  if (M2) {
    const P = proj(b.x, b.y, (b.z || 0) + 22), s = Math.max(0.8, P.s);
    ctx.font = `700 ${11 * s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillStyle = BALL_MODS[M2.k].col;
    if (M2.k === 'volt') { const w = 28 * s; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y, w, 4 * s); ctx.fillStyle = M2.armed && Math.sin(S.time * 20) > 0 ? '#ffffff' : '#ffe14d'; ctx.fillRect(P.x - w / 2, P.y, w * clamp(M2.charge / 100, 0, 1), 4 * s); }
    else ctx.fillText('IRON ' + Math.ceil(M2.t), P.x, P.y);
  }
}
