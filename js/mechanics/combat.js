/* Foul Play FC · js/mechanics/combat.js
   Rough play: the team rage meter and Overdrive, each character's own tackle (ground pound, lasso trip,
   fire and ice slides), role traits (enforcers and speedsters), ground patches, dizzy spins and hitstop.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- team rage meter and Overdrive ---------- */
// Tackles, shoves and fouls fill your team's meter. Full: the whole team glows, the next hit or tackle
// by any of them is an Overdrive (double power and a shockwave), and referees spot them far more easily.
const RAGE = { max: 100, tackle: 9, slide: 10, foul: 12, shove: 5 };
const rageOf = t => (S.rage && S.rage[t]) || 0;
const glowing = p => !!p && p.team != null && rageOf(p.team) >= RAGE.max;
function addRage(team, n) {
  if (team !== 0 && team !== 1) return;
  S.rage = S.rage || [0, 0];
  const was = S.rage[team]; S.rage[team] = Math.min(RAGE.max, was + n);
  if (was < RAGE.max && S.rage[team] >= RAGE.max) {
    feed(`${TEAM[team].name} are ENRAGED: their next hit or tackle is an Overdrive, but the referees can't miss them`, TEAM[team].col);
    fxEvent('enraged', null, { team }); S.excite += 0.4;
  }
}
// Spend a full meter on this hit. Returns true if it was an Overdrive.
function overdrive(a, t) {
  if (!glowing(a)) return false;
  S.rage[a.team] = 0;
  floatText(a, 'OVERDRIVE!', '#ff5a3d'); cheer('roar', a.x, 'OVERDRIVE!'); S.excite += 0.6; M(a, 'overdrives');
  fxEvent('overdrive', a);
  shockwave(a, t || a, 64, { stun: 1.5, kb: 330, dmg: 8 });
  hitstop(0.1, 12);
  return true;
}
// Everyone on the other team near a point gets knocked down.
function shockwave(a, c, r, o) {
  fxEvent('wave', null, { x: c.x, y: c.y, side: Math.round(r) });
  for (const q of S.players) if (q.team !== a.team && onPitch(q) && q.ko <= 0 && dist(q, c) < r && (q.z || 0) < 14)
    knock(a, q, Object.assign({ from: c, foul: true, kind: 'pound', rage: 0 }, o));
}
// Referees spot a glowing (enraged) team's fouls from much further away and wider.
function seesFoul(r, f) {
  if (!glowing(f.a)) return sees(r, f.a.x, f.a.y) || sees(r, f.x, f.y);
  const wide = (x, y) => {
    if (r.blind > 0 || r.gone > 0 || MUT.noRef || inSmoke(x, y)) return false;
    const dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy);
    return d < 60 || (d < r.range * 1.7 && Math.abs(angDiff(r.face, Math.atan2(dy, dx))) < Math.min(Math.PI, r.fov * 0.85));
  };
  return sees(r, f.a.x, f.a.y) || sees(r, f.x, f.y) || wide(f.a.x, f.a.y) || wide(f.x, f.y);
}

/* ---------- impact feel ---------- */
// A tiny freeze of the whole game and a camera shake when something brutal lands.
function hitstop(t, shake) { S.hitstop = Math.max(S.hitstop || 0, t); S.shake = Math.max(S.shake || 0, shake || 6); }
// After a fall from an illegal hit, players get up seeing stars and spin on the spot until they recover.
const isDizzy = p => !!p && p.dizzy > 0 && p.stun > 0 && p.ko <= 0 && p.stun < p.dizzy - 0.6;
// Every foul or hard hit landing goes through here: rage, fragile speedsters, dizzy spins, hitstop, gasps.
function afterHit(a, t, o) {
  if (!a || !t || a === t || !onPitch(t)) return;
  if (o.foul && a.team !== t.team) addRage(a.team, o.rage != null ? o.rage : RAGE.foul);
  if (traitOf(t) === 'speedster' && o.heavy && t.stun > 0) {   // fragile: a heavy hit sends them rolling and keeps them down longer
    t.stun *= TRAITS.speedster.fragile; t.vx *= 1.5; t.vy *= 1.5; floatText(t, 'SENT FLYING', '#ffcf5a');
  }
  if (o.foul && t.stun > 0.9) t.dizzy = t.stun;
  if (o.heavy) { hitstop(0.05, 7); if (o.foul) fxEvent('gasp', t); }
}

