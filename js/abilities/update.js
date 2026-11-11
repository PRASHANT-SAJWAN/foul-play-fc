/* Foul Play FC · js/abilities/update.js
   Per-frame class logic: zones, barriers, projectiles, passives and ultimate charge.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- per-frame update ---------- */
function updateClasses(dt) {
  S.zones = S.zones || []; S.walls = S.walls || []; S.projs = S.projs || [];
  const b = S.ball;
  if (b.pierce && b.pierce < S.time) b.pierce = 0;
  for (const p of S.players) {
    if (p.atkLunge) {   // a base attack stepping in to its target
      const t = S.players[p.atkLunge.t], L = p.atkLunge; L.ttl -= dt;
      if (!t || !onPitch(p) || !onPitch(t) || t.ko > 0 || p.stun > 0 || L.ttl <= 0) p.atkLunge = null;
      else { const d = dist(p, t), a = Math.atan2(t.y - p.y, t.x - p.x), reach = reachOf(p); p.face = a;
        if (d <= reach) { p.atkLunge = null; doFoul(p, t); }
        else { const st = Math.min(d - reach + 2, 320 * dt); p.x = clamp(p.x + Math.cos(a) * st, 8, W - 8); p.y = clamp(p.y + Math.sin(a) * st, 8, H - 8); } }
    }
    if (!p.cls) continue;
    for (let i = 0; i < 3; i++) if (p.cd[i] > 0) p.cd[i] = Math.max(0, p.cd[i] - dt);
    for (const k in p.bf) { p.bf[k] -= dt; if (p.bf[k] <= 0) delete p.bf[k]; }
    if (!onPitch(p)) continue;
    const CM = CLS[p.cls].mods; if (CM && CM.tick) CM.tick(p, dt);   // per-frame passives of classes from js/player/
    p.ult = Math.min(100, (p.ult || 0) + dt * 1.1);
    const v = Math.hypot(p.vx, p.vy);
    if (p.cls === 'speedster') { if (v > 80) { p.mvT += dt; if (p.mvT > 1.4 && p.stk < 3) { p.stk++; p.mvT = 0; } } else { p.mvT = 0; if (v < 30) p.stk = 0; } }
    if (p.cls === 'healer') for (const q of alliesOf(p)) if (q !== p && dist(q, p) < 120) { q.hp = Math.min(100, q.hp + 2 * dt); q.stamina = Math.min(q.staminaMax, q.stamina + 2 * dt); }
    if (hasSyn(p.team, 'sustain')) p.hp = Math.min(100, p.hp + dt);
    if (nearAura(p)) p.stamina = Math.min(p.staminaMax, p.stamina + 0.6 * dt);
    if (p.aerialPend && p.z <= 0 && p.vz <= 0 && !hasBf(p, 'aerial')) { p.aerialPend = false; burst(p.x, p.y, '#ff4d4d', 16, 6); for (const q of enemiesOf(p)) if (dist(q, p) < 70) knock(p, q, { stun: 2, foul: false }); }
    if (p.dash) {   // dashes: skill movement that bumps people out of the way
      p.dash.t -= dt;
      if (p.dash.hit) for (const q of enemiesOf(p)) if (!p.dash.done.includes(q.id) && dist(q, p) < 18 && q.ko <= 0) { p.dash.done.push(q.id); knock(p, q, Object.assign({ from: p }, p.dash.hit)); }
      if (p.dash.t <= 0) p.dash = null;
    }
    if (p.thrown) {   // flying after a Grab & Throw
      const T = p.thrown; T.t += dt; const u = Math.min(1, T.t / T.dur);
      p.x = T.sx + (T.tx - T.sx) * u; p.y = T.sy + (T.ty - T.sy) * u; p.z = 90 * u * (1 - u) * 2; p.vx = p.vy = 0;
      if (u >= 1) { p.thrown = null; p.z = 0; const by = S.players[T.by]; knock(by || p, p, { stun: 2, dmg: 10, foul: !!by, kind: 'skill' }); S.shake = Math.max(S.shake, 4); for (const q of S.players) if (q !== p && onPitch(q) && dist(q, p) < 20) { q.stun = Math.max(q.stun, 0.8); floatText(q, 'BOWLED OVER', '#ffd23f'); } }
    }
    if (hasBf(p, 'confused') && !p.human) { p.dx = Math.cos(S.time * 3 + p.id) ; p.dy = Math.sin(S.time * 2 + p.id); }
  }
  // zones
  for (let i = S.zones.length - 1; i >= 0; i--) {
    const z = S.zones[i]; z.ttl -= dt; z.t += dt;
    if (z.type === 'heal') for (const q of S.players) if (q.team === z.team && onPitch(q) && Math.hypot(q.x - z.x, q.y - z.y) < z.r) { q.hp = Math.min(100, q.hp + 10 * dt); q.stamina = Math.min(q.staminaMax, q.stamina + 10 * dt); if (q.ko <= 0) q.stun = 0; BF(q, 'immune', 0.3); }
    if (z.type === 'gravity') {
      for (const q of S.players) if (q.team !== z.team && onPitch(q)) { const d = Math.hypot(q.x - z.x, q.y - z.y); if (d < z.r && d > 4) { q.x -= (q.x - z.x) / d * 70 * dt; q.y -= (q.y - z.y) / d * 70 * dt; } }
      const d = Math.hypot(b.x - z.x, b.y - z.y); if (!b.owner && d < z.r && d > 4) { b.vx -= (b.x - z.x) / d * 220 * dt; b.vy -= (b.y - z.y) / d * 220 * dt; }
    }
    if (z.type === 'trap') { const q = S.players.find(q => q.team !== z.team && able(q) && q.z <= 0 && Math.hypot(q.x - z.x, q.y - z.y) < z.r); if (q) { const o = S.players[z.owner]; knock(o || q, q, { stun: 1.5, foul: false }); floatText(q, 'TRAPPED!', '#c45cff'); crowdEvent(q.team, { noob: 5, fun: 4 }); S.zones.splice(i, 1); continue; } }
    if (z.type === 'mine' && (z.ttl <= 0 || S.players.some(q => q.team !== z.team && able(q) && Math.hypot(q.x - z.x, q.y - z.y) < 22))) {
      const o = S.players[z.owner]; burst(z.x, z.y, '#8a4dff', 26, 30); S.shake = Math.max(S.shake, 4); thump(70, 0.3, 0.14);
      for (const q of S.players) if (q.team !== z.team && onPitch(q) && Math.hypot(q.x - z.x, q.y - z.y) < z.r) knock(o || q, q, { stun: 1.5, kb: 200, from: z, foul: false });
      S.decoys = S.decoys.filter(d => !(d.src === z.owner && !d.ball && Math.hypot(d.x - z.x, d.y - z.y) < 10)); S.zones.splice(i, 1); continue;
    }
    if (z.type === 'meteor') {
      z.tick -= dt;
      if (z.tick <= 0 && z.ttl > 0) { z.tick = 0.3; z.mets.push({ x: z.x + rand(-1, 1) * z.r * 0.8, y: z.y + rand(-1, 1) * z.r, t: 0 }); }
      for (let k = z.mets.length - 1; k >= 0; k--) {
        const m = z.mets[k]; m.t += dt;
        if (m.t >= 0.55) { burst(m.x, m.y, '#ff7a2f', 14, 10); thump(60, 0.2, 0.08); S.shake = Math.max(S.shake, 2); const o = S.players[z.owner];
          for (const q of S.players) if (q.team !== z.team && !q.gk && onPitch(q) && Math.hypot(q.x - m.x, q.y - m.y) < 42) knock(o || q, q, { stun: 1.5, foul: false, col: '#ff7a2f' });
          z.mets.splice(k, 1); }
      }
      if (z.ttl <= 0 && z.mets.length) continue;
    }
    if (z.type === 'orbital' && z.ttl <= 0) {
      const o = S.players[z.owner]; burst(z.x, z.y, '#b8a8ff', 40, 40); S.shake = Math.max(S.shake, 9); thump(50, 0.5, 0.2); cheer('roar', z.x, 'ORBITAL STRIKE!');
      for (const q of S.players) if (q.team !== z.team && onPitch(q) && Math.hypot(q.x - z.x, q.y - z.y) < z.r) knock(o || q, q, { stun: 3, dmg: 15, kb: 260, from: z, foul: false, col: '#b8a8ff' });
      if (Math.hypot(b.x - z.x, b.y - z.y) < z.r) { if (b.owner) loseBall(b.owner, 0); const g = goalOf(z.team), a = Math.atan2(g.y - b.y, g.x - b.x); b.owner = null; b.vx = Math.cos(a) * 650; b.vy = Math.sin(a) * 650; b.vz = 260; b.lastTouch = o || b.lastTouch; }
    }
    if (z.type === 'dome' && !b.owner) {   // shots bounce off the dome
      const d = Math.hypot(b.x - z.x, b.y - z.y), nx = (b.x - z.x) / (d || 1), ny = (b.y - z.y) / (d || 1), vn = b.vx * nx + b.vy * ny;
      if (d < z.r && d > z.r - 30 && vn < 0 && b.lastTouch && b.lastTouch.team !== z.team) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; b.vx *= 0.6; b.vy *= 0.6; b.curve = null; floatText(b, 'DEFLECTED', '#4fa3ff'); thump(300, 0.15, 0.08); }
    }
    if (z.type === 'infinity' && !b.owner && b.lastTouch && b.lastTouch.team !== z.team) {
      const s = z.team === 0 ? 1 : -1;
      if (Math.abs(b.x - z.x) < 26 && Math.abs(b.y - H / 2) < GOAL_HALF + 10 && b.vx * s < 0) { b.vx = s * 520; b.vy = rand(-150, 150); b.vz = 160; b.curve = null; b.lastTouch = S.players.find(q => q.gk && q.team === z.team) || b.lastTouch; floatText(b, 'INFINITY SAVE', '#3fbf5f'); cheer('roar', b.x, 'NOTHING GETS PAST!'); }
    }
    if (z.ttl <= 0) S.zones.splice(i, 1);
  }
  // barriers
  for (let i = S.walls.length - 1; i >= 0; i--) {
    const w = S.walls[i]; w.ttl -= dt; if (w.ttl <= 0) { S.walls.splice(i, 1); continue; }
    const seg = o => { const vx = w.x2 - w.x1, vy = w.y2 - w.y1, l2 = vx * vx + vy * vy || 1, t = clamp(((o.x - w.x1) * vx + (o.y - w.y1) * vy) / l2, 0, 1), cx = w.x1 + vx * t, cy = w.y1 + vy * t; return { d: Math.hypot(o.x - cx, o.y - cy), nx: (o.x - cx), ny: (o.y - cy) }; };
    if (!b.owner && (b.z || 0) < 50) { const s = seg(b); if (s.d < 8) { const n = Math.hypot(s.nx, s.ny) || 1, nx = s.nx / n, ny = s.ny / n, vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; b.vx *= 0.6; b.vy *= 0.6; b.curve = null; thump(220, 0.1, 0.06); } } }
    for (const q of S.players) if (q.team !== w.team && onPitch(q)) { const s = seg(q); if (s.d < 12) { const n = Math.hypot(s.nx, s.ny) || 1; q.x += s.nx / n * (12 - s.d); q.y += s.ny / n * (12 - s.d); } }
  }
  // projectiles: pebbles, darts and bombs
  for (let i = S.projs.length - 1; i >= 0; i--) {
    const pr = S.projs[i];
    if (pr.type === 'bomb') {
      pr.t += dt; const u = Math.min(1, pr.t / pr.dur); pr.x = pr.sx + (pr.tx - pr.sx) * u; pr.y = pr.sy + (pr.ty - pr.sy) * u; pr.z = 20 * (1 - u) + 120 * u * (1 - u);
      if (u >= 1) { addZone({ type: 'slowBomb', x: pr.x, y: pr.y, r: 110, ttl: 4, team: pr.team }); burst(pr.x, pr.y, '#9fb4ff', 20, 10); thump(90, 0.2, 0.1); S.projs.splice(i, 1); }
      continue;
    }
    pr.ttl -= dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.ttl <= 0 || pr.x < -20 || pr.x > W + 20 || pr.y < -20 || pr.y > H + 20) { S.projs.splice(i, 1); continue; }
    const o = S.players[pr.owner];
    const hit = S.players.find(q => q.id !== pr.owner && onPitch(q) && q.ko <= 0 && Math.hypot(q.x - pr.x, q.y - pr.y) < 11 && pr.z > (q.z || 0) && pr.z < (q.z || 0) + 48);
    if (hit) {
      weaponHit(o || hit, hit, pr.w ? pr : Object.assign({ w: pr.type === 'pebble' ? 'sling' : 'blaster' }, pr));
      S.projs.splice(i, 1); continue;
    }
    if (Math.hypot(b.x - pr.x, b.y - pr.y) < 9 && Math.abs((b.z || 0) - pr.z) < 22) {   // shooting the ball knocks it on
      if (b.owner) loseBall(b.owner, Math.atan2(pr.vy, pr.vx));
      const push = (WEAPONS[pr.w] || (pr.type === 'pebble' ? WEAPONS.sling : WEAPONS.blaster)).ballPush; b.vx += pr.vx * push; b.vy += pr.vy * push; b.vz = Math.max(b.vz, 60); b.lastTouch = o || b.lastTouch; S.projs.splice(i, 1);
    }
  }
}
