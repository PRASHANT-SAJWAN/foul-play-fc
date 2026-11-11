/* Foul Play FC · js/render/setpieces-draw.js
   Drawing free kicks and penalties.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- set-piece drawing ---------- */
function fkLocalTakerHuman() { const sp = S.setPiece; if (!sp || !sp.taker) return null; return S.humans.find(h => !h.remote && S.players[h.pid] === sp.taker) || null; }
function drawSetPieceWorld() {   // on the pitch: the 9.15 m circle, the offside line, the aim point and the predicted flight
  const sp = S.setPiece; if (!sp || !sp.taker) return;
  const b = S.ball, t = sp.taker, gx = fkGoalX(t), R = FK_DIST();
  ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -S.time * 20;
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; const ring = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; ring.push(proj(b.x + Math.cos(a) * R, b.y + Math.sin(a) * R)); } path(ring); ctx.stroke();
  if (sp.offX != null) { ctx.strokeStyle = TEAM[t.team].col; ctx.globalAlpha = 0.7; const L = []; for (let i = 0; i <= 12; i++) L.push(proj(sp.offX, H * i / 12)); path(L); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
  const h = fkLocalTakerHuman(); if (!h || b.owner !== t) return;
  const P = fkPlan(sp, fkIdealPower(sp)), pts = fkPathPoints(sp, P);
  pts.forEach((q, i) => { const Q = proj(q.x, q.y, q.z + 4); ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * i / pts.length})`; ell(Q.x, Q.y, 2.2 * Math.max(0.6, Q.s), 2.2 * Math.max(0.6, Q.s)); ctx.fill(); });
  const A = proj(gx, sp.aim.y, sp.aim.z), s = Math.max(0.8, A.s);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.2; ell(A.x, A.y, 9 * s, 9 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(A.x - 14 * s, A.y); ctx.lineTo(A.x - 4 * s, A.y); ctx.moveTo(A.x + 4 * s, A.y); ctx.lineTo(A.x + 14 * s, A.y); ctx.moveTo(A.x, A.y - 14 * s); ctx.lineTo(A.x, A.y - 4 * s); ctx.moveTo(A.x, A.y + 4 * s); ctx.lineTo(A.x, A.y + 14 * s); ctx.stroke();
}
function drawSetPiece() {
  const sp = S.setPiece; if (!sp || !sp.taker || S.pause > 0) return;
  const t = sp.taker, hm = t.human, h = fkLocalTakerHuman(), local = !!h;
  const map = (h && h.map) || MAPSOLO, pen = sp.type === 'penalty', left = Math.max(0, Math.ceil(sp.prep - sp.t));
  const title = `${pen ? 'PENALTY' : 'FREE KICK'} · ${t.name} · ${left}s`;
  const iAmPlaying = S.humans.some(x => !x.remote && S.players[x.pid] && S.players[x.pid] !== t);
  const sub = local ? (sp.t < sp.minT ? `Aim with movement (left/right across the goal, up/down for height) · wait for the whistle`
                                       : `Hold ${keyLabel(map.shoot[0])} and release in the green · ${keyLabel(map.pass[0])} pass · ${keyLabel(map.lpass[0])} long ball · the shot curls round the wall`)
    : iAmPlaying ? (pen ? 'Stay outside the box and behind the ball until it is kicked' : `Get into position: defenders stay outside the circle, attackers stay behind the ${TEAM[t.team].short} line`)
    : `Everyone sets up while ${t.name} lines it up`;
  ctx.font = `600 30px ${DISP}`; const tw = ctx.measureText(title).width;
  ctx.font = `600 15px ${UI}`; const sw = ctx.measureText(sub).width;
  const w = Math.max(tw, sw) + 40, x = LW / 2 - w / 2, y = 124;
  ctx.fillStyle = 'rgba(6,11,10,.9)'; rr(x, y, w, 58, 10);
  ctx.strokeStyle = TEAM[sp.team].col; ctx.lineWidth = 1.5; rrs(x + 0.5, y + 0.5, w - 1, 57, 10);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = TEAM[sp.team].col; ctx.font = `600 30px ${DISP}`; ctx.fillText(title, LW / 2, y + 22);
  ctx.fillStyle = '#eef2e6'; ctx.font = `600 15px ${UI}`; ctx.fillText(sub, LW / 2, y + 44);
  if (local) {   // power bar with the sweet spot
    const bw = 320, bx = LW / 2 - bw / 2, by = y + 66, ideal = fkIdealPower(sp), band = t.charge >= 25 ? 0.14 : 0.08;
    ctx.fillStyle = 'rgba(6,11,10,.9)'; rr(bx - 6, by - 4, bw + 12, 26, 6);
    ctx.fillStyle = '#1b2621'; ctx.fillRect(bx, by, bw, 10);
    ctx.fillStyle = 'rgba(125,255,155,.75)'; ctx.fillRect(bx + bw * clamp(ideal - band, 0, 1), by, bw * (Math.min(1, ideal + band) - Math.max(0, ideal - band)), 10);
    const c = h.charging ? h.charge : 0; ctx.fillStyle = '#ffd23f'; ctx.fillRect(bx + bw * c - 2, by - 3, 4, 16);
    ctx.font = `700 11px ${UI}`; ctx.fillStyle = '#c9d3cb'; ctx.fillText(t.charge >= 25 ? 'POWER · CHARGED: WIDER SWEET SPOT' : 'POWER', LW / 2, by + 17);
  }
  ctx.textBaseline = 'alphabetic';
}