/* ---------- roles: enforcers and speedsters ---------- */
const TRAITS = {
  enforcer: { speed: 0.92, tackle: 1.5, shove: 200, shotErr: 0.12 },   // strong in the tackle, shrug off light shoves; slower, wilder shots
  speedster: { sprint: 1.1, fragile: 1.7 },                             // quicker flat out, tighter control (js/mechanics/dribbling.js); fragile
};
const TRAIT_OF = { brawler: 'enforcer', tank: 'enforcer', brawn: 'enforcer', bulwark: 'enforcer', speedster: 'speedster', ronin: 'speedster', shogun: 'speedster', assassin: 'speedster' };
const traitOf = p => (p && TRAIT_OF[p.cls]) || null;
function traitSpeed(p) { const t = traitOf(p); return t === 'enforcer' ? TRAITS.enforcer.speed : t === 'speedster' && p.sprinting ? TRAITS.speedster.sprint : 1; }
function traitTackle(p) { return (traitOf(p) === 'enforcer' ? TRAITS.enforcer.tackle : 1) * (glowing(p) ? 1.4 : 1); }
const shrugsOff = (t, o) => traitOf(t) === 'enforcer' && (o.kb || 0) < TRAITS.enforcer.shove && (o.stun || 0) < 1;
const shotError = p => traitOf(p) === 'enforcer' ? rand(-1, 1) * TRAITS.enforcer.shotErr : 0;

/* ---------- each character's tackle (J without the ball) ---------- */
// pound: jump and slam the ground; everyone close is knocked flat. lasso: trip someone from a short distance.
// fire / ice: a normal slide that leaves a scorch patch (opponents bounce off it in panic) or a slick (sprinters skid helplessly).
const TACKLE_STYLE = { brawler: 'pound', tank: 'pound', brawn: 'pound', bulwark: 'ice', cinderwyrm: 'fire', striker: 'fire', hollow: 'lasso', ranger: 'lasso', trickster: 'lasso' };
const TACKLE_NAME = { pound: 'Ground pound', lasso: 'Lasso trip', fire: 'Fire slide', ice: 'Ice slide' };
function tackleMove(p) {
  const st = TACKLE_STYLE[p.cls];
  if (st === 'pound') return groundPound(p);
  if (st === 'lasso') return lassoTrip(p);
  slideTackle(p);
  if (p.slide > 0 && (st === 'fire' || st === 'ice')) p.slideFx = st;
}
function groundPound(p) {
  if (p.slideCd > 0 || p.z > 0 || p.carry != null || p.pounding) return;
  if (p.stamina < 14) { if (p.human) floatText(p, 'Too tired to pound', '#c8c8c8'); return; }
  p.slideCd = 2.4; p.stamina -= 14; p.pounding = true; p.vz = 200; p.z = 0.01; p.vx *= 0.4; p.vy *= 0.4; a0Anim(p, 'swing', 0.5); M(p, 'pounds');
}
function lassoTrip(p) {
  if (p.slideCd > 0 || p.z > 0 || p.carry != null) return;
  const cand = enemiesOf(p).filter(q => q.ko <= 0 && (q.z || 0) < 10 && dist(q, p) < 135);
  const t = assistPick(p, cand, 135, 0.8) || (S.ball.owner && cand.includes(S.ball.owner) ? S.ball.owner : null);
  if (!t) { if (p.human) floatText(p, 'No one to trip', '#c8c8c8'); p.slideCd = 0.4; return; }
  p.slideCd = 2.2; p.stamina = Math.max(0, p.stamina - 10); a0Anim(p, 'swing', 0.4); p.face = Math.atan2(t.y - p.y, t.x - p.x);
  (S.lassos || (S.lassos = [])).push({ a: p.id, t: t.id, life: 0.45 }); thump(320, 0.08, 0.05);
  const behind = Math.abs(angDiff(t.face, Math.atan2(t.y - p.y, t.x - p.x))) < 1.2;   // tripping from behind
  knock(p, t, { stun: behind ? 1.3 : 1, kb: 120, from: { x: 2 * t.x - p.x, y: 2 * t.y - p.y }, foul: true, kind: 'lasso', heavy: false, col: '#d8b26a' });
  floatText(t, behind ? 'TRIPPED FROM BEHIND' : 'LASSOED', '#d8b26a');
}

