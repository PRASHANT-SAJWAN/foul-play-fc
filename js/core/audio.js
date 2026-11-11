/* Foul Play FC · js/core/audio.js
   Web Audio: crowd noise, whistles and sound effects.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- audio ---------------- */
let AC = null, crowdGain = null, muted = false, NOISE = null;
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
    crowdGain = AC.createGain(); crowdGain.gain.value = 0;
    src.connect(bp).connect(crowdGain).connect(AC.destination); src.start(); NOISE = buf;
  } catch (e) { AC = null; }
}
function whistle(n = 1, len = 0.32) {
  if (!AC || muted) return;
  for (let k = 0; k < n; k++) {
    const t0 = AC.currentTime + k * (len + 0.1);
    const o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain();
    o.type = 'triangle'; o.frequency.value = 2600; l.frequency.value = 26; lg.gain.value = 140;
    l.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
    g.gain.setValueAtTime(0.1, t0 + len - 0.05); g.gain.linearRampToValueAtTime(0, t0 + len);
    o.connect(g).connect(AC.destination); o.start(t0); l.start(t0); o.stop(t0 + len); l.stop(t0 + len);
  }
}
function crowdSound(kind) {
  if (!AC || muted || !NOISE) return;
  const t0 = AC.currentTime;
  if (kind === 'applause') {
    for (let i = 0; i < 46; i++) {
      const st = t0 + Math.random() * 1.6, s = AC.createBufferSource(); s.buffer = NOISE;
      const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400 + Math.random() * 1600;
      const g = AC.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.09, st + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.05);
      s.connect(hp).connect(g).connect(AC.destination); s.start(st, Math.random() * 1.5, 0.06);
    }
  } else if (kind === 'roar') {
    const s = AC.createBufferSource(); s.buffer = NOISE; s.loop = true;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(380, t0); bp.frequency.linearRampToValueAtTime(950, t0 + 0.5); bp.frequency.linearRampToValueAtTime(600, t0 + 1.3);
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.5);
    s.connect(bp).connect(g).connect(AC.destination); s.start(t0); s.stop(t0 + 1.6);
  } else if (kind === 'boo') {
    const o = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain(), l = AC.createOscillator(), lg = AC.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t0); o.frequency.linearRampToValueAtTime(105, t0 + 1.2);
    l.frequency.value = 5; lg.gain.value = 6; l.connect(lg).connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
    o.connect(lp).connect(g).connect(AC.destination); o.start(t0); l.start(t0); o.stop(t0 + 1.35); l.stop(t0 + 1.35);
  }
}
function thump(f = 120, vol = 0.22, len = 0.12) {
  if (!AC || muted) return;
  const t0 = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.4, t0 + len);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + len);
}
