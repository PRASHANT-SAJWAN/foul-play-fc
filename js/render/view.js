/* Foul Play FC · js/render/view.js
   Starting the 3D renderer, the data handed to it each frame, and draw().
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

let gfxFails = 0;
function draw3d() {
  try { R3.render(S.time); }
  catch (e) { console.error(e); try { R3.dispose(); } catch (e2) {} R3 = null; GFX3D = false; if (++gfxFails <= 3) setGraphics(); else gfxNote = 'The 3D view keeps failing here (' + (e && e.message || 'error') + '). Reload the page to try again.'; return; }   // rebuild the scene after an error
  ctx.clearRect(0, 0, LW, LH);
  drawOverlays3D();
  drawWeatherFx(); drawRefBlind();
  const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.55, LW / 2, LH / 2, LH * 1.0); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, LW, LH);
  drawSetPiece(); drawHUD(); drawPauseMsg();
}
// Screen-space extras over the 3D scene: name tags, health bars, stars, labels, chants, text, particles.
function drawOverlays3D() {
  drawChants(); drawFires(); drawAimGuides(); drawCastAims(); drawSetPieceWorld();
  drawArena(); drawBallMods(); drawCombatFx(); drawCloneTags();   // hazard pitches, crates and rings, shockwaves and lassos
  drawWorldExtras(); drawWhacks(); drawBenchInfo();
  for (const p of S.players) {
    if (!onPitch(p) || unseen(p)) continue;
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
    if (p.stun > 0 && p.ko <= 0) { const P = proj(p.x, p.y, isDizzy(p) ? 50 : 12); drawStars(P.x, P.y, P.s); }   // dizzy players see stars over their head
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
    const p = S.players[h.pid]; if (!p || !p.target || !able(p) || h.aiming != null) continue;   // while aiming, the aim guide labels it
    const t = p.target, P = proj(t.x, t.y, 0), help = t.stun > 0, ready = p.foulCd <= 0;
    ctx.fillStyle = help ? '#9dffb8' : ready ? '#ff8095' : 'rgba(255,128,149,.5)'; ctx.font = `700 ${11 * P.s}px ${UI}`; ctx.textAlign = 'center';
    ctx.fillText(help ? `HELP UP [${keyLabel(h.map.foul[0])}]` : `ATTACK [${keyLabel(h.map.foul[0])}]${t.team === p.team ? ' · TEAMMATE' : ''}`, P.x, P.y + 26 * P.s);
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
    if (p.target && !unseen(p.target)) targets.push({ x: p.target.x, y: p.target.y, col: p.target.stun > 0 ? '#7dff9b' : p.foulCd <= 0 ? '#ff4d6d' : '#8a3a47' });
  }
  const r0 = S.refs[0];
  return { humans, targets, passes, refHuman: S.refHuman && r0 ? { x: r0.x, y: r0.y, face: r0.face } : null, land: ballLanding(S.ball), bigHead: !!MUT.bigHead, decals: groundDecals(), ballMod: S.ballMod ? S.ballMod.k + (S.ballMod.armed ? '!' : '') : '', mega: S.megaBall > 0, trail: TRAIL, trailCol: S.ball.trail, puddles: S.puddles || [], decoys: S.decoys || [], camfx: CAMFX, fkcam: S.setPiece && S.setPiece.taker && S.ball.owner === S.setPiece.taker && isLocalHuman(S.setPiece.taker) && S.setPiece.view !== 'side' ? { x: S.ball.x, y: S.ball.y, tx: fkGoalX(S.setPiece.taker), ty: S.setPiece.aim ? S.setPiece.aim.y : H / 2 } : null };
}
// Clones carry the same name pill and health bar as the player they copy, so you can't tell them apart.
function drawCloneTags() {
  for (const d of S.decoys || []) {
    const p = S.players[d.src]; if (!p) continue;
    if (p.human && p.team === d.team) { const P = proj(d.x, d.y, 48), s = Math.max(0.75, P.s); drawLabelPill(P.x, P.y, s, HUMAN_COL[p.human.idx % HUMAN_COL.length], p.human.label || 'P' + (p.human.idx + 1)); }
    if (p.hp < 100 && p.human) { const P = proj(d.x, d.y, 44), s = Math.max(0.75, P.s), w = 24 * s; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y, w, 3 * s); ctx.fillStyle = p.hp > 50 ? '#7dff9b' : p.hp > 25 ? '#ffd23f' : '#ff4d6d'; ctx.fillRect(P.x - w / 2, P.y, w * p.hp / 100, 3 * s); }
  }
}
// Flat things on the grass for the 3D view: scorch and ice patches, mud, lava, vents.
function groundDecals() {
  const out = [];
  arenaDecals(out);
  for (const z of S.patches || []) { const a = clamp(z.ttl / Math.min(2, z.life || 2), 0, 1); out.push(z.kind === 'scorch' ? { x: z.x, y: z.y, r: z.r, col: '#2a1408', op: 0.75 * a } : { x: z.x, y: z.y, r: z.r, col: '#cdeeff', op: 0.6 * a, glow: true }); if (z.kind === 'scorch') out.push({ x: z.x, y: z.y, r: z.r * 0.55, col: '#ff7a1a', op: 0.6 * a * (0.7 + 0.3 * Math.sin(S.time * 14 + z.x)), glow: true }); }
  return out;
}
const coneHot = r => S.humans.some(h => { if (h.remote) return false; const p = S.players[h.pid]; return p && onPitch(p) && sees(r, p.x, p.y); });
// Start the 3D renderer (the only view). It also restarts after a pitch-size or kit-colour change.
async function setGraphics() {
  if (R3 || GFX3D === 'loading') return;
  GFX3D = 'loading'; gfxNote = '';
  try {
    const mod = await import('./render3d.js');
    R3 = mod.createRenderer3D(cv3, { S, W, H, LW, LH, GOAL_HALF, GOAL_H, BOX_D, BOX_HALF, PEN_X, ARC_R, ARC_A, CIRCLE_R, GA_D, GA_HALF, TEAM, HUMAN_COL, SKIN_OPTS, ITEM_COL, cloakAlpha, classCol: p => (CLS[p.cls] || {}).col, weaponHand: p => (weaponOf(p, 'melee') || {}).hand || null, glow: p => glowing(p) ? TEAM[p.team].col : null, dizzy: isDizzy, classModel: p => CLASS_MODELS[p.cls] || null, modelLimits: MODEL_LIMITS, onBench, bench: { x: benchX, y: BENCH_Y }, view: view3d, coneHot, cam: () => CAM });
    resize();
  } catch (e) {
    console.error(e); R3 = null;
    gfxNote = 'This game needs 3D graphics (WebGL), which could not start here: ' + (e && e.message ? e.message : 'WebGL unavailable') + '. Try another browser or turn on hardware acceleration.';
  }
  GFX3D = !!R3;
  document.getElementById('stage').classList.toggle('gfx3d', GFX3D);
  if (R3) proj = R3.project;
}
function draw() {
  ctx.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
  if (R3) { draw3d(); return; }
  ctx.fillStyle = '#0b1712'; ctx.fillRect(0, 0, LW, LH);   // while three.js loads, or if 3D can't start here
  ctx.fillStyle = '#c9d3cb'; ctx.font = `600 22px ${UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(gfxNote || 'Loading the stadium…', LW / 2, LH / 2); ctx.textBaseline = 'alphabetic';
}