/* ---------- per frame ---------- */
function updateCombat(dt) {
  S.patches = S.patches || []; S.lassos = S.lassos || []; S.rage = S.rage || [0, 0];
  for (const l of S.lassos) l.life -= dt; S.lassos = S.lassos.filter(l => l.life > 0);
  for (const p of S.players) {
    if (gkFirm(p) && p.stun > 0 && !p.thrown) { p.stun = 0; p.dizzy = 0; if (p.anim === 'fall') p.animT = 0; }   // keepers keep their feet until HP is low
    if (p.dizzy > 0 && p.stun <= 0) p.dizzy = 0;
    if (p.skidT > 0) p.skidT -= dt;
    if (!onPitch(p)) continue;
    if (p.pounding && p.z <= 0 && p.vz <= 0) {   // landing from a ground pound
      p.pounding = false; burst(p.x, p.y, '#c9a070', 26, 8);
      if (!overdrive(p, p)) shockwave(p, p, 58, { stun: 1.25, kb: 250, dmg: 6, heavy: true, rage: RAGE.shove });
      hitstop(0.06, 9);
    }
    if (p.slide > 0 && p.slideFx) {   // fire and ice slides leave a patch every few steps
      if (!p.lastPatch || dist(p, p.lastPatch) > 12) {
        S.patches.push({ kind: p.slideFx === 'fire' ? 'scorch' : 'slick', x: p.x, y: p.y, r: 15, ttl: p.slideFx === 'fire' ? 6 : 8, life: p.slideFx === 'fire' ? 6 : 8, team: p.team });
        p.lastPatch = { x: p.x, y: p.y };
      }
    } else if (!(p.slide > 0)) { p.slideFx = null; p.lastPatch = null; }
  }
  for (const z of S.patches) z.ttl -= dt;
  S.patches = S.patches.filter(z => z.ttl > 0); if (S.patches.length > 140) S.patches.splice(0, S.patches.length - 140);
  for (const p of S.players) {
    if (!able(p) || (p.z || 0) > 0) continue;
    for (const z of S.patches) {
      if (Math.hypot(p.x - z.x, p.y - z.y) > z.r) continue;
      if (z.kind === 'scorch' && z.team !== p.team && !gkFirm(p) && !(p.panicT > S.time)) {   // hot feet: a panicked hop in a random direction
        p.panicT = S.time + 1.3; const a = rand(0, Math.PI * 2);
        p.vx = Math.cos(a) * 240; p.vy = Math.sin(a) * 240; p.vz = 170; p.z = 0.01; p.stun = Math.max(p.stun, 0.35);
        loseBall(p, a); floatText(p, 'HOT HOT HOT!', '#ff8a3d'); burst(p.x, p.y, '#ff8a3d', 10, 10);
      } else if (z.kind === 'slick' && p.sprinting && !(p.skidT > 0)) {   // sprinting onto ice: no grip at all for a moment
        p.skidT = 0.9; floatText(p, 'WHOA!', '#bfe9ff'); if (S.ball.owner === p) loseBall(p, Math.atan2(p.vy, p.vx));
      }
      break;
    }
  }
}

function resetCombat(mode) {
  S.rage = [0, 0]; S.patches = []; S.lassos = []; S.varCheck = null; S.hitstop = 0; S.waves = [];
  resetBallMods();
  if (mode !== 'client') { S.arena = buildArena(S.phase === 'menu' ? 'classic' : ARENA_PREF); S.arena.w = W; }
}

/* ---------- online: what clients need to draw ---------- */
const combatSnap = () => ({
  rg: (S.rage || [0, 0]).map(v => Math.round(v)),
  pt: (S.patches || []).map(z => [z.kind === 'scorch' ? 0 : z.kind === 'slick' ? 1 : 2, Math.round(z.x), Math.round(z.y), z.r, Math.round(z.ttl * 10) / 10, z.life]),
  ls: (S.lassos || []).map(l => [l.a, l.t, Math.round(l.life * 100) / 100]),
  dz: S.players.filter(p => p.dizzy > 0).map(p => [p.id, Math.round(p.dizzy * 10) / 10]),
});
function combatApply(c) {
  if (!c) return;
  S.rage = c.rg || [0, 0];
  S.patches = (c.pt || []).map(z => ({ kind: ['scorch', 'slick', 'mud'][z[0]], x: z[1], y: z[2], r: z[3], ttl: z[4], life: z[5] }));
  S.lassos = (c.ls || []).map(l => ({ a: l[0], t: l[1], life: l[2] }));
  for (const p of S.players) p.dizzy = 0; for (const [id, v] of c.dz || []) if (S.players[id]) S.players[id].dizzy = v;
}
