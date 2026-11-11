/* Foul Play FC · js/ui/menus.js
   Menus, starting and pausing matches, and the touch controls.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

function showOverlay(id) { if (id === 'setup' && typeof renderSetup === 'function') renderSetup(); overlays.forEach(o => document.getElementById(o).hidden = o !== id); updateTouch(); }
function updateTouch() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  document.getElementById('touch').hidden = !(coarse && S.phase === 'play' && (S.humans.length || S.net || S.refHuman) && !S.userPaused);
}
function start(mode) { initAudio(); if (AC && AC.state === 'suspended') AC.resume(); S.phase = 'play'; newMatch(mode); setupAdmin(mode === 'playground'); whistle(1); showOverlay(null); }
function toMenu() { leaveRoom(); S.net = null; applyTeams(SETUP.teams); S.phase = 'menu'; newMatch('watch'); setupAdmin(false); showOverlay('menu'); }
function togglePause() { S.userPaused = !S.userPaused; renderAnomOpts('p-anomlvl'); renderRefVis('p-refdist'); document.getElementById('p-anom').hidden = S.net === 'client' || S.mode === 'playground'; document.getElementById('p-ref').hidden = S.net === 'client'; document.getElementById('p-restart').hidden = S.net === 'client'; document.getElementById('p-menu').textContent = S.net ? 'Leave room' : 'Main menu'; showOverlay(S.userPaused ? 'paused' : null); }
document.getElementById('m-1p').onclick = () => start('1p');
document.getElementById('m-2pv').onclick = () => start('2pv');
document.getElementById('m-2pc').onclick = () => start('2pc');
document.getElementById('m-watch').onclick = () => start('watch');
document.getElementById('m-play').onclick = () => start('playground');
document.getElementById('m-ref').onclick = () => start('ref');
document.getElementById('p-resume').onclick = togglePause;
document.getElementById('p-restart').onclick = () => start(S.mode);
document.getElementById('p-menu').onclick = toMenu;
document.getElementById('o-again').onclick = () => {
  if (S.net === 'client') { if (NET && NET.conn) NET.conn.send({ t: 'rematch' }); document.getElementById('o-again').textContent = 'Voted ✓'; return; }
  if (S.net === 'host') { S.rematch[NET.uid] = true; NET.meta.votes = Object.keys(S.rematch).length; rosterChanged(); checkRematch(); return; }
  start(S.mode);
};
document.getElementById('o-menu').onclick = toMenu;
document.getElementById('m-settings').onclick = () => openSettings('menu');
document.getElementById('m-guide').onclick = () => openGuide('menu');
document.getElementById('p-guide').onclick = () => openGuide('paused');
document.getElementById('g-close').onclick = closeGuide;
document.getElementById('p-settings').onclick = () => openSettings('paused');
document.getElementById('s-back').onclick = closeSettings;
document.getElementById('s-reset').onclick = () => { BINDS = DEFAULT_BINDS.map(d => ({ ...d })); store.set('fpfc-binds', BINDS); rebinding = null; rebuildMaps(); renderBinds(); };

// touch controls
const stick = document.getElementById('stick'), knob = document.getElementById('knob');
let stickId = null, ox = 0, oy = 0;
stick.addEventListener('pointerdown', e => { stickId = e.pointerId; ox = e.clientX; oy = e.clientY; stick.setPointerCapture(e.pointerId); const r = stick.getBoundingClientRect(); knob.hidden = false; knob.style.left = (ox - r.left) + 'px'; knob.style.top = (oy - r.top) + 'px'; });
stick.addEventListener('pointermove', e => { if (e.pointerId !== stickId) return; let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy); if (l > 46) { dx *= 46 / l; dy *= 46 / l; } virt.jx = dx / 46; virt.jy = dy / 46; if (Math.hypot(virt.jx, virt.jy) < 0.15) virt.jx = virt.jy = 0; });
const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; virt.jx = virt.jy = 0; knob.hidden = true; };
stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
document.querySelectorAll('.tb').forEach(b => {
  const a = b.dataset.act;
  b.addEventListener('pointerdown', e => { e.preventDefault(); virt[a] = true; b.setPointerCapture(e.pointerId); });
  const off = () => { virt[a] = false; };
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
});
