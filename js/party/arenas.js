/* Foul Play FC · js/party/arenas.js
   Hazard pitches, picked on the match setup screen:
     Volcano      steam vents along the touchlines launch players and the ball into the air; lava pits
                  near the sidelines take anyone who stands in them out for 10 seconds.
     Power Plant  electric fences instead of touchlines: running or being knocked into them shocks and stuns.
     Swamp        mud patches slow everyone (sprinting barely helps) and drag the ball to a stop.
   The layout is fixed for each pitch size, so online players only need the pitch id and the vents' state.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const ARENAS = [['classic', 'Stadium'], ['volcano', 'Volcano'], ['plant', 'Power Plant'], ['swamp', 'Swamp']];
let ARENA_PREF = (() => { const v = store.get('fpfc-arena'); return ARENAS.some(a => a[0] === v) ? v : 'classic'; })();
function buildArena(id) {
  const A = { id: ARENAS.some(a => a[0] === id) ? id : 'classic', vents: [], pits: [], mud: [] };
  if (A.id === 'volcano') {
    [0.2, 0.4, 0.6, 0.8].forEach((f, k) => { A.vents.push({ x: W * f, y: 22, r: 26, st: 0, t: 2 + k * 1.3 }); A.vents.push({ x: W * (1 - f), y: H - 22, r: 26, st: 0, t: 3 + k * 1.1 }); });
    A.pits = [{ x: W * 0.3, y: 46, r: 22 }, { x: W * 0.7, y: H - 46, r: 22 }, { x: W * 0.5, y: 40, r: 18 }, { x: W * 0.5, y: H - 40, r: 18 }];
  }
  if (A.id === 'swamp') A.mud = [[0.5, 0.5, 78], [0.3, 0.3, 58], [0.7, 0.7, 58], [0.27, 0.78, 46], [0.73, 0.22, 46]].map(([fx, fy, r]) => ({ x: W * fx, y: H * fy, r: r * Math.min(1.3, W / 1300) }));
  return A;
}
const inMud = q => !!(S.arena && S.arena.mud.some(m => Math.hypot(q.x - m.x, q.y - m.y) < m.r));
const groundSpeed = p => inMud(p) ? (p.sprinting ? 0.5 : 0.65) : 1;   // sprinting barely helps in mud
const VENT_ST = ['idle', 'warn', 'blow'];
function updateArena(dt) {
  const A = S.arena; if (!A || A.id === 'classic') return;
  if (A.id === 'volcano') {
    for (const v of A.vents) {
      v.t -= dt;
      if (v.t > 0) continue;
      if (v.st === 0) { v.st = 1; v.t = 1.1; }                   // rumbling: a warning
      else if (v.st === 1) { v.st = 2; v.t = 0.7; fxEvent('vent', null, { x: v.x, y: v.y }); }
      else { v.st = 0; v.t = rand(4, 8); }
      if (v.st === 2) {   // eruption: everything on top goes up
        for (const p of S.players) if (onPitch(p) && !gkFirm(p) && (p.z || 0) < 5 && Math.hypot(p.x - v.x, p.y - v.y) < v.r) { p.vz = 430; p.z = 0.01; p.stun = Math.max(p.stun, 0.8); p.vx *= 0.3; p.vy *= 0.3; loseBall(p, rand(0, 6.28)); floatText(p, 'WHOOSH!', '#ffffff'); }
        const b = S.ball; if (!b.owner && (b.z || 0) < 5 && Math.hypot(b.x - v.x, b.y - v.y) < v.r) { b.vz = 520; b.vx += rand(-80, 80); b.vy += (v.y < H / 2 ? 1 : -1) * 120; }
      }
    }
    for (const p of S.players) {   // the lava pits
      if (!onPitch(p) || (p.z || 0) > 0) continue;
      const pit = A.pits.find(q => Math.hypot(p.x - q.x, p.y - q.y) < q.r * 0.8); if (!pit) continue;
      const by = p.lastHitBy && S.time - p.lastHitT < 2.5 ? S.players[p.lastHitBy] : null;
      loseBall(p, 0); p.sentOff = 10; p.goneWhy = 'lava'; p.stun = 0; p.target = null; burst(p.x, p.y, '#ff6a1a', 26, 30); fxEvent('lava', p);
      feed(by && by.team !== p.team ? `${by.name} shoved ${p.name} into the lava! Out for 10 seconds` : `${p.name} fell in the lava. Out for 10 seconds`, '#ff8a3d');
      if (by && by.team !== p.team) { addPop(by, 6); cheer('roar', p.x, 'INTO THE LAVA!'); addRage(by.team, RAGE.foul); }
      if (p.human) switchToBest(p.human);
    }
    const b = S.ball;   // the ball bounces out of lava
    if (!b.owner && (b.z || 0) < 2) for (const q of A.pits) if (Math.hypot(b.x - q.x, b.y - q.y) < q.r) { const a = Math.atan2(b.y - q.y, b.x - q.x); b.vx = Math.cos(a) * 220; b.vy = Math.sin(a) * 220; b.vz = 200; }
  }
  if (A.id === 'plant') {   // electric fences round the pitch, except the goal mouths
    for (const p of S.players) {
      if (!onPitch(p) || p.ko > 0 || (p.zapT > S.time)) continue;
      const inMouth = Math.abs(p.y - H / 2) < GOAL_HALF;
      const hit = (p.x < 11 && p.vx < -60 && !inMouth) ? [1, 0] : (p.x > W - 11 && p.vx > 60 && !inMouth) ? [-1, 0] : (p.y < 11 && p.vy < -60) ? [0, 1] : (p.y > H - 11 && p.vy > 60) ? [0, -1] : null;
      if (!hit) continue;
      p.zapT = S.time + 1.6; p.stun = Math.max(p.stun, 1.4); p.vx = hit[0] * 230; p.vy = hit[1] * 230; loseBall(p, Math.atan2(hit[1], hit[0]));
      floatText(p, 'ZAP!', '#9fe8ff'); fxEvent('zap', p, { x: p.x, y: p.y }); p.dizzy = p.stun;
      const by = p.lastHitBy && S.time - p.lastHitT < 2 ? S.players[p.lastHitBy] : null;
      if (by && by.team !== p.team) { addPop(by, 4); addRage(by.team, RAGE.shove); cheer('roar', p.x, 'SHOCKING!'); }
    }
  }
}
function arenaReturn(p) {   // back from the lava
  p.x = p.team === 0 ? W * 0.3 : W * 0.7; p.y = H / 2; p.vx = p.vy = 0; p.stun = 0.8;
  floatText(p, 'SINGED', '#ff8a3d'); feed(`${p.name} is back from the lava, slightly singed`, '#ff8a3d');
}
const arenaSnap = () => S.arena ? [S.arena.id, S.arena.vents.map(v => v.st)] : 0;
function arenaApply(a) {
  if (!a) return;
  if (!S.arena || S.arena.id !== a[0] || S.arena.w !== W) { S.arena = buildArena(a[0]); S.arena.w = W; }
  (a[1] || []).forEach((st, i) => { if (S.arena.vents[i]) S.arena.vents[i].st = st; });
}
// Ground hazards for the 3D view: flat discs under the players.
function arenaDecals(out) {
  const A = S.arena; if (!A) return;
  for (const q of A.pits) { out.push({ x: q.x, y: q.y, r: q.r + 5, col: '#3a1b0c', op: 0.95 }); out.push({ x: q.x, y: q.y, r: q.r, col: '#ff5a14', op: 0.9 + Math.sin(S.time * 3 + q.x) * 0.08, glow: true }); }
  for (const v of A.vents) out.push({ x: v.x, y: v.y, r: v.r * 0.75, col: v.st === 2 ? '#ffd9a8' : v.st === 1 ? '#ff8a3d' : '#3b3330', op: 0.9, glow: v.st > 0 });
  for (const m of A.mud) out.push({ x: m.x, y: m.y, r: m.r, col: '#4a3519', op: 0.82 });
}
// Over the 3D scene: steam columns from the vents and the fence wires.
function drawArena() {
  const A = S.arena; if (!A || A.id === 'classic') return;
  for (const v of A.vents) {
    if (v.st === 0) continue;
    const B = proj(v.x, v.y, 0), T = proj(v.x, v.y, v.st === 2 ? 160 : 26), s = B.s;
    const g = ctx.createLinearGradient(0, B.y, 0, T.y); g.addColorStop(0, v.st === 2 ? 'rgba(255,245,230,.75)' : 'rgba(255,170,90,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; const w = (v.st === 2 ? 26 : 14) * s;
    ctx.beginPath(); ctx.moveTo(B.x - w * 0.6, B.y); ctx.quadraticCurveTo(B.x + Math.sin(S.time * 9 + v.x) * w, (B.y + T.y) / 2, T.x - w * 1.4, T.y); ctx.lineTo(T.x + w * 1.4, T.y); ctx.quadraticCurveTo(B.x - Math.sin(S.time * 7 + v.x) * w, (B.y + T.y) / 2, B.x + w * 0.6, B.y); ctx.fill();
  }
  if (A.id === 'plant') {   // two humming wires on posts around the pitch
    const edge = (x1, y1, x2, y2) => {
      for (const z of [7, 15]) {
        ctx.beginPath(); const n = 24;
        for (let i = 0; i <= n; i++) { const u = i / n, P = proj(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, z + Math.sin(S.time * 30 + i * 2.3) * 0.8); i ? ctx.lineTo(P.x, P.y) : ctx.moveTo(P.x, P.y); }
        ctx.strokeStyle = `rgba(150,230,255,${0.45 + 0.35 * Math.abs(Math.sin(S.time * 13 + x1))})`; ctx.lineWidth = 1.6; ctx.stroke();
      }
    };
    edge(0, 0, W, 0); edge(0, H, W, H); edge(0, 0, 0, H / 2 - GOAL_HALF); edge(0, H / 2 + GOAL_HALF, 0, H); edge(W, 0, W, H / 2 - GOAL_HALF); edge(W, H / 2 + GOAL_HALF, W, H);
  }
}
