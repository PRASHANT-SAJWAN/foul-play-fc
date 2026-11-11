/* Foul Play FC · js/ui/catalog.js
   The class catalog.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- class catalog ---------------- */
let showRoleTab = null;
const PORTRAITS = {};
function classPortrait(C) {   // a little blocky bust in the class colours
  if (PORTRAITS[C.id]) return PORTRAITS[C.id];
  const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d'), L = C.look;
  const bg = g.createRadialGradient(60, 50, 10, 60, 60, 80); bg.addColorStop(0, C.col); bg.addColorStop(1, '#0b1210'); g.fillStyle = bg; g.fillRect(0, 0, 120, 120);
  g.fillStyle = C.col; g.fillRect(26, 84, 68, 40); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(26, 84, 68, 6);
  g.fillStyle = '#ffffff'; g.font = "700 22px 'Barlow Condensed', sans-serif"; g.textAlign = 'center'; g.fillText(C.num, 60, 112);
  if (L.hair === 9) { g.fillStyle = L.hairCol; g.fillRect(18, 42, 12, 34); g.fillRect(90, 42, 12, 34); }
  g.fillStyle = L.skin; g.fillRect(32, 30, 56, 56);
  g.fillStyle = L.hairCol;
  if (L.hair === 8) { g.fillRect(30, 22, 60, 16); g.beginPath(); for (let k = 0; k < 6; k++) { const x = 30 + k * 10; g.moveTo(x, 24); g.lineTo(x + 5 + (k - 2.5) * 3, 4 + Math.abs(k - 2.5) * 4); g.lineTo(x + 10, 24); } g.fill(); g.fillRect(30, 36, 10, 12); }
  else if (L.hair === 0) g.fillRect(30, 26, 60, 8);
  else if (L.hair === 5) { g.fillRect(30, 22, 60, 16); g.fillRect(28, 30, 10, 40); g.fillRect(82, 30, 10, 40); }
  else if (L.hair !== 6) { g.fillRect(30, 22, 60, 16); g.fillRect(30, 36, 8, 12); g.fillRect(82, 36, 8, 12); }
  g.fillStyle = '#ffffff'; g.fillRect(40, 52, 14, 12); g.fillRect(66, 52, 14, 12); g.fillStyle = L.eyes || '#222'; g.fillRect(45, 55, 7, 9); g.fillRect(70, 55, 7, 9);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(40, 46, 14, 4); g.fillRect(66, 46, 14, 4); g.fillRect(52, 74, 16, 3);
  if (L.acc === 5) { g.fillStyle = '#2a1f3a'; g.fillRect(26, 16, 68, 12); g.fillRect(26, 16, 8, 70); g.fillRect(86, 16, 8, 70); g.fillRect(32, 68, 56, 18); }
  if (L.acc === 6) { g.fillStyle = '#f4f4f0'; g.fillRect(16, 24, 88, 8); g.fillRect(36, 2, 48, 24); g.fillStyle = '#1b1b1b'; g.fillRect(36, 18, 48, 6); }
  if (L.acc === 7) { g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(38, 50, 18, 16); g.strokeRect(64, 50, 18, 16); g.beginPath(); g.moveTo(56, 56); g.lineTo(64, 56); g.stroke(); }
  if (L.acc === 1) { g.fillStyle = C.col; g.fillRect(30, 38, 60, 6); }
  return (PORTRAITS[C.id] = c.toDataURL());
}
function classKeyLabels() { return SKILL_KEYS.map(k => keyLabel(BINDS[0][k])); }
function openRoles(from) {
  rolesFrom = from;
  const nav = $('rl-tabs'), body = $('rl-body'), keysL = classKeyLabels();
  nav.innerHTML = Object.entries(ROLE_INFO).map(([r, R]) => `<div class="rl-group" style="color:${R.col}">${R.name}</div>` + CLASSES.filter(c => c.role === r).map(c => `<button role="tab" id="rt-${c.id}" aria-controls="rp-${c.id}" aria-selected="false" tabindex="-1"><span style="color:${c.col}">■</span> ${c.name}${c.id === MY_CLASS ? ' ✓' : ''}</button>`).join('')).join('') +
    '<div class="rl-group">Teams</div><button role="tab" id="rt-syn" aria-controls="rp-syn" aria-selected="false" tabindex="-1">Synergies</button><button role="tab" id="rt-line" aria-controls="rp-line" aria-selected="false" tabindex="-1">Line-ups</button>';
  body.innerHTML = CLASSES.map(c => { const R = ROLE_INFO[c.role]; return `<section class="guide-sec role-card" id="rp-${c.id}" role="tabpanel" aria-labelledby="rt-${c.id}" hidden>
    <div class="cls-head"><img class="cls-portrait" alt="" src="${classPortrait(c)}">
      <div><h3 style="color:${c.col};margin:0">${c.name}</h3><p class="lede" style="margin:2px 0 8px">${c.title} · <span class="role-chip" style="color:${R.col}">${R.name}</span></p>
      ${c.id === MY_CLASS ? '<p class="hint">✓ This is your class</p>' : `<button class="btn sm" data-play="${c.id}">Play as ${c.name}</button>`}</div></div>
    <p><b>Passive · ${esc(c.passive[0])}.</b> ${esc(c.passive[1])}</p>
    <ul class="cls-skills">${c.skills.map((k, i) => `<li><kbd>${esc(keysL[i])}</kbd><span><b>${esc(k.name)}.</b> ${esc(k.desc)}</span><span class="cd">${k.cd} s${k.shared ? ' · team' : ''}</span></li>`).join('')}
      <li class="cls-ult"><kbd>${esc(keysL[3])}</kbd><span><b>Ultimate · ${esc(c.ult.name)}.</b> ${esc(c.ult.desc)}</span><span class="cd">100%</span></li></ul></section>`; }).join('') +
    `<section class="guide-sec role-card" id="rp-syn" role="tabpanel" aria-labelledby="rt-syn" hidden><h3>Class synergies</h3><p>A team that fields every class in a synergy gets its bonus for the whole match.</p>
      <ul class="cls-skills">${SYNERGIES.map(y => `<li><span>★</span><span><b>${y.name}</b> (${y.need.map(n => CLS[n].name).join(' + ')}${y.id === 'sustain' ? ' + any' : ''}). ${esc(y.desc)}</span><span></span></li>`).join('')}</ul></section>
    <section class="guide-sec role-card" id="rp-line" role="tabpanel" aria-labelledby="rt-line" hidden><h3>Recommended line-ups (5v5)</h3><p>Bots use these. Pick one in Pace and controls → Game → Bot line-ups. The goalkeeper slot is always a Goalkeeper; 3v3 uses the forward and the first defender.</p>
      ${Object.entries(LINEUPS).map(([k, L]) => `<h4 style="text-transform:capitalize">${k}</h4><div class="lineup">${['Goalkeeper', ...L.map(n => CLS[n].name)].map(n => `<span>${n}</span>`).join('')}</div>`).join('')}</section>`;
  body.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { const id = b.dataset.play; setMyClass(id); openRoles(rolesFrom); showRoleTab('rt-' + id); });
  if (!showRoleTab) showRoleTab = setupTabs(nav, body);
  showOverlay('roles'); showRoleTab('rt-' + MY_CLASS);
}
$('m-roles').onclick = () => openRoles('menu');
$('rl-close').onclick = () => showOverlay(rolesFrom);
