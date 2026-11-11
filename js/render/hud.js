/* Foul Play FC · js/render/hud.js
   The HUD: scoreboard, player panels, minimap, crowd meter, aim lines, whacks and other overlays.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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
  drawCrowdMeter(cx); drawRage(cx);
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
  drawVar();   // js/match/var.js
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
  const st = !onPitch(p) ? `${p.goneWhy === 'ufo' ? 'ABDUCTED' : p.goneWhy === 'pir' ? 'KIDNAPPED' : p.goneWhy === 'lava' ? 'IN THE LAVA' : 'ON THE BENCH'} ${Math.ceil(p.sentOff)}s` : p.ko > 0 ? `K.O. ${Math.ceil(p.ko)}s` : seen ? 'REF WATCHING' : inSmoke(p.x, p.y) ? 'IN SMOKE' : 'UNSEEN';
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
    (Wd => Wd ? { icon: Wd.id, n: p.items[Wd.id], key: bind.foul[0], hot: true } : { icon: 'sword', n: 0, key: bind.foul[0], hot: false })(weaponOf(p, 'ranged') || weaponOf(p, 'melee')),
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
// Over-the-pitch extras drawn over the 3D scene.
const TRAIL = [];
function drawWorldExtras() {
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
  // banners in the stands
  for (const bn of (S.crowd && S.crowd.banners) || []) {
    const P = proj(bn.x, -125, 48), a = Math.min(1, bn.life / 1.5, (12 - bn.life) * 2);
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
    if (!p || !onPitch(p) || S.ball.owner !== p || !h || !(h.charging || h.lineT > 0) || (S.setPiece && !(S.setPiece.taker === p && S.setPiece.view === 'side'))) continue;
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
// Holding attack, a spell or the ultimate: show the reach, the player it would hit (aim assist), or where it lands.
function drawCastAims() {
  const list = S.net === 'client' ? (NET && NET.inH ? [[S.players.find(p => p.human && p.human.local), NET.inH]] : []) : (S.humans || []).filter(h => !h.remote).map(h => [S.players[h.pid], h]);
  for (const [p, h] of list) {
    if (!p || !h || h.aiming == null || !onPitch(p) || !able(p)) continue;
    const slot = h.aiming, f = passDir(p), A = proj(p.x, p.y);
    let col, range, cone = 0, t = null, pt = null, rad = 0, label = '', bad = '';
    if (slot < 0) {
      const pl = attackPlan(p); range = pl.range; t = pl.target; col = pl.help ? '#7dff9b' : '#ff4d6d';
      if (pl.ranged) { pt = t ? { x: t.x, y: t.y } : { x: p.x + Math.cos(f) * range, y: p.y + Math.sin(f) * range }; label = pl.ranged.name.toUpperCase(); }
      else { cone = ATK_CONE; label = pl.help ? 'HELP UP' : t && t.team === p.team ? 'TEAMMATE' : 'ATTACK'; }
      if (p.foulCd > 0 && !pl.ranged) bad = p.foulCd.toFixed(1) + 's';
    } else {
      const def = skillDef(p, slot); if (!def) continue;
      const ca = castAim(p, def); range = ca.range; t = ca.u || ca.pt.on || null; col = slot === 3 ? '#ffd23f' : (CLS[p.cls] || {}).col || '#ffffff'; label = def.name.toUpperCase();
      if (def.aim === 'self') rad = def.radius || 70; else if (def.aim === 'point') { pt = ca.pt; rad = def.radius || 34; } else if (!t) bad = def.aim === 'enemy' ? 'NO ENEMY IN RANGE' : 'NO TEAM-MATE IN RANGE';
      if (slot === 3 && (p.ult || 0) < 100) bad = Math.floor(p.ult || 0) + '%';
      else if (slot < 3) { const c = Math.max(p.cd[slot] || 0, def.shared && S.teamCd ? ((S.teamCd[p.team] || {})[def.id] || 0) - S.time : 0); if (c > 0) bad = Math.ceil(c) + 's'; }
    }
    ctx.save(); ctx.globalAlpha = bad ? 0.45 : 0.9;
    // reach: a ring around you, or the attack's cone
    ctx.strokeStyle = col; ctx.lineWidth = 1.6 * A.s; ctx.setLineDash([6 * A.s, 6 * A.s]); ctx.beginPath();
    const N = 40, a0 = cone ? f - cone : 0, a1 = cone ? f + cone : Math.PI * 2;
    if (cone) { ctx.moveTo(A.x, A.y); }
    for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N, P = proj(p.x + Math.cos(a) * range, p.y + Math.sin(a) * range); ctx.lineTo(P.x, P.y); }
    if (cone) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    if (cone) { ctx.globalAlpha *= 0.18; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = bad ? 0.45 : 0.9; }
    // the line to the target or landing point, and what's there
    const end = t ? { x: t.x, y: t.y } : pt;
    if (end) { const B = proj(end.x, end.y); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 5 * A.s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2.4 * A.s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
    if (t) { const B = proj(t.x, t.y), pulse = 1 + Math.sin(S.time * 12) * 0.1; ctx.strokeStyle = col; ctx.lineWidth = 3 * B.s; ell(B.x, B.y, 17 * B.s * pulse, 7.5 * B.s * pulse); ctx.stroke(); }
    if (rad) { const c = pt || p; ctx.fillStyle = col; ctx.globalAlpha *= 0.22; ctx.beginPath(); for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, P = proj(c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad); i ? ctx.lineTo(P.x, P.y) : ctx.moveTo(P.x, P.y); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = bad ? 0.45 : 0.9; ctx.strokeStyle = col; ctx.lineWidth = 2 * A.s; ctx.stroke(); }
    // the label above the target (or the landing point, or you)
    const lp = t || pt || p, L = proj(lp.x, lp.y, 50), s = Math.max(0.8, L.s);
    ctx.globalAlpha = 1; ctx.font = `700 ${12 * s}px ${UI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = bad ? `${label} · ${bad}` : label, w = ctx.measureText(txt).width + 12 * s;
    ctx.fillStyle = 'rgba(6,11,10,.8)'; rr(L.x - w / 2, L.y - 9 * s, w, 18 * s, 6 * s); ctx.fillStyle = bad ? '#c8c8c8' : col; ctx.fillText(txt, L.x, L.y + 0.5);
    ctx.textBaseline = 'alphabetic'; ctx.restore();
  }
}
// The two teams' rage meters beside the scoreboard. Full: it pulses and says OVERDRIVE.
function drawRage(cx) {
  if (S.phase === 'menu') return;
  for (const t of [0, 1]) {
    const v = clamp(rageOf(t) / RAGE.max, 0, 1), x = t === 0 ? cx - 226 : cx + 214, y = 10, h = 52, full = v >= 1;
    ctx.fillStyle = 'rgba(6,11,10,.88)'; ctx.fillRect(x, y, 12, h);
    ctx.fillStyle = full ? (Math.sin(S.time * 12) > 0 ? '#ffffff' : '#ff5a3d') : TEAM[t].col; ctx.fillRect(x + 2, y + 2 + (h - 4) * (1 - v), 8, (h - 4) * v);
    ctx.save(); ctx.translate(x + 6, y + h + 9); ctx.font = `700 10px ${UI}`; ctx.textAlign = 'center'; ctx.fillStyle = full ? '#ff5a3d' : '#c9d3cb'; ctx.fillText(full ? 'OVERDRIVE' : 'RAGE', 0, 0); ctx.restore();
  }
}
// Shockwave rings and lasso lines (the ground patches are drawn in 3D).
function drawCombatFx() {
  for (const w of S.waves || []) {
    const u = w.t / 0.5, P = proj(w.x, w.y, 1), r = w.r * (0.3 + 0.9 * u);
    ctx.globalAlpha = 1 - u; ctx.strokeStyle = w.col || '#ffd9a8'; ctx.lineWidth = 4 * P.s * (1 - u) + 1; ell(P.x, P.y, r * P.s, r * P.s * 0.42); ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (const l of S.lassos || []) {
    const a = S.players[l.a], t = S.players[l.t]; if (!a || !t) continue;
    const A = proj(a.x, a.y, 22), B = proj(t.x, t.y, 10), mx = (A.x + B.x) / 2, my = Math.min(A.y, B.y) - 30 * A.s;
    ctx.strokeStyle = '#d8b26a'; ctx.lineWidth = 2.2 * A.s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(B.x, B.y, 10 * B.s, 4 * B.s, 0, 0, Math.PI * 2); ctx.stroke();
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
