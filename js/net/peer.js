/* Foul Play FC · js/net/peer.js
   Online play setup: PeerJS and room codes.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- online play (PeerJS / WebRTC) ----------------
   The host's browser IS the server: it keeps the roster and the true game state in memory,
   runs the simulation, and sends snapshots ~20 times a second straight to each player over WebRTC.
   The public PeerJS server (0.peerjs.com) is only used to introduce players to the host by room code. */
let NET = null, PEER_READY = null;
const $ = id => document.getElementById(id);
const onStatus = t => { $('on-status').textContent = t || ''; };
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PEER_PREFIX = 'foulplayfc-v1-';
const MAX_PLAYERS = 10;

function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  if (PEER_READY) return PEER_READY;
  PEER_READY = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = () => res();
    s.onerror = () => { PEER_READY = null; s.remove(); rej(new Error('Could not load PeerJS. Check your internet connection.')); };
    document.head.appendChild(s);
  });
  return PEER_READY;
}
function openPeer(id) {
  return new Promise((res, rej) => {
    const p = id ? new Peer(id, { debug: 1 }) : new Peer({ debug: 1 });
    const fail = e => { p.off('open', ok); p.destroy(); rej(e); };
    const ok = () => { p.off('error', fail); res(p); };
    p.once('open', ok); p.once('error', fail);
  });
}
function randomCode() { return Array.from({ length: 5 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join(''); }
function myName() { const n = ($('on-name').value || '').trim().slice(0, 14) || 'Player'; store.set('fpfc-name', n); return n; }
function newNet(code, isHost, peer) {
  return { code, isHost, peer, uid: peer.id, conn: null, conns: {}, roster: {}, inputs: {}, meta: { host: isHost ? peer.id : '', status: 'lobby' },
    lastSnap: 0, pc: 1, pings: {}, pingTimer: 0, muted: new Set(), cnt: { s1: 0, s2: 0, s3: 0, ul: 0, pass: 0, lpass: 0, foul: 0, switch: 0, blind: 0, item: 0, sp: 0, sr: 0 }, pw: 0.5, sent: '', sentAt: 0, prev: {}, charge: 0, charging: false, lastPm: '' };
}
function netError(e) {
  console.error(e);
  const t = e && e.type, m = String((e && e.message) || e);
  if (t === 'peer-unavailable') onStatus('No room with that code. Check it with the host. The host must keep the game tab open.');
  else if (m === 'TIMEOUT') onStatus('Found the room but could not connect to the host. A strict firewall or mobile network may block direct connections; try another network, such as a phone hotspot.');
  else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(t)) onStatus('Could not reach the matchmaking server (0.peerjs.com). Check your internet connection and try again.');
  else if (t === 'browser-incompatible') onStatus('This browser does not support WebRTC. Use a current Chrome, Firefox, Edge or Safari.');
  else onStatus('Could not connect: ' + m);
}
function openOnline() {
  showOverlay('online');
  const n = store.get('fpfc-name'); if (n && !$('on-name').value) $('on-name').value = n;
  $('on-setup').hidden = !!NET; $('on-lobby').hidden = !NET;
  if (!NET && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) onStatus('You are on localhost, which friends cannot open. Send them the GitHub Pages link, or restart with start-mac.command / start-windows.bat and choose the Cloudflare link.');
}
function showLobby() {
  $('on-roomcode').textContent = NET.code; $('on-setup').hidden = true; $('on-lobby').hidden = false;
  $('on-start').hidden = !NET.isHost; $('on-swap').hidden = false;
  renderRoster();
}
