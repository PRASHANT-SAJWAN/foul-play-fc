/* Foul Play FC · js/net/join.js
   Joining someone else's room.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ----- player joining someone else's room ----- */
async function joinRoom() {
  const inv = parseInvite($('on-code').value);
  if (!inv) { onStatus('Enter the 5-letter room code, or paste the invite link the host sent you.'); return; }
  const { code } = inv, name = myName();
  if (LOCAL_SAVE === null) await detectLocalSave();
  // A pasted invite link means the host shared their backup link: connect through it.
  if (inv.base) { await joinViaRelay(inv.base, code, name, null); return; }
  const fallback = inv.relay || (PENDING_RELAY && PENDING_RELAY.code === code ? PENDING_RELAY.base : null) || (RELAY_HERE ? location.href : null);
  let peer = null;
  try {
    onStatus('Looking for room ' + code + '…'); await loadPeerJs();
    peer = await openPeer();
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('TIMEOUT')), fallback ? 8000 : 15000);
      conn.once('open', () => { clearTimeout(t); res(); });
      peer.once('error', e => { clearTimeout(t); rej(e); });
    });
    finishJoin(code, name, conn, peer, 'direct');
  } catch (e) {
    if (peer) peer.destroy();
    if (fallback) { await joinViaRelay(fallback, code, name, e); return; }   // the invite named a relay, or this page came from the host's link
    netError(e);
    if (e && (e.message === 'TIMEOUT' || e.type === 'network')) onStatus($('on-status').textContent + ' If the host shares their backup link, paste it above and join again.');
  }
}
async function joinViaRelay(base, code, name, directErr) {
  try {
    onStatus(directErr ? 'A direct connection didn\'t work. Connecting through the host\'s link…' : 'Connecting through the host\'s link…');
    const conn = await relayConnect(base, code);
    finishJoin(code, name, conn, { id: 'pending-relay', destroy() {} }, 'link');
  } catch (e) {
    onStatus(directErr ? 'Could not connect directly or through the link. Check the room code and that the host still has the game open.' : 'Could not connect through that link. It may have expired: ask the host for a fresh one, or check the room code.');
  }
}
function finishJoin(code, name, conn, peer, via) {
  NET = newNet(code, false, peer); NET.conn = conn; NET.via = via;
  conn.on('data', clientData);
  conn.on('close', hostGone);
  if (peer.on) peer.on('error', e => console.warn('peer', e.type, e));
  conn.send({ t: 'hello', name, skin: MY_SKIN, cls: MY_CLASS, lock: LOCK_PLAYER, useSkin: USE_MY_LOOK });
  showLobby(); onStatus(via === 'link' ? 'Joined through the host\'s link. Waiting for the host to start…' : 'Joined. Waiting for the host to start…');
}
function clientData(d) {
  const n = NET; if (!n || !d) return;
  if (d.t === 'welcome') { if (d.uid) n.uid = d.uid; renderRoster(); return; }
  if (d.t === 'roster') {
    n.roster = d.roster || {}; n.meta = d.meta || n.meta; n.pings = d.pg || n.pings; renderRoster(); updateRematchNote();
    if (n.meta.status === 'playing' && S.net !== 'client') startClient();
  } else if (d.t === 'state') applySnap(d.s);
  else if (d.t === 'report') { S.lastReport = d.r; saveHistory(d.r); }
  else if (d.t === 'ping') { try { n.conn.send({ t: 'pong', ts: d.ts }); } catch (e) {} }
  else if (d.t === 'full') { leaveRoom(true); onStatus(`That room is full (${MAX_PLAYERS} players).`); }
  else if (d.t === 'closed') hostGone();
}
function hostGone() {
  if (!NET || NET.isHost) return;
  leaveRoom(true);
  S.net = null; S.phase = 'menu'; newMatch('watch'); openOnline();
  onStatus('The host closed the room or the connection dropped.');
}
function startClient() {
  if (AC && AC.state === 'suspended') AC.resume();
  S.net = 'client'; S.phase = 'play'; newMatch('client');
  S.humans = []; S.pause = 0; S.pauseMsg = '';
  for (const p of S.players) p.snap = false;
  for (const r of S.refs) r.snap = false;
  S.ball.snap = false;
  showOverlay(null);
}
function leaveRoom(silent) {
  if (!NET) return;
  const n = NET; NET = null;
  clearInterval(n.pingTimer); clearInterval(n.tunnelPoll);
  if (n.hub) setTimeout(() => { try { n.hub.ws.close(); } catch (e) {} }, 250);
  try {
    if (n.isHost) {
      for (const c of Object.values(n.conns)) { try { c.send({ t: 'closed' }); } catch (e) {} }
      setTimeout(() => n.peer.destroy(), 200);
    } else { try { n.conn.close(); } catch (e) {} n.peer.destroy(); }
  } catch (e) {}
  $('on-setup').hidden = false; $('on-lobby').hidden = true; $('on-invite').hidden = true; $('on-invite-note').hidden = true; $('on-relay').hidden = true;
  if (!silent) onStatus('');
}
addEventListener('pagehide', () => leaveRoom(true));
