/* Foul Play FC · js/match/feedback.js
   Feed messages, floating text, particles, popularity, mood, charge, karma, crowd cheers and animation helpers.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- feedback helpers ---------------- */
function feed(text, col = '#eef2e6') { S.feed.unshift({ text, col, t: 0 }); if (S.feed.length > 6) S.feed.pop(); }
function floatText(p, text, col) { S.texts.push({ x: p.x, y: p.y, z: 40, text, col, life: 1.3 }); }
function burst(x, y, col, n, z = 14) {
  for (let i = 0; i < n; i++) S.parts.push({ x, y, z, vx: rand(-120, 120), vy: rand(-80, 80), vz: rand(60, 220), life: rand(0.4, 0.9), col, size: rand(1.5, 3.2) });
}
function addPop(p, n) {
  if (n > 0 && p.fx && p.fx.megaphone > 0) n *= 2;
  p.pop = Math.max(0, p.pop + n);
  if (n > 0) { p.hype += n; while (p.hype >= 30) { p.hype -= 30; throwItem(p); } }
}
const loud = (...ps) => ps.some(p => p && p.human);
const addMood = (p, n) => { if (p) p.mood = clamp(p.mood + n, -100, 100); };
const addCharge = (p, n) => { if (!p) return; if (n > 0 && p.mood >= MOOD_ZONE) n *= 1.15; const c0 = p.charge; p.charge = clamp(p.charge + n, 0, 100); const d = p.charge - c0; if (d > 0) M(p, 'chargeEarned', d); else if (d < 0) M(p, 'chargeSpent', -d); };
const addKarma = (p, n) => { if (p) { p.karma = clamp(p.karma + n, -100, 100); if (n < 0) p.cleanT = 0; } };
// Referee opinion: the performance (charge) meter is the main positive source; caught fouls and bad karma pull it down.
const refOpinion = p => clamp(Math.round((p.charge - 40) + p.karma * 0.4 - 18 * p.stats.caught), -100, 100);
let CHANT_ID = 0;
const CHEER_COL = { roar: '#ffb36b', applause: '#7dff9b', boo: '#ff6b80' };
function cheer(kind, x, text) {
  if ((S.cheerCd[kind] || 0) > S.time) return;
  S.cheerCd[kind] = S.time + 0.8;
  S.chants.push({ id: ++CHANT_ID, kind, text, x: clamp(x + rand(-60, 60), 40, W - 40), life: 2.2 });
  if (S.chants.length > 5) S.chants.shift();
  S.excite += kind === 'boo' ? 0.15 : 0.3;
  crowdSound(kind);
}

/* ---------- small helpers ---------- */
function a0Anim(p, anim, t) { if (p) { p.anim = anim; p.animT = t; } }
const ANIMS = ['', 'punch', 'kick', 'swing', 'shoot', 'fall', 'plead', 'facepalm', 'cel0', 'cel1', 'cel2', 'cel3', 'cel4', 'cel5', 'shrug', 'point', 'sorry', 'wave', 'chest', 'thumbs'];
const animIdx = a => Math.max(0, ANIMS.indexOf(a || ''));
