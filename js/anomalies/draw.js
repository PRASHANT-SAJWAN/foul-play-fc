/* Foul Play FC · js/anomalies/draw.js
   Drawing anomalies over the 3D scene.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- anomaly drawing (overlays on the 3D view) ---------- */
const PIRATE_LOOK = { jersey: '#f4f4f0', shorts: '#2b2b2b', socks: '#2b2b2b', skin: '#c58c5e', hair: '#1b120c', num: null, numCol: '#fff', trim: '#d0312d', hairStyle: 5, facial: 2, accessory: 1, build: 2, boots: '#3a2416' };
const fanLook = f => ({ jersey: f.col, shorts: '#3b4a5a', socks: '#e8e8e8', skin: f.skin, hair: f.hair, num: null, numCol: '#fff', armsUp: true, build: 1 });
const JUNK_COL = { shoe: '#6b4a2a', cup: '#f4f4f0', hotdog: '#d9894a', scarf: '#ff4d6d', pie: '#e8c37a' };
function drawAnomalies() {
  const A = S.an; if (!A) return;
  if (A.zone) {   // the invaded zone, marked on the grass
    const z = A.zone, c = [proj(z.x0, z.y0), proj(z.x1, z.y0), proj(z.x1, z.y1), proj(z.x0, z.y1)];
    ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.time * 30; ctx.strokeStyle = 'rgba(255,210,63,.8)'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,210,63,.08)'; path(c, true); ctx.fill(); ctx.stroke(); ctx.restore();
    const L = proj((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 0);
    ctx.fillStyle = 'rgba(255,210,63,.9)'; ctx.font = `700 ${Math.max(11, 13 * L.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText(`PITCH INVASION · ${Math.max(0, Math.ceil(z.d - z.t))}s`, L.x, L.y);
  }
  if (A.br) {   // the fight in the far stand
    const br = A.br, P = proj(br.x, -110, 40), s = Math.max(0.7, P.s);
    if (br.lethal) {
      for (let k = 0; k < 9; k++) { const a = k * 0.7 + S.time * 3, r = (18 + 8 * Math.sin(S.time * 7 + k)) * s; ctx.fillStyle = `rgba(220,210,190,${0.55 - k * 0.03})`; ell(P.x + Math.cos(a) * r * 1.6, P.y + Math.sin(a) * r * 0.6, 16 * s, 12 * s); ctx.fill(); }
      ctx.font = `700 ${16 * s}px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff4d6d';
      const POW = ['POW!', 'BIFF!', 'WHACK!', 'OOF!']; ctx.fillText(POW[Math.floor(S.time * 3) % 4], P.x + Math.sin(S.time * 5) * 30 * s, P.y - 22 * s);
      drawStars(P.x, P.y - 4 * s, s * 1.5);
    }
    for (const w of br.words) {
      const a = Math.min(1, w.life * 2), y = P.y - (36 + (1.8 - w.life) * 20) * s;
      ctx.globalAlpha = a; ctx.font = `700 ${11 * s}px ${UI}`; ctx.textAlign = 'center';
      const tw = ctx.measureText(w.text).width + 10;
      ctx.fillStyle = '#ffffff'; rr(P.x + w.dx * s - tw / 2, y - 9 * s, tw, 15 * s, 6 * s); ctx.fillStyle = '#c0182a'; ctx.fillText(w.text, P.x + w.dx * s, y + 2 * s); ctx.globalAlpha = 1;
    }
  }
  for (const j of A.junk) {   // junk flying out of the stand
    const P = proj(j.x, j.y, j.z), s = Math.max(0.6, P.s), a = j.hit ? Math.max(0, 1 - (j.t - j.dur) / 1.2) : 1;
    ctx.globalAlpha = a; ctx.fillStyle = JUNK_COL[j.kind] || '#fff'; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(j.hit ? 0 : j.t * 9);
    if (j.kind === 'scarf') ctx.fillRect(-8 * s, -1.5 * s, 16 * s, 3 * s); else if (j.kind === 'cup') ctx.fillRect(-2.5 * s, -4 * s, 5 * s, 8 * s); else { ell(0, 0, 5 * s, 3 * s); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  for (const p of S.players) {   // frozen solid / heatstroke
    if (!onPitch(p)) continue;
    if (p.heatT > 0) { const P = proj(p.x, p.y, 52); ctx.strokeStyle = 'rgba(255,159,67,.9)'; ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 6; i++) { const xx = P.x + (k - 1) * 6 * P.s + Math.sin(S.time * 8 + i + k) * 2 * P.s, yy = P.y - i * 2.4 * P.s; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } }
  }
  if (A.ufo && A.ufo.ph === 'beam') { const T = ufoTarget(A.ufo); if (T) { const P = proj(T.x, T.y, 70 + liftOf(T)); ctx.fillStyle = '#9dffb8'; ctx.font = `700 ${13 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('BEAM ME UP', P.x, P.y); } }
}
// Screen-wide weather: heat haze or snow.
function drawWeatherFx() {
  const w = S.an && S.an.wx; if (!w) return;
  const k = Math.min(1, w.t / 1.5, (w.d - w.t) / 1.5); if (k <= 0) return;
  if (w.k === 'heat') {
    const g = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.2, LW / 2, LH / 2, LH * 0.9); g.addColorStop(0, `rgba(255,170,60,${0.08 * k})`); g.addColorStop(1, `rgba(255,90,20,${0.32 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    ctx.strokeStyle = `rgba(255,220,160,${0.12 * k})`; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = (i * 67 + S.time * 40) % LH; ctx.beginPath(); for (let x = 0; x <= LW; x += 40) { const yy = y + Math.sin(x * 0.02 + S.time * 4 + i) * 4; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
  } else {
    const g = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.25, LW / 2, LH / 2, LH * 0.95); g.addColorStop(0, `rgba(200,235,255,${0.1 * k})`); g.addColorStop(1, `rgba(225,245,255,${0.45 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    ctx.fillStyle = `rgba(255,255,255,${0.85 * k})`;
    for (let i = 0; i < 90; i++) { const x = (i * 137.5 + Math.sin(S.time + i) * 20) % LW, y = (i * 71 + S.time * (40 + (i % 5) * 12)) % LH; ell((x + LW) % LW, y, 1.6 + (i % 3) * 0.6, 1.6 + (i % 3) * 0.6); ctx.fill(); }
  }
}
function drawAnomMeter(cx, y) {   // under the crowd bar: time to the next anomaly, or what's happening
  const A = S.an; if (!A || S.phase === 'menu') return;
  const live = ANOM_LIST.filter(([k]) => anomBusy(k)).map(([k]) => ANOM_NAME[k]);
  const idle = S.mode === 'client' ? A.lvl > 0 : ANOM_PREF.level > 0 && S.mode !== 'playground';
  if (!live.length && !idle) return;
  const w = 220, x = cx - w / 2;
  ctx.fillStyle = 'rgba(6,11,10,.82)'; rr(x, y, w, 16, 5);
  ctx.font = `700 10px ${UI}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  if (live.length) { ctx.fillStyle = Math.floor(S.time * 4) % 2 ? '#ff9a6b' : '#ffd23f'; ctx.fillText('ANOMALY: ' + live.join(' + ').toUpperCase(), cx, y + 8.5); }
  else {
    const f = A.max > 0 ? clamp(1 - A.next / A.max, 0, 1) : 0, soon = A.max > 0 && A.next < 3;
    ctx.fillStyle = '#1b2621'; ctx.fillRect(x + 92, y + 5, w - 98, 6);
    ctx.fillStyle = soon ? (Math.floor(S.time * 6) % 2 ? '#ff4d6d' : '#ffd23f') : '#c9a0ff'; ctx.fillRect(x + 92, y + 5, (w - 98) * f, 6);
    ctx.textAlign = 'left'; ctx.fillStyle = soon ? '#ffd23f' : '#c9a0ff'; ctx.fillText(soon ? 'SOMETHING’S COMING' : `ANOMALY · ${ANOM_LEVELS[A.lvl] ? ANOM_LEVELS[A.lvl][0].toUpperCase() : ''}`, x + 7, y + 8.5);
  }
  ctx.textBaseline = 'alphabetic';
}
