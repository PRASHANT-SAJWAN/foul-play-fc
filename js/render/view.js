/* Foul Play FC · js/render/view.js
   Switching between views, the data handed to the 3D renderer each frame, and draw().
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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
