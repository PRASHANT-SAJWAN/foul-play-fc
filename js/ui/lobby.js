/* Foul Play FC · js/ui/lobby.js
   Lobby ready-up (everyone, the host too; the match starts once all are ready) and mute.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- lobby: ready-up and mute ---------------- */
$('on-ready').onclick = () => {
  if (!NET) return; const me = NET.roster[NET.uid];
  if (NET.isHost) { if (me) { me.ready = !me.ready; rosterChanged(); } return; }
  if (NET.conn) NET.conn.send({ t: 'ready', ready: !(me && me.ready) });
};
for (const id of ['on-t0', 'on-t1']) $(id).addEventListener('click', e => {
  const li = e.target.closest('li[data-uid]'); if (!li || !NET || li.dataset.uid === NET.uid) return;
  const u = li.dataset.uid; if (NET.muted.has(u)) NET.muted.delete(u); else NET.muted.add(u); renderRoster();
});
