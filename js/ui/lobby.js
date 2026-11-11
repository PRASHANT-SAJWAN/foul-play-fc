/* Foul Play FC · js/ui/lobby.js
   Lobby ready-up and mute.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- lobby: ready-up and mute ---------------- */
$('on-ready').onclick = () => { if (!NET || !NET.conn) return; const me = NET.roster[NET.uid]; NET.conn.send({ t: 'ready', ready: !(me && me.ready) }); };
for (const id of ['on-t0', 'on-t1']) $(id).addEventListener('click', e => {
  const li = e.target.closest('li[data-uid]'); if (!li || !NET || li.dataset.uid === NET.uid) return;
  const u = li.dataset.uid; if (NET.muted.has(u)) NET.muted.delete(u); else NET.muted.add(u); renderRoster();
});
