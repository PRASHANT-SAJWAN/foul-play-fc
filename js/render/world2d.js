/* Foul Play FC · js/render/world2d.js
   The classic 2.5D view: stadium, pitch, players, referees, ball and items.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
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
