/* Foul Play FC · js/render/abilities-draw.js
   Drawing class effects and the skill hotbar.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- drawing: zones, barriers, projectiles, the aim cursor and the hotbar ---------- */
const ZONE_STYLE = { tactical: '#3a7bff', zoneLock: '#f2c230', heal: '#7dff9b', gravity: '#8a7bff', slowBomb: '#9fb4ff', trap: '#c45cff', mine: '#8a4dff', meteor: '#ff7a2f', orbital: '#b8a8ff', dome: '#4fa3ff', infinity: '#3fbf5f' };
function drawClassFx() {
  const ring = (x, y, r, col, fill, dash, z = 0) => { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(proj(x + Math.cos(a) * r, y + Math.sin(a) * r, z)); } ctx.save(); if (dash) { ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.time * 25; } path(pts, true); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); };
  for (const z of S.zones || []) {
    const c = ZONE_STYLE[z.type] || '#fff', a = Math.min(1, z.ttl * 2);
    ctx.globalAlpha = a;
    if (z.type === 'trap') { const own = S.humans.some(h => !h.remote && h.team === z.team); if (own || z.t < 0.6) ring(z.x, z.y, z.r, c, 'rgba(196,92,255,.25)', false); }
    else if (z.type === 'dome') { for (const hh of [0, 20, 40, 60]) ring(z.x, z.y, z.r * Math.cos(hh / 75 * Math.PI / 2), 'rgba(79,163,255,.55)', hh === 0 ? 'rgba(79,163,255,.12)' : null, false, hh); }
    else if (z.type === 'infinity') { const P1 = proj(z.x, H / 2 - GOAL_HALF, 0), P2 = proj(z.x, H / 2 + GOAL_HALF, 0), P3 = proj(z.x, H / 2 + GOAL_HALF, GOAL_H + 10), P4 = proj(z.x, H / 2 - GOAL_HALF, GOAL_H + 10); ctx.fillStyle = `rgba(63,191,95,${0.25 + 0.1 * Math.sin(S.time * 8)})`; path([P1, P2, P3, P4], true); ctx.fill(); ctx.strokeStyle = '#7dff9b'; ctx.lineWidth = 2; ctx.stroke(); }
    else if (z.type === 'orbital') { const k = 1 - Math.max(0, z.ttl) / 1.5; ring(z.x, z.y, z.r, c, `rgba(184,168,255,${0.08 + 0.2 * k})`, true); ring(z.x, z.y, z.r * (1 - k), '#ffffff', null, false); const T = proj(z.x, z.y, 400), G0 = proj(z.x, z.y, 0); ctx.strokeStyle = `rgba(220,210,255,${0.3 + 0.6 * k})`; ctx.lineWidth = 3 + 8 * k; ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(G0.x, G0.y); ctx.stroke(); }
    else if (z.type === 'meteor') { ring(z.x, z.y, z.r, c, 'rgba(255,122,47,.08)', true); for (const m of z.mets) { const zz = 320 * (1 - m.t / 0.55), P = proj(m.x, m.y, zz), s = Math.max(0.7, P.s); ctx.fillStyle = '#ffb36b'; ell(P.x, P.y, 7 * s, 7 * s); ctx.fill(); ctx.fillStyle = 'rgba(255,90,20,.5)'; ell(P.x, P.y - 10 * s, 5 * s, 12 * s); ctx.fill(); const Gm = proj(m.x, m.y); ctx.strokeStyle = 'rgba(255,122,47,.7)'; ell(Gm.x, Gm.y, 18 * Gm.s, 7 * Gm.s); ctx.stroke(); } }
    else ring(z.x, z.y, z.r, c, c + '22', z.type !== 'heal');
    ctx.globalAlpha = 1;
  }
  for (const w of S.walls || []) {
    const A = proj(w.x1, w.y1, 0), B = proj(w.x2, w.y2, 0), C2 = proj(w.x2, w.y2, 44), D = proj(w.x1, w.y1, 44);
    ctx.fillStyle = 'rgba(79,163,255,.35)'; path([A, B, C2, D], true); ctx.fill(); ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 2; ctx.stroke();
  }
  for (const pr of S.projs || []) {
    const P = proj(pr.x, pr.y, pr.z), s = Math.max(0.6, P.s);
    if (pr.type === 'bomb') { ctx.fillStyle = '#9fb4ff'; ell(P.x, P.y, 5 * s, 5 * s); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke(); continue; }
    const Tl = proj(pr.x - pr.vx * 0.03, pr.y - pr.vy * 0.03, pr.z);
    ctx.strokeStyle = pr.type === 'pebble' ? 'rgba(201,180,138,.7)' : 'rgba(255,159,67,.8)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(Tl.x, Tl.y); ctx.lineTo(P.x, P.y); ctx.stroke();
    ctx.fillStyle = pr.type === 'pebble' ? '#c9b48a' : '#ff9f43'; ell(P.x, P.y, 2.6 * s, 2.6 * s); ctx.fill();
  }
  for (const d of S.decoys || []) if (d.ball) { const P = proj(d.x + 9, d.y + 4, 4), s = Math.max(0.6, P.s); ctx.fillStyle = '#ffffff'; ell(P.x, P.y, 4.4 * s, 4.4 * s); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke(); }
  // auras and marks on players
  for (const p of S.players) {
    if (!onPitch(p) || !p.bf) continue;
    const G0 = proj(p.x, p.y), b = p.bf;
    if (b.timeRush > 0 || b.perfect > 0 || b.awaken > 0 || b.rage > 0) { ctx.strokeStyle = b.rage > 0 ? '#ff4d4d' : b.timeRush > 0 ? '#ffd23f' : b.awaken > 0 ? '#ffb000' : '#3a7bff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(S.time * 10); ell(G0.x, G0.y, 16 * G0.s, 6 * G0.s); ctx.stroke(); ctx.globalAlpha = 1; }
    if (b.marked > 0) { const P = proj(p.x, p.y, 58); ctx.fillStyle = '#f2c230'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('◎ MARKED', P.x, P.y); }
    if (b.confused > 0) { const P = proj(p.x, p.y, 54); ctx.fillStyle = '#c45cff'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('?!?', P.x, P.y); }
    if (b.assistMark > 0) { const P = proj(p.x, p.y, 54); ctx.fillStyle = '#3a7bff'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('★', P.x, P.y); }
  }
}
function cloakAlpha(p) {   // cloaked enemies are barely visible to you; cloaked team-mates are see-through
  if (!hasBf(p, 'cloak')) return 1;
  const mine = S.humans.some(h => !h.remote && h.team === p.team);
  return mine ? 0.45 : 0.12;
}
const SKILL_GLYPH = { powerShot: '💥', curveDrive: '↪', aerial: '⤴', meteor: '☄', cloak: '◐', blink: '⚡', phantom: '👤', dimension: '◈', dash: '»', afterimage: '⧉', speedDribble: '⚽', timeRush: '⏱', bodyBlock: '▮', bullRush: '➜', quake: '≋', titan: '⛨', intervene: '⇥', zoneLock: '⊘', tackleCharge: '✶', absoluteMark: '◎', diveSave: '⤵', wideGuard: '↔', aerialGrab: '✋', infinity: '∞', precision: '➶', tactical: '⬡', assistMark: '★', perfect: '✦', healBurst: '✚', cleanse: '❋', revive: '♥', lifeweaver: '❦', morale: '♪', statAura: '◉', surge: '⚡', awaken: '☀', heavyPunch: '✊', grabThrow: '⇪', groundSlam: '✹', rage: '♨', clone: '⧉', trap: '⌖', jammer: '⊗', illusion: '❖', projPass: '➹', gravity: '◍', slowBomb: '●', orbital: '✺' };
function drawHotbar(h, right) {
  const p = S.players[h.pid]; if (!p || !p.cls) return;
  const C = CLS[p.cls], map = h.map || MAPSOLO, n = 4, sz = 46, gap = 6, w = n * sz + (n - 1) * gap + 20, x = right ? LW - w - 14 : 14, y = LH - sz - 40;
  ctx.fillStyle = 'rgba(6,11,10,.88)'; rr(x, y - 24, w, sz + 34, 10);
  ctx.strokeStyle = C.col; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; rrs(x + 0.5, y - 23.5, w - 1, sz + 33, 10); ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `700 13px ${UI}`; ctx.fillStyle = C.col; ctx.fillText(C.name.toUpperCase(), x + 10, y - 11);
  ctx.textAlign = 'right'; ctx.fillStyle = ROLE_INFO[C.role].col; ctx.font = `700 11px ${UI}`; ctx.fillText(ROLE_INFO[C.role].name.toUpperCase() + (p.cls === 'speedster' ? ` · ${p.stk || 0}/3` : p.cls === 'brawler' ? ` · ADRENALINE ${p.stk || 0}` : ''), x + w - 10, y - 11);
  for (let i = 0; i < n; i++) {
    const def = skillDef(p, i), sx = x + 10 + i * (sz + gap), sy = y;
    const cd = i === 3 ? 0 : Math.max(p.cd[i], def.shared && S.teamCd ? ((S.teamCd[p.team] || {})[def.id] || 0) - S.time : 0), ready = i === 3 ? p.ult >= 100 : cd <= 0;
    ctx.fillStyle = ready ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'; rr(sx, sy, sz, sz, 7);
    ctx.strokeStyle = ready ? (i === 3 ? '#ffd23f' : C.col) : 'rgba(255,255,255,.18)'; ctx.lineWidth = i === 3 && ready ? 2 + Math.sin(S.time * 8) : 1.5; rrs(sx + 0.5, sy + 0.5, sz - 1, sz - 1, 7);
    ctx.globalAlpha = ready ? 1 : 0.45; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = `600 20px ${UI}`; ctx.fillText(SKILL_GLYPH[def.id] || def.name[0], sx + sz / 2, sy + sz / 2 - 3); ctx.globalAlpha = 1;
    if (i === 3) { const f = clamp((p.ult || 0) / 100, 0, 1); ctx.fillStyle = 'rgba(255,210,63,.25)'; ctx.fillRect(sx + 2, sy + sz - 2 - (sz - 4) * f, sz - 4, (sz - 4) * f); if (!ready) { ctx.fillStyle = '#ffd23f'; ctx.font = `700 11px ${UI}`; ctx.fillText(Math.floor(p.ult) + '%', sx + sz / 2, sy + sz - 9); } }
    else if (!ready) { const f = clamp(cd / def.cd, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(sx + 1, sy + 1, sz - 2, (sz - 2) * f); ctx.fillStyle = '#ffffff'; ctx.font = `700 15px ${UI}`; ctx.fillText(Math.ceil(cd), sx + sz / 2, sy + sz / 2); }
    const key = (map[SKILL_KEYS[i]] || [])[0]; ctx.font = `700 10px ${UI}`; ctx.fillStyle = '#c9d3cb'; ctx.textAlign = 'left'; ctx.fillText(keyLabel(key), sx + 4, sy + 8);
  }
  // the skill name under the cursor slot is too much detail here; the catalog and guide explain each one
  ctx.textBaseline = 'alphabetic';
}
