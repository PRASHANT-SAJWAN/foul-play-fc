/* Foul Play FC · draw.js
   Drawing the classic 2.5D view, the HUD and the overlays shared with the 3D view.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- drawing ---------------- */
const crowd = [];
function buildCrowd2D() {
  crowd.length = 0;
  const step = W > 1500 ? 16 : 11;
  for (let r = 0; r < 20; r++) for (let x = -110; x <= W + 110; x += step) {
    crowd.push({ x: x + rand(-3, 3), y: -32 - r * 14 + rand(-2, 2), col: pick(['#3fa9ff', '#2b78b8', '#ff6a3d', '#c4502c', '#e8e2d0', '#4a5b52', '#c9b46a', '#2a3a33']), ph: rand(0, 6.28), fan: Math.random() });
  }
}
function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
function path(pts, close) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (close) ctx.closePath(); }
function region(x0, y0, x1, y1, z = 0) {
  const pts = [], n = 8;
  for (let i = 0; i <= n; i++) pts.push(proj(x1, y0 + (y1 - y0) * i / n, z));
  for (let i = 0; i <= n; i++) pts.push(proj(x0, y1 - (y1 - y0) * i / n, z));
  return pts;
}
function seg(x1, y1, x2, y2) { const pts = []; for (let i = 0; i <= 10; i++) pts.push(proj(x1 + (x2 - x1) * i / 10, y1 + (y2 - y1) * i / 10)); path(pts); ctx.stroke(); }
function arc(cx, cy, r, a0 = 0, a1 = Math.PI * 2) { const pts = []; for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; pts.push(proj(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } path(pts); ctx.stroke(); }

function drawBackdrop() {
  const g = ctx.createLinearGradient(0, 0, 0, TOP);
  g.addColorStop(0, '#04080b'); g.addColorStop(1, '#0c1a1b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
  ctx.fillStyle = '#0e1614'; path(region(-140, -330, W + 140, -18), true); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
  for (let y = -40; y > -320; y -= 28) seg(-140, y, W + 140, y);
  const ex = Math.min(1.3, S.excite);
  for (const c of crowd) {
    const P = proj(c.x, c.y), s = P.s;
    const bob = -Math.max(0, Math.sin(S.time * (6 + c.fan * 4) + c.ph)) * (0.6 + ex * 4.5) * s;
    ctx.fillStyle = c.col; ctx.fillRect(P.x - 2.4 * s, P.y - 7 * s + bob, 4.8 * s, 6 * s);
    ctx.fillStyle = '#d7b08c'; ctx.fillRect(P.x - 1.5 * s, P.y - 10 * s + bob, 3 * s, 3 * s);
    if (ex > 0.55 && c.fan > 0.6) { ctx.fillStyle = c.col; ctx.fillRect(P.x - 3.4 * s, P.y - 13 * s + bob, 1.2 * s, 5 * s); ctx.fillRect(P.x + 2.2 * s, P.y - 13 * s + bob, 1.2 * s, 5 * s); }
  }
  for (const [x, y] of [[90, 30], [LW - 90, 30]]) {
    const lg = ctx.createRadialGradient(x, y, 0, x, y, 260); lg.addColorStop(0, 'rgba(255,250,225,.22)'); lg.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = lg; ctx.fillRect(x - 260, y - 260, 520, 520);
    ctx.fillStyle = '#f9f4dc'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) ctx.fillRect(x - 22 + i * 12, y - 8 + j * 9, 9, 6);
  }
  drawChants();
}
function drawChants() {
  for (const c of S.chants) {
    const age = 2.2 - c.life, P = proj === proj2d ? proj(c.x, -150 - age * 30) : proj(c.x, -110, 80 + age * 24), a = Math.max(0, Math.min(1, c.life * 1.5, age * 6));
    ctx.globalAlpha = a; ctx.font = `700 ${Math.round(34 * P.s)}px ${DISP}`; ctx.textAlign = 'center';
    const w = ctx.measureText(c.text).width + 22 * P.s, h = 30 * P.s;
    ctx.fillStyle = 'rgba(6,11,10,.8)'; rr(P.x - w / 2, P.y - h, w, h, 8 * P.s);
    ctx.fillStyle = CHEER_COL[c.kind] || '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(c.text, P.x, P.y - h / 2 + 2 * P.s); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
}
function drawPitch() {
  ctx.fillStyle = '#123a22'; path(region(-90, -18, W + 90, H + 60), true); ctx.fill();
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#1d6b38' : '#1a6233'; path(region(i * W / 12, 0, (i + 1) * W / 12, H), true); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  path(region(0, 0, W, H), true); ctx.stroke();
  seg(W / 2, 0, W / 2, H); arc(W / 2, H / 2, CIRCLE_R);
  for (const side of [0, 1]) {
    const x0 = side ? W : 0, d = side ? -1 : 1;
    seg(x0, H / 2 - BOX_HALF, x0 + d * BOX_D, H / 2 - BOX_HALF); seg(x0 + d * BOX_D, H / 2 - BOX_HALF, x0 + d * BOX_D, H / 2 + BOX_HALF); seg(x0 + d * BOX_D, H / 2 + BOX_HALF, x0, H / 2 + BOX_HALF);
    seg(x0, H / 2 - GA_HALF, x0 + d * GA_D, H / 2 - GA_HALF); seg(x0 + d * GA_D, H / 2 - GA_HALF, x0 + d * GA_D, H / 2 + GA_HALF); seg(x0 + d * GA_D, H / 2 + GA_HALF, x0, H / 2 + GA_HALF);
    const cx = x0 + d * PEN_X; if (side) arc(cx, H / 2, ARC_R, Math.PI - ARC_A, Math.PI + ARC_A); else arc(cx, H / 2, ARC_R, -ARC_A, ARC_A);
    const P = proj(cx, H / 2); ctx.fillStyle = '#fff'; ell(P.x, P.y, 2.4 * P.s, 1.4 * P.s); ctx.fill();
  }
  const C = proj(W / 2, H / 2); ctx.fillStyle = '#fff'; ell(C.x, C.y, 2.6 * C.s, 1.5 * C.s); ctx.fill();
  arc(0, 0, 12, 0, Math.PI / 2); arc(W, 0, 12, Math.PI / 2, Math.PI); arc(0, H, 12, -Math.PI / 2, 0); arc(W, H, 12, Math.PI, Math.PI * 1.5);
  drawBoards(-14, 0.75);
}
function drawBoards(wy, alpha) {
  const words = ['FOUL PLAY FC', 'SAND SOLD SEPARATELY', 'REFS: MIND YOUR EYES', 'BANANAS OF THE MONTH', 'CROWD-FUNDED CHAOS'];
  const step = 114; let k = 0;
  for (let x = -80; x < W + 80; x += step, k++) {
    const a = proj(x, wy), b = proj(x + step - 4, wy), c = proj(x + step - 4, wy, 16), d = proj(x, wy, 16);
    ctx.globalAlpha = alpha; ctx.fillStyle = k % 2 ? '#0d2a3d' : '#3a1409'; path([a, b, c, d], true); ctx.fill();
    ctx.fillStyle = k % 2 ? '#7fc8ff' : '#ffb08f'; ctx.font = `700 ${10 * a.s}px ${UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(words[k % words.length], (a.x + b.x) / 2, (a.y + d.y) / 2 + 0.5); ctx.globalAlpha = 1;
  }
  ctx.textBaseline = 'alphabetic';
}
function drawGoal(side) {
  const x0 = side ? W : 0, xb = side ? W + 26 : -26, y1 = H / 2 - GOAL_HALF, y2 = H / 2 + GOAL_HALF;
  ctx.fillStyle = 'rgba(230,240,235,.10)'; ctx.strokeStyle = 'rgba(230,240,235,.28)'; ctx.lineWidth = 1;
  const back = [proj(xb, y1), proj(xb, y2), proj(xb, y2, GOAL_H), proj(xb, y1, GOAL_H)];
  path(back, true); ctx.fill();
  path([proj(x0, y1, GOAL_H), proj(xb, y1, GOAL_H), proj(xb, y2, GOAL_H), proj(x0, y2, GOAL_H)], true); ctx.fill();
  for (let i = 0; i <= 10; i++) { const y = y1 + (y2 - y1) * i / 10; path([proj(xb, y), proj(xb, y, GOAL_H), proj(x0, y, GOAL_H)]); ctx.stroke(); }
  for (let j = 0; j <= 4; j++) { const z = GOAL_H * j / 4; path([proj(x0, y1, z), proj(xb, y1, z), proj(xb, y2, z), proj(x0, y2, z)]); ctx.stroke(); }
  ctx.strokeStyle = '#f4f6f2'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  path([proj(x0, y1), proj(x0, y1, GOAL_H), proj(x0, y2, GOAL_H), proj(x0, y2)]); ctx.stroke();
}
function drawCones() {
  const humansIn = r => S.humans.some(h => { if (h.remote) return false; const p = S.players[h.pid]; return p && onPitch(p) && sees(r, p.x, p.y); });
  for (const r of S.refs) {
    if (r.blind > 0) continue;
    const pts = [proj(r.x, r.y)];
    for (let i = 0; i <= 14; i++) { const a = r.face - r.fov / 2 + r.fov * i / 14; pts.push(proj(r.x + Math.cos(a) * r.range, r.y + Math.sin(a) * r.range)); }
    const hot = humansIn(r);
    ctx.fillStyle = hot ? 'rgba(255,90,110,.12)' : r.human ? 'rgba(255,236,140,.15)' : 'rgba(255,236,140,.08)';
    ctx.strokeStyle = hot ? 'rgba(255,110,130,.55)' : 'rgba(255,236,140,.35)'; ctx.lineWidth = 1.5;
    path(pts, true); ctx.fill(); ctx.stroke();
  }
}
function drawFigure(s, phase, moving, c) {
  const sw = Math.sin(phase) * moving;
  ctx.lineCap = 'round'; ctx.lineWidth = 3.2 * s; ctx.strokeStyle = c.socks;
  ctx.beginPath(); ctx.moveTo(-2.5 * s, -12 * s); ctx.lineTo(-2.5 * s + sw * 4 * s, 0); ctx.moveTo(2.5 * s, -12 * s); ctx.lineTo(2.5 * s - sw * 4 * s, 0); ctx.stroke();
  ctx.fillStyle = c.shorts; rr(-6 * s, -16 * s, 12 * s, 6 * s, 2 * s);
  const bw = c.build === 0 ? 0.88 : c.build === 2 ? 1.14 : 1;
  ctx.fillStyle = c.jersey; rr(-6.5 * s * bw, -27 * s, 13 * s * bw, 12 * s, 3 * s);
  if (c.trim) { ctx.fillStyle = c.trim; ctx.fillRect(-6.5 * s * bw, -27 * s, 13 * s * bw, 1.6 * s); ctx.fillRect(-6.5 * s * bw, -16.8 * s, 13 * s * bw, 1.4 * s); }
  if (c.boots) { ctx.fillStyle = c.boots; ctx.fillRect(-4.6 * s, -1.2 * s, 3.6 * s, 1.8 * s); ctx.fillRect(1 * s, -1.2 * s, 3.6 * s, 1.8 * s); }
  ctx.strokeStyle = c.arms || c.jersey; ctx.lineWidth = 2.6 * s; ctx.beginPath();
  if (c.armsUp) { ctx.moveTo(-6 * s, -25 * s); ctx.lineTo(-7 * s, -36 * s); ctx.moveTo(6 * s, -25 * s); ctx.lineTo(8 * s, -34 * s); }
  else { ctx.moveTo(-6 * s, -25 * s); ctx.lineTo(-8 * s - sw * 2 * s, -17 * s); ctx.moveTo(6 * s, -25 * s); ctx.lineTo(8 * s + sw * 2 * s, -17 * s); }
  ctx.stroke();
  if (c.num != null) { ctx.fillStyle = c.numCol; ctx.font = `700 ${7.5 * s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText(c.num, 0, -18.3 * s); }
  const hb = c.bigHead ? 1.9 : 1, hy = -31 * s - (hb - 1) * 4 * s, hs = s * hb;
  const hairStyle = c.hairStyle == null ? 1 : c.hairStyle;
  if (hairStyle === 9) { ctx.fillStyle = c.hair; rr(-7.4 * hs, hy - 3 * hs, 2.8 * hs, 7.5 * hs, 1.2 * hs); rr(4.6 * hs, hy - 3 * hs, 2.8 * hs, 7.5 * hs, 1.2 * hs); }   // twin tails, behind the head
  if (hairStyle === 7) { ctx.fillStyle = c.hair; rr(-6.6 * hs, hy - 8.6 * hs, 13.2 * hs, 10 * hs, 4 * hs); }                                              // afro, behind the head
  ctx.fillStyle = c.skin; rr(-4.8 * hs, hy - 4.8 * hs, 9.6 * hs, 9.6 * hs, 1.6 * hs);                                                                     // a blocky head
  ctx.fillStyle = c.hair;
  if (hairStyle === 4) ctx.fillRect(-1.2 * hs, hy - 8.4 * hs, 2.4 * hs, 4.6 * hs);                                                                           // mohawk
  else if (hairStyle === 8) { ctx.fillRect(-5 * hs, hy - 5.4 * hs, 10 * hs, 2.6 * hs); ctx.beginPath(); for (let k = 0; k < 5; k++) { const x0 = -5 * hs + k * 2.5 * hs; ctx.moveTo(x0, hy - 5 * hs); ctx.lineTo(x0 + 1.25 * hs + (k - 2) * 0.6 * hs, hy - 9.6 * hs + Math.abs(k - 2) * 1.2 * hs); ctx.lineTo(x0 + 2.5 * hs, hy - 5 * hs); } ctx.fill(); ctx.fillRect(-5 * hs, hy - 3.2 * hs, 2 * hs, 2.4 * hs); }   // spiky
  else if (hairStyle !== 6 && hairStyle !== 7) {                                                                                                               // everything but bald
    ctx.fillRect(-5 * hs, hy - 5.4 * hs, 10 * hs, hairStyle === 0 ? 1.6 * hs : 2.8 * hs);
    if (hairStyle !== 0) { ctx.fillRect(-5 * hs, hy - 3 * hs, 1.4 * hs, 3 * hs); ctx.fillRect(3.6 * hs, hy - 3 * hs, 1.4 * hs, 3 * hs); }
    if (hairStyle === 5) { ctx.fillRect(-5.4 * hs, hy - 3 * hs, 1.8 * hs, 8 * hs); ctx.fillRect(3.6 * hs, hy - 3 * hs, 1.8 * hs, 8 * hs); }                     // long
    if (hairStyle === 3) { ctx.fillRect(-1.8 * hs, hy - 8.4 * hs, 3.6 * hs, 3.2 * hs); }                                                                        // bun
    if (hairStyle === 2) for (let k = -2; k <= 2; k++) { ell(k * 2 * hs, hy - 5.6 * hs, 1.4 * hs, 1.4 * hs); ctx.fill(); }                                      // curls
  }
  if (c.accessory !== 3 && c.accessory !== 4) {   // eyes
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-3.3 * hs, hy - 0.8 * hs, 2.4 * hs, 2.4 * hs); ctx.fillRect(0.9 * hs, hy - 0.8 * hs, 2.4 * hs, 2.4 * hs);
    ctx.fillStyle = c.eyes || '#2a1a10'; ctx.fillRect(-2.5 * hs, hy - 0.4 * hs, 1.4 * hs, 1.8 * hs); ctx.fillRect(1.5 * hs, hy - 0.4 * hs, 1.4 * hs, 1.8 * hs);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-3.3 * hs, hy - 1.8 * hs, 2.4 * hs, 0.7 * hs); ctx.fillRect(0.9 * hs, hy - 1.8 * hs, 2.4 * hs, 0.7 * hs);
  }
  if (c.accessory === 5) { ctx.fillStyle = '#2a1f3a'; ctx.fillRect(-6 * hs, hy - 6.4 * hs, 12 * hs, 2.2 * hs); ctx.fillRect(-6 * hs, hy - 6.4 * hs, 1.6 * hs, 11 * hs); ctx.fillRect(4.4 * hs, hy - 6.4 * hs, 1.6 * hs, 11 * hs); ctx.fillStyle = '#2a1f3a'; ctx.fillRect(-4.8 * hs, hy + 2 * hs, 9.6 * hs, 2.8 * hs); }   // hood and face wrap
  if (c.accessory === 6) { ctx.fillStyle = '#f4f4f0'; ctx.fillRect(-7.2 * hs, hy - 5.6 * hs, 14.4 * hs, 1.6 * hs); ctx.fillRect(-4.4 * hs, hy - 10 * hs, 8.8 * hs, 4.6 * hs); ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-4.4 * hs, hy - 6.6 * hs, 8.8 * hs, 1.2 * hs); }   // hat
  if (c.accessory === 7) { ctx.strokeStyle = '#111'; ctx.lineWidth = 0.8 * hs; ctx.strokeRect(-3.6 * hs, hy - 1.1 * hs, 3 * hs, 2.8 * hs); ctx.strokeRect(0.6 * hs, hy - 1.1 * hs, 3 * hs, 2.8 * hs); }   // glasses
  if (c.facial === 2) { ctx.fillStyle = c.hair; ctx.fillRect(-4 * hs, hy + 2.2 * hs, 8 * hs, 2.6 * hs); }
  if (c.facial === 3) { ctx.fillStyle = c.hair; ctx.fillRect(-2.2 * hs, hy + 2 * hs, 4.4 * hs, 0.9 * hs); }
  if (c.facial === 1) { ctx.fillStyle = 'rgba(40,30,20,.3)'; ctx.fillRect(-4.4 * hs, hy + 2 * hs, 8.8 * hs, 2.6 * hs); }
  if (c.accessory === 1) { ctx.fillStyle = c.trim || '#ffffff'; ctx.fillRect(-4.9 * hs, hy - 3.4 * hs, 9.8 * hs, 1.4 * hs); }
  if (c.accessory === 3) { ctx.fillStyle = '#111'; ctx.fillRect(-3.8 * hs, hy - 0.9 * hs, 7.6 * hs, 2 * hs); }
  if (c.accessory === 4) { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-3.6 * hs, hy + 1.2 * hs, 7.2 * hs, 2.8 * hs); }
  if (c.accessory === 2) { ctx.fillStyle = c.trim || '#ffffff'; ctx.fillRect(-9 * s, -18.5 * s, 2.4 * s, 1.6 * s); ctx.fillRect(6.6 * s, -18.5 * s, 2.4 * s, 1.6 * s); }
  if (c.cover) { ctx.fillStyle = c.skin; ctx.fillRect(-5 * s, -33 * s, 10 * s, 2.6 * s); }
}
function drawStars(x, y, s) { ctx.fillStyle = '#ffe66d'; for (let i = 0; i < 3; i++) { const a = S.time * 4 + i * 2.09; ell(x + Math.cos(a) * 8 * s, y + Math.sin(a) * 2.6 * s, 1.8 * s, 1.8 * s); ctx.fill(); } }
function rrs(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.stroke(); }
function drawGroundMarker(x, y, face, col) {
  const P = proj(x, y), s = P.s;
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash([6 * s, 4 * s]); ctx.lineDashOffset = -S.time * 20;
  ell(P.x, P.y, 15 * s, 6 * s); ctx.stroke(); ctx.setLineDash([]);
  const ax = Math.cos(face), ay = Math.sin(face);
  const tip = proj(x + ax * 26, y + ay * 26), l = proj(x + ax * 17 - ay * 6.5, y + ay * 17 + ax * 6.5), r = proj(x + ax * 17 + ay * 6.5, y + ay * 17 - ax * 6.5);
  ctx.fillStyle = col; path([tip, l, r], true); ctx.fill(); ctx.restore();
}
function drawLabelPill(cx, y, s, col, label) {
  ctx.font = `700 ${10.5 * s}px ${UI}`;
  const tw = ctx.measureText(label).width + 10 * s;
  ctx.fillStyle = col; rr(cx - tw / 2, y - 19 * s, tw, 13 * s, 6.5 * s);
  ctx.beginPath(); ctx.moveTo(cx - 4 * s, y - 6.5 * s); ctx.lineTo(cx + 4 * s, y - 6.5 * s); ctx.lineTo(cx, y - 1.5 * s); ctx.fill();
  ctx.fillStyle = '#10140a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx, y - 12.4 * s); ctx.textBaseline = 'alphabetic';
}
function drawPlayer(p) {
  const P = proj(p.x, p.y, liftOf(p) + (p.z || 0)), s = P.s * (hasBf(p, 'rage') ? 1.3 : 1), tm = TEAM[p.team], G0 = proj(p.x, p.y);
  ctx.save(); ctx.globalAlpha = cloakAlpha(p);
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ell(G0.x, G0.y, 10 * G0.s * (1 - Math.min(0.5, (p.z || 0) / 120)), 3.6 * G0.s); ctx.fill();
  if (p.human) drawGroundMarker(p.x, p.y, p.aimA != null ? p.aimA : p.face, HUMAN_COL[p.human.idx % HUMAN_COL.length]);
  if (p.sprinting) {   // speed lines
    ctx.strokeStyle = 'rgba(159,246,255,.75)'; ctx.lineWidth = 1.5;
    const bx = -Math.cos(p.face), by = -Math.sin(p.face);
    for (let k = -1; k <= 1; k++) {
      const a1 = proj(p.x + bx * 10 + by * k * 5, p.y + by * 10 - bx * k * 5, 14), a2 = proj(p.x + bx * 26 + by * k * 5, p.y + by * 26 - bx * k * 5, 14);
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
    }
  }
  const diving = p.dive > 0 || p.diveDown > 0 || !!p.diveState;
  const down = p.stun > 0 || p.ko > 0 || diving || p.slide > 0;
  const sk = p.skinData, X = !sk && p.lookX ? p.lookX : null;
  const look = { jersey: p.gk ? (p.team === 0 ? '#c6f04a' : '#b57cff') : tm.col, shorts: tm.shorts, socks: tm.socks, skin: p.skin, hair: p.hair, num: p.num, numCol: p.team === 0 || p.gk ? '#0b1a2a' : '#fff4ee',
    bigHead: MUT.bigHead, armsUp: /^cel|sorry|wave/.test(p.anim || '') || p.carry != null, trim: sk ? SKIN_OPTS.trim[sk.trim] : X ? X.trim : null, boots: sk ? SKIN_OPTS.boots[sk.boots] : null, hairStyle: sk ? sk.hair : X ? X.hairStyle : null, facial: sk ? sk.facial : X ? X.facial : 0, accessory: sk ? sk.accessory : X ? X.accessory : 0, build: sk ? sk.build : X ? X.build : 1, eyes: X ? X.eyes : '#2a1a10', arms: X ? X.sleeves : null };
  ctx.save(); ctx.translate(P.x, P.y);
  if (down) { ctx.translate(0, -3 * s); ctx.rotate((diving ? (p.diveDir || p.diveState || 1) : (Math.cos(p.face) >= 0 ? -1 : 1)) * Math.PI / 2 * 0.95); ctx.scale(1, 0.8); drawFigure(s, 0, 0, look); }
  else drawFigure(s, p.run, Math.min(1, Math.hypot(p.vx, p.vy) / 120), look);
  ctx.restore(); ctx.restore();
  if (p.stun > 0 && p.ko <= 0) drawStars(P.x, P.y - 14 * s, s);
  if (p.ko > 0) { ctx.fillStyle = '#ff6b6b'; ctx.font = `700 ${11 * s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('K.O. ' + Math.ceil(p.ko), P.x, P.y - 18 * s); }
  if (p.hp < 100 && (p.hitT > 0 || p.human)) {
    const w = 24 * s; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y - 43 * s, w, 3 * s);
    ctx.fillStyle = p.hp > 50 ? '#7dff9b' : p.hp > 25 ? '#ffd23f' : '#ff4d6d'; ctx.fillRect(P.x - w / 2, P.y - 43 * s, w * p.hp / 100, 3 * s);
  }
  if (p.yellows > 0) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(P.x + 8 * s, P.y - 40 * s, 3.5 * s, 5 * s); }
  if (p.items.sword > 0 && !down) { ctx.lineCap = 'round'; ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(P.x + 7 * s, P.y - 17 * s); ctx.lineTo(P.x + 15 * s, P.y - 35 * s); ctx.stroke(); ctx.strokeStyle = '#c9a050'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(P.x + 4 * s, P.y - 19 * s); ctx.lineTo(P.x + 11 * s, P.y - 16 * s); ctx.stroke(); }
  else if (p.items.bat > 0 && !down) { ctx.strokeStyle = '#a0682f'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(P.x + 7 * s, P.y - 18 * s); ctx.lineTo(P.x + 13 * s, P.y - 30 * s); ctx.stroke(); }
  if (p.human) {
    const col = HUMAN_COL[p.human.idx % HUMAN_COL.length], y = P.y - (down ? 26 : 50) * s;
    drawLabelPill(P.x, y, s, col, p.human.label || 'P' + (p.human.idx + 1));
    if (p.human.charging && S.ball.owner === p) { const w = 26 * s; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, y - 26 * s, w, 4 * s); ctx.fillStyle = col; ctx.fillRect(P.x - w / 2, y - 26 * s, w * p.human.charge, 4 * s); }
  }
}
function drawTargets() {
  for (const h of S.humans) {
    if (h.remote) continue;
    const p = S.players[h.pid]; if (!p || !able(p)) continue;
    if (S.ball.owner === p) {
      const q = pickPassTarget(p, passDir(p));
      if (q) {
        const A = proj(p.x, p.y), Q = proj(q.x, q.y);
        ctx.save(); ctx.strokeStyle = HUMAN_COL[h.idx % HUMAN_COL.length]; ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(Q.x, Q.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.95; ctx.lineWidth = 2; ell(Q.x, Q.y, 12 * Q.s, 4.8 * Q.s); ctx.stroke(); ctx.restore();
      }
    }
    if (!p.target) continue;
    const t = p.target, P = proj(t.x, t.y), pulse = 1 + Math.sin(S.time * 10) * 0.08, ready = p.foulCd <= 0;
    const help = t.stun > 0;
    ctx.strokeStyle = help ? '#7dff9b' : ready ? '#ff4d6d' : 'rgba(255,77,109,.4)'; ctx.lineWidth = 2.5;
    ell(P.x, P.y, 15 * P.s * pulse, 6 * P.s * pulse); ctx.stroke();
    const key = keyLabel(h.map.foul[0]);
    ctx.fillStyle = help ? '#9dffb8' : ready ? '#ff8095' : 'rgba(255,128,149,.5)'; ctx.font = `700 ${10 * P.s}px ${UI}`; ctx.textAlign = 'center';
    ctx.fillText(help ? `HELP UP [${key}]` : `FOUL [${key}]${t.team === p.team ? ' · TEAMMATE' : ''}`, P.x, P.y + 15 * P.s);
  }
}
function drawRef(r) {
  const P = proj(r.x, r.y, liftOf(r) + (r.z || 0)), s = P.s;
  ctx.fillStyle = 'rgba(0,0,0,.38)'; ell(P.x, P.y, 10 * s, 3.6 * s); ctx.fill();
  if (r.human) drawGroundMarker(r.x, r.y, r.face, '#ffd23f');
  ctx.save(); ctx.translate(P.x, P.y);
  drawFigure(s, r.run, 0.8, { jersey: '#161616', shorts: '#161616', socks: '#161616', arms: '#ffd23f', skin: '#d9a477', hair: '#2a2a2a', num: null, armsUp: !!r.card, cover: r.blind > 0 });
  ctx.restore();
  if (r.card) { ctx.fillStyle = r.card.red ? '#ff3b3b' : '#ffd23f'; ctx.fillRect(P.x - 9 * s, P.y - 46 * s, 6 * s, 8 * s); }
  if (r.human && r.blind <= 0) drawLabelPill(P.x, P.y - 50 * s, s, '#ffd23f', 'YOU · REF');
  if (r.blind > 0) {
    drawStars(P.x, P.y - 38 * s, s);
    ctx.fillStyle = 'rgba(230,220,180,.85)'; ctx.font = `600 ${10 * s}px ${UI}`; ctx.textAlign = 'center';
    ctx.fillText('BLINDED ' + r.blind.toFixed(1) + 's', P.x, P.y - 46 * s);
  }
}
function ballLanding(b) {
  const z = b.z || 0;
  if (b.owner || z < 6) return null;
  const g = GRAV(), vz = b.vz || 0, t = (vz + Math.sqrt(vz * vz + 2 * g * z)) / g, drift = (1 - Math.exp(-0.15 * t)) / 0.15;
  return { x: clamp(b.x + (b.vx || 0) * drift, 0, W), y: clamp(b.y + (b.vy || 0) * drift, 0, H), t };
}
// Air-ball indicator (classic view): a ring on the ground under the ball that tightens as it drops,
// a guide line down to it, and a target where the ball will land.
function drawBallAirMarker() {
  const b = S.ball, land = ballLanding(b); if (!land) return;
  const G = proj(b.x, b.y), P = proj(b.x, b.y, b.z), r = 7 + Math.min(40, b.z * 0.18);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ell(G.x, G.y, r * G.s, r * 0.42 * G.s); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(G.x, G.y); ctx.lineTo(P.x, P.y - 4 * P.s); ctx.stroke(); ctx.setLineDash([]);
  const L = proj(land.x, land.y), pulse = 1 + Math.sin(S.time * 12) * 0.1;
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.2; ell(L.x, L.y, 11 * L.s * pulse, 4.6 * L.s * pulse); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L.x - 6 * L.s, L.y); ctx.lineTo(L.x + 6 * L.s, L.y); ctx.moveTo(L.x, L.y - 2.6 * L.s); ctx.lineTo(L.x, L.y + 2.6 * L.s); ctx.stroke();
  ctx.restore();
}
function drawBall() {
  drawBallAirMarker();
  const b = S.ball, G = proj(b.x, b.y), P = proj(b.x, b.y, b.z), s = P.s;
  ctx.fillStyle = `rgba(0,0,0,${0.4 - Math.min(0.25, b.z / 300)})`; ell(G.x, G.y, 4.5 * s, 1.8 * s); ctx.fill();
  const mb = S.megaBall > 0 ? 2 : 1;
  ctx.fillStyle = '#f7f7f2'; ell(P.x, P.y - 4 * s * mb, 4.3 * s * mb, 4.3 * s * mb); ctx.fill();
  ctx.fillStyle = '#222'; for (let i = 0; i < 3; i++) { const a = b.spin + i * 2.1; ell(P.x + Math.cos(a) * 2.2 * s, P.y - 4 * s + Math.sin(a) * 1.8 * s, 1.1 * s, 1.1 * s); ctx.fill(); }
}
function drawIcon(type, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  const col = ITEM_COL[type] || '#ffffff';
  if (type === 'medkit') { ctx.fillStyle = '#f4f4f0'; rr(-6 * s, -5 * s, 12 * s, 10 * s, 2 * s); ctx.fillStyle = '#e23b3b'; ctx.fillRect(-1.3 * s, -3.5 * s, 2.6 * s, 7 * s); ctx.fillRect(-3.5 * s, -1.3 * s, 7 * s, 2.6 * s); }
  else if (type === 'sword') { ctx.lineCap = 'round'; ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(-4 * s, 4 * s); ctx.lineTo(7 * s, -7 * s); ctx.stroke(); ctx.strokeStyle = '#c9a050'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(-6.5 * s, 1.5 * s); ctx.lineTo(-1.5 * s, 6.5 * s); ctx.stroke(); ctx.strokeStyle = '#5a3d12'; ctx.beginPath(); ctx.moveTo(-4.5 * s, 4.5 * s); ctx.lineTo(-7 * s, 7 * s); ctx.stroke(); }
  else if (type === 'ultcharge') { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = (i % 2 ? 2.8 : 6.5) * s, a = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ell(0, 0, 1.6 * s, 1.6 * s); ctx.fill(); }
  else if (type === 'bat') { ctx.strokeStyle = '#b07a3c'; ctx.lineCap = 'round'; ctx.lineWidth = 3.4 * s; ctx.beginPath(); ctx.moveTo(-6 * s, 5 * s); ctx.lineTo(6 * s, -5 * s); ctx.stroke(); ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(-7 * s, 6 * s); ctx.lineTo(-4 * s, 3.5 * s); ctx.stroke(); }
  else if (type === 'flash') { ctx.fillStyle = '#fff6c0'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillRect(Math.cos(a) * 5 * s - 0.6 * s, Math.sin(a) * 5 * s - 0.6 * s, 1.2 * s, 1.2 * s); } ctx.fillStyle = '#ffd23f'; ell(0, 0, 3.4 * s, 3.4 * s); ctx.fill(); }
  else if (type === 'banana') { ctx.strokeStyle = '#ffe14d'; ctx.lineCap = 'round'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(0, -4 * s, 7 * s, 0.35 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.fillStyle = '#5a3d12'; ell(Math.cos(0.35 * Math.PI) * 7 * s, -4 * s + Math.sin(0.35 * Math.PI) * 7 * s, 1.2 * s, 1.2 * s); ctx.fill(); }
  else if (type === 'sand') { ctx.fillStyle = '#d8c08a'; ctx.beginPath(); ctx.moveTo(-6 * s, 4 * s); ctx.quadraticCurveTo(0, -7 * s, 6 * s, 4 * s); ctx.closePath(); ctx.fill(); }
  else if (type === 'rocket') { ctx.fillStyle = '#333'; rr(-5 * s, -2 * s, 10 * s, 5 * s, 1.5 * s); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-5 * s, 0); ctx.lineTo(-9 * s, -2.5 * s); ctx.lineTo(-9 * s, 2.5 * s); ctx.closePath(); ctx.fill(); }
  else if (type === 'magnet') { ctx.strokeStyle = col; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(0, -1 * s, 4.5 * s, Math.PI, 0); ctx.lineTo(4.5 * s, 4 * s); ctx.moveTo(-4.5 * s, -1 * s); ctx.lineTo(-4.5 * s, 4 * s); ctx.stroke(); ctx.fillStyle = '#ddd'; ctx.fillRect(-6 * s, 3 * s, 3 * s, 2 * s); ctx.fillRect(3 * s, 3 * s, 3 * s, 2 * s); }
  else if (type === 'smoke') { ctx.fillStyle = col; for (const [dx, dy, r] of [[-3, 1, 3.4], [2, 0, 3.8], [0, -3, 3.2]]) { ell(dx * s, dy * s, r * s, r * s); ctx.fill(); } }
  else if (type === 'whistle') { ctx.fillStyle = col; ell(1 * s, 0, 4 * s, 3.4 * s); ctx.fill(); ctx.fillRect(-7 * s, -3.4 * s, 6 * s, 2.6 * s); ctx.fillStyle = '#333'; ell(1.5 * s, 0, 1.3 * s, 1.3 * s); ctx.fill(); }
  else if (type === 'glue') { ctx.fillStyle = col; ell(0, 2 * s, 6 * s, 3 * s); ctx.fill(); ctx.fillStyle = '#e9f5ea'; rr(-2.6 * s, -6 * s, 5.2 * s, 7 * s, 1.5 * s); }
  else if (type === 'megaball') { ctx.fillStyle = '#ffffff'; ell(0, 0, 6 * s, 6 * s); ctx.fill(); ctx.fillStyle = '#222'; ell(-2 * s, -1 * s, 1.6 * s, 1.6 * s); ctx.fill(); ell(2.4 * s, 1.6 * s, 1.6 * s, 1.6 * s); ctx.fill(); }
  else if (type === 'shield') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -6 * s); ctx.lineTo(5.5 * s, -3.5 * s); ctx.quadraticCurveTo(5 * s, 4 * s, 0, 6.5 * s); ctx.quadraticCurveTo(-5 * s, 4 * s, -5.5 * s, -3.5 * s); ctx.closePath(); ctx.fill(); }
  else if (type === 'decoy') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -1 * s, 5 * s, Math.PI, 0); ctx.lineTo(5 * s, 5 * s); for (let k = 4; k >= -4; k -= 2) ctx.lineTo(k * s, k % 4 === 0 ? 3.5 * s : 5 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#222'; ell(-1.8 * s, -1 * s, 1 * s, 1.2 * s); ctx.fill(); ell(1.8 * s, -1 * s, 1 * s, 1.2 * s); ctx.fill(); }
  else if (type === 'megaphone') { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-5 * s, -2 * s); ctx.lineTo(5 * s, -5.5 * s); ctx.lineTo(5 * s, 5.5 * s); ctx.lineTo(-5 * s, 2 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(-7 * s, -2 * s, 2.4 * s, 4 * s); }
  else if (type === 'sling') { ctx.strokeStyle = '#8a5a37'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(0, 6 * s); ctx.lineTo(0, 0); ctx.lineTo(-4.5 * s, -6 * s); ctx.moveTo(0, 0); ctx.lineTo(4.5 * s, -6 * s); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(-4.5 * s, -6 * s); ctx.quadraticCurveTo(0, -1 * s, 4.5 * s, -6 * s); ctx.stroke(); }
  else if (type === 'blaster') { ctx.fillStyle = col; rr(-7 * s, -3 * s, 12 * s, 5 * s, 1.5 * s); ctx.fillStyle = '#3a7bff'; rr(-3 * s, 1 * s, 3.4 * s, 5 * s, 1 * s); ctx.fillStyle = '#ffd23f'; ctx.fillRect(5 * s, -2 * s, 3 * s, 3 * s); }
  else if (type === 'replay') { ctx.strokeStyle = col; ctx.lineWidth = 2 * s; rrs(-6 * s, -4.5 * s, 12 * s, 9 * s, 2 * s); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-1.8 * s, -2.6 * s); ctx.lineTo(2.8 * s, 0); ctx.lineTo(-1.8 * s, 2.6 * s); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function drawItem(it) {
  const G = proj(it.x, it.y), P = proj(it.x, it.y, it.z);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ell(G.x, G.y, 6 * G.s, 2.4 * G.s); ctx.fill();
  if (it.landed && it.age > 14 && Math.floor(S.time * 8) % 2) return;
  const bob = it.landed ? Math.sin(S.time * 4 + it.x) * 2 * P.s : 0;
  if (it.landed) { ctx.strokeStyle = 'rgba(255,210,63,.6)'; ctx.lineWidth = 1.5; ell(G.x, G.y, 10 * G.s, 4 * G.s); ctx.stroke(); }
  drawIcon(it.type, P.x, P.y - 8 * P.s + bob, P.s * 1.1);
}
function drawHUD() {
  // scoreboard
  const cx = LW / 2;
  ctx.fillStyle = 'rgba(6,11,10,.88)'; rr(cx - 210, 10, 420, 52, 8);
  ctx.fillStyle = TEAM[0].col; ctx.fillRect(cx - 210, 10, 6, 52); ctx.fillStyle = TEAM[1].col; ctx.fillRect(cx + 204, 10, 6, 52);
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#eef2e6';
  ctx.font = `600 22px ${UI}`; ctx.textAlign = 'left'; ctx.fillText(TEAM[0].short, cx - 192, 37);
  ctx.textAlign = 'right'; ctx.fillText(TEAM[1].short, cx + 192, 37);
  ctx.font = `700 46px ${DISP}`; ctx.textAlign = 'center';
  ctx.fillText(S.score[0], cx - 72, 41); ctx.fillText(S.score[1], cx + 72, 41);
  const c = Math.max(0, Math.ceil(S.clock));
  ctx.font = `600 30px ${DISP}`; ctx.fillStyle = S.clock < 20 && S.phase === 'play' ? '#ff6b6b' : '#ffd23f';
  const clockTxt = S.phase === 'menu' ? 'LIVE' : S.mode === 'playground' ? '∞' : S.shoot ? `PENS ${S.shoot.goals[0]}–${S.shoot.goals[1]}` : `${S.golden ? 'GG ' : ''}${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
  if (S.shoot || S.golden) ctx.font = `600 24px ${DISP}`;
  ctx.fillText(clockTxt, cx, 39);
  drawCrowdMeter(cx);
  // human panels
  const ph = S.humans.filter(h => !h.remote);
  ph.slice(0, 2).forEach((h, i) => { drawPanel(h, i === 0 ? 14 : LW - 344); drawHotbar(h, i === 1); });
  if (S.refHuman) drawRefPanel();
  // feed
  const fx = 14, fy0 = ph.length ? 170 : S.refHuman ? 118 : 20, fx2 = ph.length > 1 ? LW - 344 : null;
  ctx.font = `500 15px ${UI}`; ctx.textAlign = 'left';
  S.feed.slice(0, 4).forEach((f, i) => {
    const a = Math.max(0, Math.min(1, (9 - f.t) / 1.5)); if (a <= 0) return;
    const w = Math.min(ctx.measureText(f.text).width + 16, fx2 ? 300 : 440), y = fy0 + i * 20;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(6,11,10,.78)'; rr(fx, y, w, 18, 4);
    ctx.fillStyle = f.col; ctx.fillText(f.text, fx + 8, y + 9.5, w - 14); ctx.globalAlpha = 1;
  });
  if (S.net && NET) { ctx.fillStyle = 'rgba(238,242,230,.6)'; ctx.font = `500 15px ${UI}`; ctx.textAlign = 'right'; ctx.fillText('Room ' + NET.code + (S.net === 'host' ? ' · you are host' : ''), LW - 16, 26); }
  if (S.net && NET && SHOW_PING) {
    const host = NET.meta && NET.meta.host;
    ctx.font = `600 13px ${UI}`; ctx.textAlign = 'right';
    rosterList().filter(r => r.uid !== host).slice(0, 9).forEach((r, i) => {
      const ms = NET.pings[r.uid];
      ctx.fillStyle = ms == null ? '#93a799' : ms < 80 ? '#7dff9b' : ms < 150 ? '#ffd23f' : '#ff6b80';
      ctx.fillText(`${r.name}${r.uid === NET.uid ? ' (you)' : ''}  ${ms == null ? '…' : ms + ' ms'}`, LW - 16, 46 + i * 16);
    });
  }
  if (S.mode === 'watch' && S.phase === 'play') { ctx.fillStyle = 'rgba(238,242,230,.6)'; ctx.font = `500 15px ${UI}`; ctx.textAlign = 'right'; ctx.fillText('Esc for menu', LW - 16, 26); }
  if (muted) { ctx.fillStyle = 'rgba(238,242,230,.6)'; ctx.font = `500 14px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('MUTED (M)', cx, 74); }
  ctx.textBaseline = 'alphabetic';
  drawMinimap(); drawPlayerPointers();
}
const MINI_W = 270;
function drawMinimap() {
  const mw = MINI_W, mh = mw * H / W, x0 = LW / 2 - mw / 2, y0 = LH - mh - 12, sx = mw / W, sy = mh / H;
  const X = x => x0 + clamp(x, 0, W) * sx, Y = y => y0 + clamp(y, 0, H) * sy;
  ctx.save();
  ctx.fillStyle = 'rgba(6,11,10,.4)'; rr(x0 - 7, y0 - 7, mw + 14, mh + 14, 8);
  ctx.fillStyle = 'rgba(46,150,78,.26)'; ctx.fillRect(x0, y0, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, mw - 1, mh - 1);
  ctx.beginPath(); ctx.moveTo(x0 + mw / 2, y0); ctx.lineTo(x0 + mw / 2, y0 + mh); ctx.stroke();
  ctx.beginPath(); ctx.arc(x0 + mw / 2, y0 + mh / 2, CIRCLE_R * sx, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeRect(x0 + 0.5, Y(H / 2 - BOX_HALF), BOX_D * sx, BOX_HALF * 2 * sy);
  ctx.strokeRect(x0 + mw - BOX_D * sx - 0.5, Y(H / 2 - BOX_HALF), BOX_D * sx, BOX_HALF * 2 * sy);
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x0 - 3, Y(H / 2 - GOAL_HALF), 3, GOAL_HALF * 2 * sy); ctx.fillRect(x0 + mw, Y(H / 2 - GOAL_HALF), 3, GOAL_HALF * 2 * sy);
  for (const r of S.refs) {   // referee vision
    if (r.gone > 0) continue;
    if (r.blind > 0) continue;
    ctx.fillStyle = r.human ? 'rgba(255,236,140,.22)' : 'rgba(255,236,140,.13)';
    ctx.beginPath(); ctx.moveTo(X(r.x), Y(r.y)); ctx.arc(X(r.x), Y(r.y), r.range * sx, r.face - r.fov / 2, r.face + r.fov / 2); ctx.closePath(); ctx.fill();
  }
  for (const p of S.players) {
    if (!onPitch(p)) continue;
    ctx.fillStyle = p.gk ? (p.team === 0 ? '#c6f04a' : '#b57cff') : TEAM[p.team].col;
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.human ? 4.4 : 3.2, 0, Math.PI * 2); ctx.fill();
    if (p.human) { ctx.strokeStyle = HUMAN_COL[p.human.idx % HUMAN_COL.length]; ctx.lineWidth = 2; ctx.stroke(); }
  }
  for (const r of S.refs) { if (r.gone > 0) continue; ctx.fillStyle = '#111'; ctx.strokeStyle = r.human ? '#ffd23f' : '#d9c46a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(r.x), Y(r.y), 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  const b = S.ball; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(b.x), Y(b.y), 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawPlayerPointers() {   // edge arrow for each local player (or your referee) who is off screen
  if (S.phase === 'menu') return;
  const marks = [];
  for (const h of S.humans) {
    if (h.remote) continue;
    const p = S.players[h.pid]; if (!p || !onPitch(p)) continue;
    marks.push({ x: p.x, y: p.y, col: HUMAN_COL[h.idx % HUMAN_COL.length], label: h.label || 'P' + (h.idx + 1) });
  }
  if (S.refHuman && S.refs[0]) marks.push({ x: S.refs[0].x, y: S.refs[0].y, col: '#ffd23f', label: 'REF' });
  const m = 36, top = 160, bot = LH - 30, cx = LW / 2, cy = LH / 2, b = S.ball;
  for (const mk of marks) {
    const P = proj(mk.x, mk.y, 20);
    if (P.x >= m && P.x <= LW - m && P.y >= top - 60 && P.y <= bot) continue;
    const dx = P.x - cx, dy = P.y - cy;
    const kx = dx > 0 ? (LW - m - cx) / dx : dx < 0 ? (m - cx) / dx : Infinity, ky = dy > 0 ? (bot - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity;
    const k = Math.min(kx, ky), ex = cx + dx * k, ey = cy + dy * k, a2 = Math.atan2(dy, dx);
    const meters = Math.round(Math.hypot(b.x - mk.x, b.y - mk.y) / (W / 105));
    ctx.save(); ctx.translate(ex, ey);
    ctx.save(); ctx.rotate(a2); ctx.fillStyle = mk.col; ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(18, -7); ctx.lineTo(18, 7); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(6,11,10,.82)'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = mk.col; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = mk.col; ctx.font = `700 12px ${UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(mk.label, 0, 0.5);
    ctx.fillStyle = '#eef2e6'; ctx.font = `600 11px ${UI}`; ctx.fillText(meters + ' m from ball', 0, 27);
    ctx.restore();
  }
}
const BUFF_LABEL = { powerShot: ['POWER SHOT', '#ff4d4d'], curveDrive: ['CURVE', '#ff9a6b'], meteorShot: ['METEOR SHOT', '#ff7a2f'], cloak: ['CLOAKED', '#8a4dff'], stealth: ['STEALTH', '#8a4dff'], speedDribble: ['SPEED DRIBBLE', '#ffcc22'], timeRush: ['TIME RUSH', '#ffd23f'], boost: ['BOOST', '#7dff9b'], assist: ['ASSISTED', '#3a7bff'], perfect: ['PERFECT PLAY', '#3a7bff'], awaken: ['AWAKENED', '#ffb000'], rage: ['RAGE', '#ff4d4d'], marked: ['MARKED', '#f2c230'], confused: ['CONFUSED', '#c45cff'], wideGuard: ['WIDE GUARD', '#3fbf5f'], morale: ['MORALE', '#ffb000'], auraOff: ['OFF. AURA', '#ffb000'], auraDef: ['DEF. AURA', '#ffb000'], auraSpd: ['SPD. AURA', '#ffb000'] };
function drawPanel(h, x) {
  const p = S.players[h.pid]; if (!p) return;
  const col = HUMAN_COL[h.idx % HUMAN_COL.length], y = 10, w = 330, H2 = 152, bind = h.map || MAPSOLO;
  ctx.fillStyle = 'rgba(6,11,10,.9)'; rr(x, y, w, H2, 10);
  ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; rrs(x + 0.5, y + 0.5, w - 1, H2 - 1, 10); ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle';
  const label = h.label || 'P' + (h.idx + 1);
  ctx.font = `700 14px ${UI}`; const bw = ctx.measureText(label).width + 14;
  ctx.fillStyle = col; rr(x + 10, y + 9, bw, 18, 4);
  ctx.fillStyle = '#10140a'; ctx.textAlign = 'center'; ctx.fillText(label, x + 10 + bw / 2, y + 18.5);
  const nm = `#${p.num} ${p.name}`;
  ctx.textAlign = 'left'; ctx.fillStyle = '#eef2e6'; ctx.font = `600 18px ${UI}`; ctx.fillText(nm, x + 18 + bw, y + 18.5);
  const nmw = ctx.measureText(nm).width;
  ctx.fillStyle = TEAM[p.team].col; ctx.font = `600 12px ${UI}`; ctx.fillText(TEAM[p.team].short, x + 26 + bw + nmw, y + 19);
  const seen = onPitch(p) && watched(p);
  const st = !onPitch(p) ? `${p.goneWhy === 'ufo' ? 'ABDUCTED' : p.goneWhy === 'pir' ? 'KIDNAPPED' : 'ON THE BENCH'} ${Math.ceil(p.sentOff)}s` : p.ko > 0 ? `K.O. ${Math.ceil(p.ko)}s` : seen ? 'REF WATCHING' : inSmoke(p.x, p.y) ? 'IN SMOKE' : 'UNSEEN';
  const sc = !onPitch(p) || p.ko > 0 ? '#ff4d4d' : seen ? '#ff6b80' : '#7dff9b';
  ctx.font = `700 11px ${UI}`; const sw = ctx.measureText(st).width + 14;
  ctx.globalAlpha = 0.18; ctx.fillStyle = sc; rr(x + w - 10 - sw, y + 10, sw, 17, 8.5); ctx.globalAlpha = 1;
  ctx.fillStyle = sc; ctx.textAlign = 'center'; ctx.fillText(st, x + w - 10 - sw / 2, y + 18.5);
  const bar = (yy, h3, label, frac, colr, right, rightCol, extra) => {
    ctx.textAlign = 'left'; ctx.fillStyle = '#93a799'; ctx.font = `700 11px ${UI}`; ctx.fillText(label, x + 12, yy + h3 / 2 + 0.5);
    ctx.fillStyle = '#1b2621'; rr(x + 70, yy, 196, h3, Math.min(4, h3 / 2));
    if (extra) extra(x + 70, yy, 196, h3);
    ctx.fillStyle = colr; ctx.fillRect(x + 70, yy, 196 * clamp(frac, 0, 1), h3);
    ctx.textAlign = 'right'; ctx.fillStyle = rightCol || '#eef2e6'; ctx.font = `700 12px ${UI}`; ctx.fillText(right, x + w - 12, yy + h3 / 2 + 0.5);
  };
  // health (red ghost shows damage just taken), stamina (hatched part is lost to injury), crowd meter, charge
  h.ghost = h.ghost == null ? p.hp : Math.max(p.hp, h.ghost - 0.5);
  bar(y + 32, 11, 'HP', p.hp / 100, p.hp > 60 ? '#5ef08a' : p.hp > 30 ? '#ffd23f' : '#ff4d6d', Math.ceil(p.hp) + '/100', null, (bx, by, bw2, bh) => { ctx.fillStyle = 'rgba(255,107,107,.55)'; ctx.fillRect(bx, by, bw2 * h.ghost / 100, bh); });
  bar(y + 48, 8, 'STAMINA', p.stamina / 100, p.stamina < 20 ? '#ff9f43' : '#7cf2c4', p.injury > 0 ? `${Math.round(p.stamina)} · INJURED` : `${Math.round(p.stamina)}%`, p.injury > 0 ? '#ff9a9a' : null, (bx, by, bw2, bh) => {
    if (p.staminaMax < 100) { const ix = bx + bw2 * p.staminaMax / 100; ctx.fillStyle = 'rgba(255,90,110,.35)'; ctx.fillRect(ix, by, bx + bw2 - ix, bh); ctx.strokeStyle = 'rgba(255,90,110,.8)'; ctx.lineWidth = 1; for (let k = ix; k < bx + bw2; k += 5) { ctx.beginPath(); ctx.moveTo(k, by + bh); ctx.lineTo(k + 4, by); ctx.stroke(); } }
  });
  bar(y + 61, 6, 'CROWD', p.hype / 30, '#ffd23f', '★ ' + p.pop, '#ffd23f');
  bar(y + 72, 8, 'CHARGE', p.charge / 100, p.sprinting ? '#b8faff' : '#4fd6ff', p.charge >= 25 ? 'POWER READY' : Math.round(p.charge) + '%', '#4fd6ff', (bx, by) => { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(bx + 196 * 0.25, by - 2, 1.5, 12); });
  // karma, referee opinion, mood
  const chip = (cx, text, c) => { ctx.font = `700 11px ${UI}`; const cw = ctx.measureText(text).width + 14; ctx.globalAlpha = 0.16; ctx.fillStyle = c; rr(cx, y + 86, cw, 15, 7.5); ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.fillText(text, cx + 7, y + 94); return cw; };
  const kc = p.karma >= 20 ? '#7dff9b' : p.karma <= -20 ? '#ff6b80' : '#c9d3cb', op = refOpinion(p), oc = op >= 30 ? '#7dff9b' : op <= -30 ? '#ff6b80' : '#c9d3cb';
  const mc = p.mood >= MOOD_ZONE ? '#ffd23f' : p.mood <= MOOD_TILT ? '#ff6b80' : '#c9d3cb';
  let cx2 = x + 12;
  cx2 += chip(cx2, `KARMA ${p.karma > 0 ? '+' : ''}${Math.round(p.karma)}`, kc) + 5;
  cx2 += chip(cx2, `REF ${op >= 30 ? 'TRUSTS' : op <= -30 ? 'MARKED' : 'NEUTRAL'} ${op > 0 ? '+' : ''}${op}`, oc) + 5;
  chip(cx2, `MOOD ${moodName(p.mood)} ${p.mood > 0 ? '+' : ''}${Math.round(p.mood)}`, mc);
  // item slots: sand, flash powder, bat, and the selected throwable
  const thr = selectedThrowable(p);
  const slots = [
    { icon: 'sand', n: p.blind, key: bind.blind[0], prog: p.blind < 2 ? p.blindT / 22 : 0, off: p.items.flash > 0 },
    { icon: 'flash', n: p.items.flash, key: bind.blind[0], hot: p.items.flash > 0 },
    p.items.sling > 0 || p.items.blaster > 0 ? { icon: p.items.sling > 0 ? 'sling' : 'blaster', n: p.items.sling > 0 ? p.items.sling : p.items.blaster, key: bind.foul[0], hot: true } : p.items.sword > 0 ? { icon: 'sword', n: p.items.sword, key: bind.foul[0], hot: true } : { icon: 'bat', n: p.items.bat, key: bind.foul[0], hot: p.items.bat > 0 },
    { icon: thr, n: p.items[thr] || 0, key: bind.item[0], extra: throwCount(p) > (p.items[thr] || 0) ? '+' : '' }
  ];
  slots.forEach((sl, i) => {
    const sx = x + 10 + i * 78, sy = y + 106, sw3 = 72, sh = 26;
    ctx.fillStyle = sl.hot ? 'rgba(255,210,63,.14)' : 'rgba(255,255,255,.05)'; rr(sx, sy, sw3, sh, 5);
    if (sl.hot) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.2; rrs(sx + 0.5, sy + 0.5, sw3 - 1, sh - 1, 5); }
    ctx.globalAlpha = sl.n > 0 && !sl.off ? 1 : 0.32; drawIcon(sl.icon, sx + 14, sy + 13, 1.1);
    ctx.fillStyle = '#eef2e6'; ctx.font = `700 13px ${UI}`; ctx.textAlign = 'left'; ctx.fillText('×' + sl.n + (sl.extra || ''), sx + 25, sy + 13.5); ctx.globalAlpha = 1;
    const kl = keyLabel(sl.key); ctx.font = `700 11px ${UI}`; const kw = Math.max(16, ctx.measureText(kl).width + 8);
    ctx.strokeStyle = 'rgba(238,242,230,.35)'; ctx.lineWidth = 1; ctx.strokeRect(sx + sw3 - kw - 5 + 0.5, sy + 6.5, kw, 14);
    ctx.fillStyle = '#c9d3cb'; ctx.textAlign = 'center'; ctx.fillText(kl, sx + sw3 - 5 - kw / 2, sy + 14);
    if (sl.prog) { ctx.fillStyle = '#d8c08a'; ctx.fillRect(sx + 4, sy + sh - 3, (sw3 - 8) * sl.prog, 2); }
  });
  // active power-ups and grudge
  const fx = p.fx || {}, act = [];
  if (fx.rocket > 0) act.push([`ROCKET ×${fx.rocket}`, ITEM_COL.rocket]); if (fx.magnet > 0) act.push([`MAGNET ${Math.ceil(fx.magnet)}s`, ITEM_COL.magnet]);
  if (fx.shield > 0) act.push([`SHIELD ${Math.ceil(fx.shield)}s`, ITEM_COL.shield]); if (fx.megaphone > 0) act.push([`MEGAPHONE ${Math.ceil(fx.megaphone)}s`, ITEM_COL.megaphone]);
  if (p.slowT > 0) act.push(['GLUED', ITEM_COL.glue]);
  for (const k in (p.bf || {})) if (BUFF_LABEL[k] && p.bf[k] > 0) act.push([`${BUFF_LABEL[k][0]} ${Math.ceil(p.bf[k])}s`, BUFF_LABEL[k][1]]);
  let ax = x + 12; ctx.textAlign = 'left'; ctx.font = `700 11px ${UI}`;
  for (const [t, c] of act) { ctx.fillStyle = c; ctx.fillText(t, ax, y + 142); ax += ctx.measureText(t).width + 10; }
  const g = topGrudge(p);
  if (g) { ctx.textAlign = 'right'; ctx.fillStyle = '#ffb36b'; ctx.fillText(`GRUDGE: ${g.name.toUpperCase()} ×${g.n}`, x + w - 12, y + 142); }
  ctx.textBaseline = 'alphabetic';
}
// Crowd support tug-of-war under the scoreboard; hold Tab for every opinion category.
function drawCrowdMeter(cx) {
  const C = S.crowd; if (!C || S.phase === 'menu') return;
  const y = 66, w = 420, x = cx - w / 2, s0 = clamp(C.support, 0, 1);
  ctx.fillStyle = 'rgba(6,11,10,.82)'; rr(x, y, w, 20, 6);
  ctx.fillStyle = TEAM[0].col; ctx.fillRect(x + 4, y + 4, (w - 8) * s0, 5);
  ctx.fillStyle = TEAM[1].col; ctx.fillRect(x + 4 + (w - 8) * s0, y + 4, (w - 8) * (1 - s0), 5);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 4 + (w - 8) * s0 - 1, y + 2, 2, 9);
  ctx.font = `700 10px ${UI}`; ctx.textBaseline = 'middle';
  const cat = t => CROWD_CATS.find(c => c[0] === topCat(C.op[t]));
  ctx.textAlign = 'left'; ctx.fillStyle = '#c9d3cb'; ctx.fillText(`CROWD ${Math.round(s0 * 100)}% · ${cat(0)[1].toUpperCase()}`, x + 6, y + 15);
  ctx.textAlign = 'right'; ctx.fillText(`${cat(1)[1].toUpperCase()} · ${Math.round((1 - s0) * 100)}%`, x + w - 6, y + 15);
  if (C.press) { ctx.textAlign = 'center'; ctx.fillStyle = '#ff9a6b'; ctx.fillText(`CROWD PRESSURE ON ${TEAM[C.press.team].short}`, cx, y + 15); }
  else { ctx.textAlign = 'center'; ctx.fillStyle = '#93a799'; ctx.fillText('HOLD TAB', cx, y + 15); }
  const mutOn = MUT_LIST.filter(([k]) => MUT[k]).map(m => m[1]);
  drawAnomMeter(cx, y + 23); ctx.font = `700 10px ${UI}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  if (mutOn.length) { ctx.fillStyle = '#c9a0ff'; ctx.fillText(mutOn.join(' · ').toUpperCase(), cx, y + 48); }
  if (REPLAY.active && REPLAY.active.t >= 0) { ctx.fillStyle = 'rgba(6,11,10,.85)'; rr(cx - 50, y + 58, 100, 22, 6); ctx.fillStyle = Math.floor(S.time * 3) % 2 ? '#ff4d4d' : '#ff9a9a'; ell(cx - 34, y + 69, 4, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `700 13px ${UI}`; ctx.fillText('REPLAY', cx + 6, y + 69.5); }
  if (keys.has('Tab')) {   // full opinion breakdown
    const pw = 460, px = cx - pw / 2, py = y + 86;
    ctx.fillStyle = 'rgba(6,11,10,.92)'; rr(px, py, pw, 150, 10);
    [0, 1].forEach(t => {
      const bx = px + 16 + t * 226;
      ctx.textAlign = 'left'; ctx.fillStyle = TEAM[t].col; ctx.font = `700 13px ${UI}`; ctx.fillText(`${TEAM[t].short} · ${Math.round((t ? 1 - s0 : s0) * 100)}% SUPPORT`, bx, py + 16);
      CROWD_CATS.forEach(([k, label, c], j) => {
        const yy = py + 34 + j * 18, v = C.op[t][k] || 0;
        ctx.fillStyle = '#93a799'; ctx.font = `600 11px ${UI}`; ctx.fillText(label.toUpperCase(), bx, yy);
        ctx.fillStyle = '#1b2621'; ctx.fillRect(bx + 86, yy - 4, 110, 8); ctx.fillStyle = c; ctx.fillRect(bx + 86, yy - 4, 110 * v / 100, 8);
      });
    });
  }
  ctx.textBaseline = 'alphabetic';
}
// Over-the-pitch extras shared by the classic and 3D views.
const TRAIL = [];
function drawWorldExtras() {
  const big = proj === proj2d;
  drawAnomalies(); drawClassFx();
  for (const z of S.smokes || []) {   // smoke clouds
    const P = proj(z.x, z.y, 22), a = Math.min(1, z.ttl / 1.2) * 0.75;
    for (let k = 0; k < 7; k++) {
      const ang = k * 0.9 + S.time * 0.3, rr2 = z.r * (0.35 + 0.25 * Math.sin(k * 2.1 + S.time));
      const Q = proj(z.x + Math.cos(ang) * rr2, z.y + Math.sin(ang) * rr2 * 0.7, 18 + (k % 3) * 10);
      const g = ctx.createRadialGradient(Q.x, Q.y, 0, Q.x, Q.y, z.r * 0.6 * Q.s);
      g.addColorStop(0, `rgba(190,196,200,${a})`); g.addColorStop(1, 'rgba(190,196,200,0)'); ctx.fillStyle = g; ctx.fillRect(Q.x - z.r * Q.s, Q.y - z.r * Q.s, z.r * 2 * Q.s, z.r * 2 * Q.s);
    }
    void P;
  }
  // power-shot trail
  const b = S.ball;
  if (b.trail && !b.owner) { TRAIL.push({ x: b.x, y: b.y, z: b.z || 0 }); if (TRAIL.length > 18) TRAIL.shift(); } else TRAIL.length = 0;
  if (TRAIL.length > 2 && big) { ctx.strokeStyle = b.trail; ctx.lineCap = 'round'; for (let i = 1; i < TRAIL.length; i++) { const A = proj(TRAIL[i - 1].x, TRAIL[i - 1].y, TRAIL[i - 1].z + 4), B = proj(TRAIL[i].x, TRAIL[i].y, TRAIL[i].z + 4); ctx.globalAlpha = i / TRAIL.length; ctx.lineWidth = 1 + 5 * i / TRAIL.length; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); } ctx.globalAlpha = 1; }
  // banners in the stands
  for (const bn of (S.crowd && S.crowd.banners) || []) {
    const P = big ? proj(bn.x, -70, 0) : proj(bn.x, -125, 48), a = Math.min(1, bn.life / 1.5, (12 - bn.life) * 2);
    ctx.globalAlpha = Math.max(0, a); ctx.font = `700 ${Math.round(17 * Math.max(0.7, P.s))}px ${DISP}`; const tw = ctx.measureText(bn.text).width + 26, th = 24 * Math.max(0.7, P.s);
    ctx.fillStyle = TEAM[bn.team].col; ctx.beginPath(); for (let k = 0; k <= 10; k++) { const xx = P.x - tw / 2 + tw * k / 10; ctx.lineTo(xx, P.y - th + Math.sin(S.time * 3 + k) * 2); } for (let k = 10; k >= 0; k--) { const xx = P.x - tw / 2 + tw * k / 10; ctx.lineTo(xx, P.y + Math.sin(S.time * 3 + k) * 2); } ctx.closePath(); ctx.fill();
    ctx.fillStyle = bn.team === 0 ? '#0b1a2a' : '#fff4ee'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bn.text, P.x, P.y - th / 2 + 1); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
  for (const p of S.players) {
    if (!onPitch(p)) continue;
    const down = p.stun > 0 || p.ko > 0;
    // bounty
    if (S.bounty && S.bounty.pid === p.id) { const P = proj(p.x, p.y, down ? 24 : 66); drawLabelPill(P.x, P.y, Math.max(0.8, P.s), '#ffd23f', `$ BOUNTY ${Math.ceil(S.bounty.t)}s`); }
    // mood and injury icons
    const H0 = proj(p.x, p.y, down ? 12 : 42), s = Math.max(0.7, H0.s);
    if (p.mood >= MOOD_ZONE) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4 + S.time * 2; ctx.beginPath(); ctx.moveTo(H0.x + 12 * s + Math.cos(a) * 2 * s, H0.y + Math.sin(a) * 2 * s); ctx.lineTo(H0.x + 12 * s + Math.cos(a) * 5 * s, H0.y + Math.sin(a) * 5 * s); ctx.stroke(); } }
    else if (p.mood <= MOOD_TILT) { ctx.fillStyle = p.mood <= MOOD_MELT ? '#ff6b80' : '#8a949a'; for (const [dx, r] of [[-3, 3], [0, 3.8], [3.4, 3]]) { ell(H0.x + 12 * s + dx * s, H0.y - 2 * s, r * s, r * 0.8 * s); ctx.fill(); } }
    if (p.injury > 0) { ctx.fillStyle = '#ffffff'; rr(H0.x - 17 * s, H0.y - 4 * s, 8 * s, 8 * s, 1.5 * s); ctx.fillStyle = '#e23b3b'; ctx.fillRect(H0.x - 13.8 * s, H0.y - 2.8 * s, 1.6 * s, 5.6 * s); ctx.fillRect(H0.x - 15.8 * s, H0.y - 0.8 * s, 5.6 * s, 1.6 * s); }
    if (p.fx && p.fx.shield > 0) { const Q = proj(p.x, p.y, 20); ctx.strokeStyle = 'rgba(111,196,255,.7)'; ctx.lineWidth = 2; ell(Q.x, Q.y, 16 * Q.s, 20 * Q.s); ctx.stroke(); }
    if (p.freezeT > 0) { const Q = proj(p.x, p.y, 50); ctx.fillStyle = '#ffffff'; ctx.font = `700 ${12 * Q.s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('?!', Q.x, Q.y); }
  }
  // speech bubbles from taunts
  for (const u of S.bubbles || []) {
    const p = S.players[u.pid]; if (!p || !onPitch(p)) continue;
    const owner = p.skinOwner || (p.human && p.human.id); if (NET && NET.muted && owner && NET.muted.has(owner)) continue;
    const P = proj(p.x, p.y, 70), a = Math.min(1, u.life * 2);
    ctx.globalAlpha = a; ctx.font = `700 ${Math.round(14 * Math.max(0.8, P.s))}px ${UI}`; const tw = ctx.measureText(u.text).width + 16, th = 22;
    ctx.fillStyle = '#ffffff'; rr(P.x - tw / 2, P.y - th, tw, th, 8); ctx.beginPath(); ctx.moveTo(P.x - 5, P.y - 1); ctx.lineTo(P.x + 5, P.y - 1); ctx.lineTo(P.x, P.y + 7); ctx.fill();
    ctx.fillStyle = '#10140a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.text, P.x, P.y - th / 2 + 1); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
  drawTauntWheel();
}
function drawTauntWheel() {
  const wheels = [];
  for (const h of S.humans) if (!h.remote && h.tauntOpen && S.players[h.pid]) wheels.push([S.players[h.pid], h.tauntSel]);
  if (NET && NET.inH && NET.inH.tauntOpen) { const me = S.players.find(p => p.human && p.human.local); if (me) wheels.push([me, NET.inH.tauntSel]); }
  for (const [p, sel] of wheels) {
    const P = proj(p.x, p.y, 30);
    ctx.fillStyle = 'rgba(6,11,10,.55)'; ell(P.x, P.y, 92, 92); ctx.fill();
    TAUNTS.forEach((t, i) => {
      const a = TAUNT_ANG[t.dir] * Math.PI / 180, x = P.x + Math.cos(a) * 66, y = P.y + Math.sin(a) * 66, on = i === sel;
      ctx.font = `700 13px ${UI}`; const tw = ctx.measureText(t.text).width + 14;
      ctx.fillStyle = on ? '#ffd23f' : 'rgba(238,242,230,.9)'; rr(x - tw / 2, y - 10, tw, 20, 10);
      ctx.fillStyle = '#10140a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.text, x, y + 0.5); ctx.textBaseline = 'alphabetic';
    });
  }
}
// Ground-level extras for the classic view (the 3D view draws its own).
function drawFires() {   // ground fire left by a power shot: a scorch mark under flickering flames
  for (const f of S.fires || []) {
    const P = proj(f.x, f.y), s = P.s, k = 1 - f.t / f.life, fl = 0.75 + 0.25 * Math.sin(S.time * 22 + f.ph);
    ctx.globalAlpha = 0.45 * k; ctx.fillStyle = '#1b0f08'; ell(P.x, P.y, f.r * 1.3 * s, f.r * 0.5 * s); ctx.fill();
    const hgt = (8 + f.r * 1.6) * s * k * fl, wid = f.r * 0.9 * s;
    for (let j = -1; j <= 1; j++) {
      const x = P.x + j * wid * 0.7, hh = hgt * (j ? 0.7 : 1), g = ctx.createLinearGradient(0, P.y, 0, P.y - hh);
      g.addColorStop(0, '#ff3b10'); g.addColorStop(0.5, '#ff9a1f'); g.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.globalAlpha = Math.min(1, k * 1.4); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - wid * 0.6, P.y); ctx.quadraticCurveTo(x - wid * 0.5, P.y - hh * 0.6, x + Math.sin(S.time * 9 + f.ph + j) * wid * 0.3, P.y - hh); ctx.quadraticCurveTo(x + wid * 0.5, P.y - hh * 0.6, x + wid * 0.6, P.y); ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
// The direction line while you hold shoot or a pass key with the ball (and a moment after release).
const AIM_COL = { shoot: '#ff6a3d', pass: '#ffffff', lpass: '#ffd23f', through: '#7df0ff' };
function drawAimGuides() {
  const list = S.net === 'client' ? (NET && NET.inH ? [[S.players.find(p => p.human && p.human.local), NET.inH]] : []) : (S.humans || []).filter(h => !h.remote).map(h => [S.players[h.pid], h]);
  for (const [p, h] of list) {
    if (!p || !onPitch(p) || S.ball.owner !== p || !h || !(h.charging || h.lineT > 0) || S.setPiece) continue;
    const kind = h.charging ? h.chargeKind : h.lineKind; if (!kind) continue; h.lineKind = kind;
    const pw = Math.max(0.25, h.charging ? h.charge : 0.5), a = h.charging ? 1 : clamp(h.lineT / 0.35, 0, 1);
    let tx, ty, q = null;
    if (kind === 'shoot') {
      const ang = p.aimA != null ? p.aimA : p.face, gx = p.team === 0 ? W : 0, L = Math.cos(ang) * (gx - p.x) > 0 ? Math.min(900, Math.abs((gx - p.x) / Math.cos(ang))) : 260 + 300 * pw;
      tx = p.x + Math.cos(ang) * L; ty = p.y + Math.sin(ang) * L;
    } else { const pv = passPreview(p, kind, pw); tx = pv.x; ty = pv.y; q = pv.q; }
    const A = proj(p.x, p.y), B = proj(tx, ty), col = AIM_COL[kind];
    ctx.globalAlpha = 0.85 * a; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 5 * A.s; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.4 * A.s; ctx.setLineDash(kind === 'lpass' ? [10 * A.s, 7 * A.s] : kind === 'through' ? [3 * A.s, 5 * A.s] : []);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.setLineDash([]);
    const ang2 = Math.atan2(B.y - A.y, B.x - A.x), hs = 9 * B.s;   // arrow head, or a ring on the assisted team-mate
    ctx.fillStyle = col;
    if (q) { ctx.strokeStyle = col; ctx.lineWidth = 2.5 * B.s; ell(B.x, B.y, 15 * B.s, 6.5 * B.s); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x - Math.cos(ang2 - 0.45) * hs, B.y - Math.sin(ang2 - 0.45) * hs); ctx.lineTo(B.x - Math.cos(ang2 + 0.45) * hs, B.y - Math.sin(ang2 + 0.45) * hs); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
// "WHACK!" bursts: pop in, wobble, drift up and fade.
function drawWhacks() {
  for (const w of S.whacks || []) {
    const P = proj(w.x, w.y, 40 + w.t * 40), s = Math.max(0.7, P.s) * (w.big ? 1.3 : 1);
    const pop = w.t < 0.1 ? 0.3 + 7 * w.t : 1 + 0.25 * Math.max(0, 0.25 - w.t) * 4, sc = s * pop, a = clamp((0.8 - w.t) / 0.3, 0, 1);
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(w.rot + Math.sin(w.t * 30) * 0.06 * Math.max(0, 0.4 - w.t)); ctx.globalAlpha = a;
    ctx.beginPath(); const n = 12;
    for (let i = 0; i <= n * 2; i++) { const r = (i % 2 ? 15 : 28 + (i % 4 === 0 ? 6 : 0)) * sc, an = i / (n * 2) * Math.PI * 2; i ? ctx.lineTo(Math.cos(an) * r * 1.35, Math.sin(an) * r) : ctx.moveTo(Math.cos(an) * r * 1.35, Math.sin(an) * r); }
    ctx.closePath(); ctx.fillStyle = '#fff6d0'; ctx.fill(); ctx.lineWidth = 2.5 * sc; ctx.strokeStyle = '#140c06'; ctx.stroke();
    ctx.font = `700 ${Math.round(22 * sc)}px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4 * sc; ctx.strokeStyle = '#140c06'; ctx.strokeText(w.word, 0, 1 * sc); ctx.fillStyle = w.col; ctx.fillText(w.word, 0, 1 * sc);
    ctx.textBaseline = 'alphabetic'; ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawGroundExtras() {
  for (const g of S.puddles || []) { const P = proj(g.x, g.y); ctx.globalAlpha = Math.min(1, g.ttl / 2); ctx.fillStyle = 'rgba(92,207,106,.55)'; ell(P.x, P.y, 20 * P.s, 8 * P.s); ctx.fill(); ctx.fillStyle = 'rgba(200,255,200,.35)'; ell(P.x - 5 * P.s, P.y - 2 * P.s, 6 * P.s, 2.4 * P.s); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const d of S.decoys || []) {
    const P = proj(d.x, d.y), tm = TEAM[d.team], src = S.players[d.src];
    ctx.save(); ctx.globalAlpha = 0.55; ctx.translate(P.x, P.y);
    drawFigure(P.s, d.run, 1, { jersey: tm.col, shorts: tm.shorts, socks: tm.socks, skin: src ? src.skin : '#d9a477', hair: src ? src.hair : '#222', num: src ? src.num : null, numCol: '#0b1a2a', bigHead: MUT.bigHead });
    ctx.restore();
  }
}
function drawRefPanel() {
  const R = S.refHuman, r = S.refs[0], x = 14, y = 10, w = 330, b = BINDS[0], k = keyLabel;
  ctx.fillStyle = 'rgba(6,11,10,.9)'; rr(x, y, w, 100, 10);
  ctx.strokeStyle = '#ffd23f'; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; rrs(x + 0.5, y + 0.5, w - 1, 99, 10); ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd23f'; rr(x + 10, y + 9, 40, 18, 4);
  ctx.fillStyle = '#10140a'; ctx.font = `700 14px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('REF', x + 30, y + 18.5);
  ctx.textAlign = 'left'; ctx.fillStyle = '#eef2e6'; ctx.font = `600 18px ${UI}`; ctx.fillText('You are the referee', x + 58, y + 18.5);
  ctx.textAlign = 'right'; ctx.font = `700 12px ${UI}`; ctx.fillStyle = r.blind > 0 ? '#d8c08a' : R.track ? '#7dff9b' : '#9fb4ff';
  ctx.fillText(r.blind > 0 ? `BLINDED ${r.blind.toFixed(1)}s` : R.track ? 'TRACKING BALL' : 'FREE LOOK', x + w - 10, y + 18.5);
  const tot = R.correct + R.missed + R.wrong, rating = tot ? Math.round(100 * R.correct / tot) : 100;
  [['CORRECT', R.correct, '#7dff9b'], ['MISSED', R.missed, '#ffb36b'], ['WRONG', R.wrong, '#ff6b80'], ['RATING', rating + '%', '#ffd23f']].forEach(([l, v, c], i) => {
    const sx = x + 12 + i * 79; ctx.textAlign = 'left';
    ctx.fillStyle = '#93a799'; ctx.font = `700 11px ${UI}`; ctx.fillText(l, sx, y + 40);
    ctx.fillStyle = c; ctx.font = `600 30px ${DISP}`; ctx.fillText(String(v), sx, y + 62);
  });
  ctx.fillStyle = '#93a799'; ctx.font = `500 13px ${UI}`; ctx.textAlign = 'left';
  ctx.fillText(`${k(b.foul)} call foul · ${k(b.pass)} track ball on/off · ${k(b.lpass)} / ${k(b.item)} turn · hold ${k(b.shoot)} sprint`, x + 12, y + 87, w - 24);
  ctx.textBaseline = 'alphabetic';
}
function drawPauseMsg() {
  if (S.pause <= 0 || !S.pauseMsg) return;
  const a = Math.min(1, S.pause * 3);
  ctx.globalAlpha = a; ctx.textAlign = 'center';
  ctx.font = `700 92px ${DISP}`; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillText(S.pauseMsg, LW / 2 + 3, 400 + 3);
  ctx.fillStyle = S.pauseMsg === 'RED CARD' ? '#ff4d4d' : S.pauseMsg === 'YELLOW CARD' ? '#ffd23f' : '#ffffff';
  ctx.fillText(S.pauseMsg, LW / 2, 400);
  ctx.font = `600 24px ${UI}`; ctx.fillStyle = '#eef2e6'; ctx.fillText(S.pauseSub, LW / 2, 432);
  ctx.globalAlpha = 1;
}
function drawRefBlind() {
  if (S.refHuman && S.refs[0].blind > 0) {
    const a = Math.min(1, S.refs[0].blind) * 0.86;
    ctx.fillStyle = `rgba(48,36,14,${a})`; ctx.fillRect(0, 0, LW, LH);
    ctx.fillStyle = `rgba(216,192,138,${a * 0.6})`;
    for (let i = 0; i < 160; i++) { const sx = (Math.sin(i * 12.9898 + S.time * 3) * 43758.5453 % 1 + 1) % 1, sy = (Math.sin(i * 78.233 + S.time * 2) * 12345.678 % 1 + 1) % 1; ctx.fillRect(sx * LW, sy * LH, 3, 3); }
    ctx.globalAlpha = a; ctx.fillStyle = '#f3e3b8'; ctx.textAlign = 'center'; ctx.font = `700 54px ${DISP}`; ctx.fillText('SAND IN YOUR EYES', LW / 2, LH / 2);
    ctx.font = `600 20px ${UI}`; ctx.fillText(`You can't see fouls for ${S.refs[0].blind.toFixed(1)}s`, LW / 2, LH / 2 + 30); ctx.globalAlpha = 1;
  }
}
function draw3d() {
  try { R3.render(S.time); }
  catch (e) { console.error(e); setGraphics(false, 'The 3D view stopped with an error, so the game switched to classic graphics.'); return; }
  ctx.clearRect(0, 0, LW, LH);
  drawOverlays3D();
  drawWeatherFx(); drawRefBlind();
  const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.55, LW / 2, LH / 2, LH * 1.0); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, LW, LH);
  drawSetPiece(); drawHUD(); drawPauseMsg();
}
// Screen-space extras over the 3D scene: name tags, health bars, stars, labels, chants, text, particles.
function drawOverlays3D() {
  drawChants(); drawFires(); drawAimGuides(); drawSetPieceWorld();
  drawWorldExtras(); drawWhacks(); drawBenchInfo();
  for (const p of S.players) {
    if (!onPitch(p)) continue;
    const down = p.stun > 0 || p.ko > 0;
    if (p.human && !(S.setPiece && S.setPiece.taker === p)) {
      const P = proj(p.x, p.y, down ? 16 : 48), s = Math.max(0.75, P.s), col = HUMAN_COL[p.human.idx % HUMAN_COL.length];
      drawLabelPill(P.x, P.y, s, col, p.human.label || 'P' + (p.human.idx + 1));
      if (p.human.charging && S.ball.owner === p) { const w = 26 * s; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y - 26 * s, w, 4 * s); ctx.fillStyle = col; ctx.fillRect(P.x - w / 2, P.y - 26 * s, w * p.human.charge, 4 * s); }
    }
    if (p.hp < 100 && (p.hitT > 0 || p.human)) {
      const P = proj(p.x, p.y, down ? 10 : 44), s = Math.max(0.75, P.s), w = 24 * s;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y, w, 3 * s);
      ctx.fillStyle = p.hp > 50 ? '#7dff9b' : p.hp > 25 ? '#ffd23f' : '#ff4d6d'; ctx.fillRect(P.x - w / 2, P.y, w * p.hp / 100, 3 * s);
    }
    if (p.yellows > 0) { const P = proj(p.x, p.y, 44); ctx.fillStyle = '#ffd23f'; ctx.fillRect(P.x + 14 * P.s, P.y - 4 * P.s, 4 * P.s, 6 * P.s); }
    if (p.stun > 0 && p.ko <= 0) { const P = proj(p.x, p.y, 12); drawStars(P.x, P.y, P.s); }
    if (p.ko > 0) { const P = proj(p.x, p.y, 20); ctx.fillStyle = '#ff6b6b'; ctx.font = `700 ${12 * P.s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('K.O. ' + Math.ceil(p.ko), P.x, P.y); }
  }
  for (const r of S.refs) {
    if (r.gone > 0) continue;
    if (r.blind > 0) {
      const P = proj(r.x, r.y, 46); drawStars(P.x, P.y, P.s);
      ctx.fillStyle = 'rgba(240,228,190,.95)'; ctx.font = `600 ${11 * P.s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('BLINDED ' + r.blind.toFixed(1) + 's', P.x, P.y - 9 * P.s);
    } else if (r.human) { const P = proj(r.x, r.y, 50); drawLabelPill(P.x, P.y, Math.max(0.75, P.s), '#ffd23f', 'YOU · REF'); }
  }
  for (const h of S.humans) {
    if (h.remote) continue;
    const p = S.players[h.pid]; if (!p || !p.target || !able(p)) continue;
    const t = p.target, P = proj(t.x, t.y, 0), help = t.stun > 0, ready = p.foulCd <= 0;
    ctx.fillStyle = help ? '#9dffb8' : ready ? '#ff8095' : 'rgba(255,128,149,.5)'; ctx.font = `700 ${11 * P.s}px ${UI}`; ctx.textAlign = 'center';
    ctx.fillText(help ? `HELP UP [${keyLabel(h.map.foul[0])}]` : `FOUL [${keyLabel(h.map.foul[0])}]${t.team === p.team ? ' · TEAMMATE' : ''}`, P.x, P.y + 26 * P.s);
  }
  for (const q of S.parts) { const P = proj(q.x, q.y, q.z); ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(P.x - q.size / 2, P.y - q.size / 2, q.size, q.size); }
  ctx.globalAlpha = 1;
  for (const t of S.texts) { const P = proj(t.x, t.y, t.z + 20); ctx.globalAlpha = Math.min(1, t.life * 2); ctx.font = `700 ${15 * P.s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(t.text, P.x + 1, P.y + 1); ctx.fillStyle = t.col; ctx.fillText(t.text, P.x, P.y); }
  ctx.globalAlpha = 1;
}
// What the 3D view should mark on the ground.
function view3d() {
  const humans = [], targets = [], passes = [];
  for (const p of S.players) if (p.human && onPitch(p)) humans.push({ x: p.x, y: p.y, face: p.aimA != null ? p.aimA : p.face, col: HUMAN_COL[p.human.idx % HUMAN_COL.length] });
  for (const h of S.humans) {
    if (h.remote) continue;
    const p = S.players[h.pid]; if (!p || !able(p)) continue;
    if (S.ball.owner === p) { const q = pickPassTarget(p, passDir(p)); if (q) passes.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, col: HUMAN_COL[h.idx % HUMAN_COL.length] }); }
    if (p.target) targets.push({ x: p.target.x, y: p.target.y, col: p.target.stun > 0 ? '#7dff9b' : p.foulCd <= 0 ? '#ff4d6d' : '#8a3a47' });
  }
  const r0 = S.refs[0];
  return { humans, targets, passes, refHuman: S.refHuman && r0 ? { x: r0.x, y: r0.y, face: r0.face } : null, land: ballLanding(S.ball), bigHead: !!MUT.bigHead, mega: S.megaBall > 0, trail: TRAIL, trailCol: S.ball.trail, puddles: S.puddles || [], decoys: S.decoys || [], camfx: CAMFX, fkcam: S.setPiece && S.setPiece.taker && S.ball.owner === S.setPiece.taker && isLocalHuman(S.setPiece.taker) ? { x: S.ball.x, y: S.ball.y, tx: fkGoalX(S.setPiece.taker), ty: S.setPiece.aim ? S.setPiece.aim.y : H / 2 } : null };
}
const coneHot = r => S.humans.some(h => { if (h.remote) return false; const p = S.players[h.pid]; return p && onPitch(p) && sees(r, p.x, p.y); });
async function setGraphics(on, note) {
  gfxNote = note || '';
  GFX3D = !!on;
  if (GFX3D && !R3) {
    try {
      const mod = await import('./render3d.js');
      R3 = mod.createRenderer3D(cv3, { S, W, H, LW, LH, GOAL_HALF, GOAL_H, BOX_D, BOX_HALF, PEN_X, ARC_R, ARC_A, CIRCLE_R, GA_D, GA_HALF, TEAM, HUMAN_COL, SKIN_OPTS, ITEM_COL, cloakAlpha, classCol: p => (CLS[p.cls] || {}).col, onBench, bench: { x: benchX, y: BENCH_Y }, view: view3d, coneHot, cam: () => CAM });
      resize();
    } catch (e) {
      console.error(e); GFX3D = false; R3 = null;
      gfxNote = 'Could not start 3D here (' + (e && e.message ? e.message : 'WebGL unavailable') + '). Using classic graphics.';
    }
  }
  if (!GFX3D) store.set('fpfc-gfx', note ? store.get('fpfc-gfx') : '2d'); else store.set('fpfc-gfx', '3d');
  document.getElementById('stage').classList.toggle('gfx3d', GFX3D && !!R3);
  proj = GFX3D && R3 ? R3.project : proj2d;
  if (!document.getElementById('settings').hidden) renderOpts();
}
function draw() {
  ctx.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
  if (GFX3D && R3) { draw3d(); return; }
  ctx.save();
  if (S.shake > 0) ctx.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
  drawBackdrop(); drawPitch(); drawGoal(0); drawGoal(1); drawCones();
  for (const n of S.bananas) { const P = proj(n.x, n.y); drawIcon('banana', P.x, P.y, P.s); }
  drawGroundExtras(); drawFires(); drawAimGuides();
  drawTargets(); drawSetPieceWorld();
  const ents = [];
  for (const p of S.players) if (onPitch(p) || onBench(p)) ents.push([p.y, () => drawPlayer(p)]);
  for (const t of [0, 1]) ents.push([BENCH_Y() - 3, () => drawBenches2D1(t)]);
  for (const r of S.refs) if (!(r.gone > 0)) ents.push([r.y, () => drawRef(r)]);
  for (const e of anomEnts()) ents.push([e.y, e.draw]);
  for (const it of S.items) ents.push([it.y, () => drawItem(it)]);
  ents.push([S.ball.y + 0.5, drawBall]);
  ents.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  drawBoards(H + 46, 1);
  drawWorldExtras(); drawWhacks(); drawBenchInfo();
  for (const q of S.parts) { const P = proj(q.x, q.y, q.z); ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(P.x - q.size / 2, P.y - q.size / 2, q.size, q.size); }
  ctx.globalAlpha = 1;
  for (const t of S.texts) { const P = proj(t.x, t.y, t.z); ctx.globalAlpha = Math.min(1, t.life * 2); ctx.font = `700 ${15 * P.s}px ${UI}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(t.text, P.x + 1, P.y + 1); ctx.fillStyle = t.col; ctx.fillText(t.text, P.x, P.y); }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawWeatherFx(); drawRefBlind();
  const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.45, LW / 2, LH / 2, LH * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, LW, LH);
  drawSetPiece(); drawHUD(); drawPauseMsg();
}
