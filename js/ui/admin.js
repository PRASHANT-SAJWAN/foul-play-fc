/* Foul Play FC · js/ui/admin.js
   The Playground admin panel.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- playground admin panel ---------------- */
function admin(act) {
  const h = S.humans[0], p = h && S.players[h.pid]; if (!p || !S.admin) return;
  if (act.startsWith('pu:')) { applyPowerup(p, act.slice(3)); return; }
  if (act.startsWith('give:')) { pickup(p, { type: act.slice(5), for: p }); return; }
  if (act === 'bench') { if (S.ball.owner === p) S.ball.owner = null; sendToBench(p); return; }
  if (act.startsWith('an:')) { if (!startAnomaly(act.slice(3))) feed('That anomaly is already happening', '#c8c8c8'); return; }
  if (act === 'injure') { injure(p, 20, null); return; }
  if (act === 'ult') { p.ult = 100; return; }
  if (act === 'cds') { p.cd = [0, 0, 0]; S.teamCd = [{}, {}]; return; }
  if (act.startsWith('w:')) { const w = act.slice(2); p.items[w] = (p.items[w] || 0) + (w === 'sling' ? 5 : 10); return; }
  if (act === 'bounty') { S.bountyOn = true; S.bountyT = 0; S.bounty = null; return; }
  const b = S.ball;
  if (act === 'bat') { p.items.bat += 3; floatText(p, 'BAT ×3', '#ffcf5a'); }
  if (act === 'flash') { p.items.flash += 1; floatText(p, 'FLASH', '#fff6c0'); }
  if (act === 'banana') { p.items.banana += 2; floatText(p, 'BANANA ×2', '#ffe14d'); }
  if (act === 'sand') { p.blind = 2; p.blindT = 0; floatText(p, 'SAND ×2', '#d8c08a'); }
  if (act === 'heal') { p.hp = 100; p.stun = 0; p.ko = 0; floatText(p, 'FULL HP', '#7dff9b'); }
  if (act === 'gift') throwItem(p);
  if (act === 'ball') { if (b.owner && b.owner !== p) b.owner.pickCd = 0.8; b.owner = p; b.lastTouch = p; p.hold = 0; }
  if (act === 'ko') { const t = p.target; if (t) { t.hp = 0; t.ko = 6; t.stun = 6; loseBall(t, 0); floatText(t, 'K.O.', '#ff6b6b'); } else floatText(p, 'No one in reach', '#c8c8c8'); }
  if (act === 'blindrefs') for (const r of S.refs) r.blind = 6;
  if (act === 'kickoff') kickoff(0, 'KICK OFF');
  if (act === 'penalty') setPiece(0, 'penalty', 0, 0, 'PENALTY');
  if (act === 'freekick') setPiece(0, 'free', W - BOX_D - 100, H / 2 + 70, 'FREE KICK');
  if (act === 'score') S.score = [0, 0];
  if (act === 'end') endMatch();
  if (act === 'charge') { p.charge = 100; floatText(p, 'CHARGE 100%', '#4fd6ff'); }
  if (act === 'heat') { S.heat = 1.5; floatText(p, 'BOTS ANGRY', '#ff6b80'); }
  if (act === 'karmaup') { addKarma(p, 50); floatText(p, 'KARMA +50', '#7dff9b'); }
  if (act === 'karmadown') { addKarma(p, -50); floatText(p, 'KARMA −50', '#ff6b80'); }
}
function renderAdmSegs() {
  const mk = (id, key, opts) => {
    const el = document.getElementById(id);
    el.innerHTML = opts.map(([n, v]) => `<button aria-pressed="${!!(S.admin && S.admin[key] === v)}" data-v="${v}">${n}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { if (S.admin) S.admin[key] = b.dataset.v; renderAdmSegs(); });
  };
  mk('adm-refs', 'refs', [['Normal', 'normal'], ['Off', 'off'], ['See all', 'strict']]);
  mk('adm-bots', 'bots', [['Normal', 'normal'], ['Frozen', 'frozen'], ['Peaceful', 'peaceful'], ['Savage', 'savage']]);
}
function setupAdmin(on) {
  const el = document.getElementById('admin');
  el.hidden = !on; el.classList.remove('min'); document.getElementById('adm-toggle').textContent = 'Hide';
  if (!on) return;
  document.getElementById('adm-god').checked = false; document.getElementById('adm-inf').checked = false;
  renderAdmSegs();
}
function toggleAdmin() {
  const el = document.getElementById('admin'); el.classList.toggle('min');
  document.getElementById('adm-toggle').textContent = el.classList.contains('min') ? 'Show' : 'Hide';
}
document.querySelectorAll('[data-adm]').forEach(b => b.addEventListener('click', () => { admin(b.dataset.adm); b.blur(); }));
document.getElementById('adm-toggle').addEventListener('click', e => { toggleAdmin(); e.currentTarget.blur(); });
document.getElementById('adm-god').addEventListener('change', e => { if (S.admin) S.admin.god = e.target.checked; e.target.blur(); });
document.getElementById('adm-inf').addEventListener('change', e => { if (S.admin) S.admin.inf = e.target.checked; e.target.blur(); });
