/* Foul Play FC · js/render/canvas.js
   Canvas helpers for everything drawn over the 3D scene: shapes, label pills, stars, crowd chants,
   item icons, and where an airborne ball will land.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- overlay drawing helpers ---------------- */
function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
function path(pts, close) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (close) ctx.closePath(); }
function drawChants() {
  for (const c of S.chants) {
    const age = 2.2 - c.life, P = proj(c.x, -110, 80 + age * 24), a = Math.max(0, Math.min(1, c.life * 1.5, age * 6));
    ctx.globalAlpha = a; ctx.font = `700 ${Math.round(34 * P.s)}px ${DISP}`; ctx.textAlign = 'center';
    const w = ctx.measureText(c.text).width + 22 * P.s, h = 30 * P.s;
    ctx.fillStyle = 'rgba(6,11,10,.8)'; rr(P.x - w / 2, P.y - h, w, h, 8 * P.s);
    ctx.fillStyle = CHEER_COL[c.kind] || '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(c.text, P.x, P.y - h / 2 + 2 * P.s); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
}
function drawStars(x, y, s) { ctx.fillStyle = '#ffe66d'; for (let i = 0; i < 3; i++) { const a = S.time * 4 + i * 2.09; ell(x + Math.cos(a) * 8 * s, y + Math.sin(a) * 2.6 * s, 1.8 * s, 1.8 * s); ctx.fill(); } }
function rrs(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.stroke(); }
function drawLabelPill(cx, y, s, col, label) {
  ctx.font = `700 ${10.5 * s}px ${UI}`;
  const tw = ctx.measureText(label).width + 10 * s;
  ctx.fillStyle = col; rr(cx - tw / 2, y - 19 * s, tw, 13 * s, 6.5 * s);
  ctx.beginPath(); ctx.moveTo(cx - 4 * s, y - 6.5 * s); ctx.lineTo(cx + 4 * s, y - 6.5 * s); ctx.lineTo(cx, y - 1.5 * s); ctx.fill();
  ctx.fillStyle = '#10140a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx, y - 12.4 * s); ctx.textBaseline = 'alphabetic';
}
function ballLanding(b) {
  const z = b.z || 0;
  if (b.owner || z < 6) return null;
  const g = GRAV(), vz = b.vz || 0, t = (vz + Math.sqrt(vz * vz + 2 * g * z)) / g, drift = (1 - Math.exp(-0.15 * t)) / 0.15;
  return { x: clamp(b.x + (b.vx || 0) * drift, 0, W), y: clamp(b.y + (b.vy || 0) * drift, 0, H), t };
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
