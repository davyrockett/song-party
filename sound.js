/* Sound effects, made live in the browser with simple synths (no recordings, no voices).
   Short and mostly un-pitched, so they don't clash with whatever key David is playing in.
   Off in Settings, and silent on a remote (with the TV link, only the TV plays them).
   Browsers only allow sound after a click or key press on the page, so the first press switches it on. */

var Sfx = (function () {
  var ctx = null, out = null, noise = null;

  function allowed() {
    if (lsGet(K.sound) === 'off') return false;
    if (typeof link !== 'undefined' && link.role === 'remote') return false;
    return true;
  }
  function setup() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(comp);
    comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noise.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function unlock() {
    if (!setup()) return;
    if (ctx.state !== 'running') ctx.resume();
  }
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  // A tone that slides from one pitch to another.
  function sweep(type, f1, f2, t, dur, peak) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, peak, 0.008, dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.1);
  }
  function hiss(t, freq, type, q, peak, decay) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, peak, 0.004, decay);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + decay + 0.05);
  }
  // A soft bell-like note (for the cheer and the twinkle).
  function bell(m, t, level) {
    var f = 440 * Math.pow(2, (m - 69) / 12);
    [[1, 0.06, 0.6], [2, 0.022, 0.3], [3, 0.008, 0.15]].forEach(function (h) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * h[0];
      env(g, t, h[1] * level, 0.004, h[2]);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + h[2] + 0.1);
    });
  }

  function play(kind) {
    if (!allowed() || !setup()) return;
    if (ctx.state !== 'running') ctx.resume();
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setValueAtTime(0.9, ctx.currentTime);
    var t = ctx.currentTime + 0.02, i;
    switch (kind) {
      case 'pop':      // a bubbly pop for magic words
        sweep('sine', 320, 980, t, 0.12, 0.3);
        hiss(t, 2600, 'bandpass', 3, 0.08, 0.05);
        break;
      case 'drop':     // something falls through the water and lands: a slide down, then a plop
        sweep('sine', 1300, 260, t, 0.42, 0.12);
        sweep('sine', 180, 520, t + 0.44, 0.1, 0.32);
        hiss(t + 0.44, 1400, 'bandpass', 1.5, 0.12, 0.25);
        for (i = 0; i < 4; i++) sweep('sine', 500 + i * 160, 1100 + i * 200, t + 0.55 + i * 0.07, 0.05, 0.06);
        break;
      case 'tick':     // one step of the Surprise! spin
        hiss(t, 3200, 'bandpass', 6, 0.18, 0.03);
        sweep('triangle', 900, 700, t, 0.04, 0.05);
        break;
      case 'land':     // the spin lands
        sweep('sine', 300, 1200, t, 0.25, 0.25);
        bell(84, t + 0.2, 1.5);
        break;
      case 'wiggle':   // tapping a thing in the hole
        sweep('sine', 420, 640, t, 0.09, 0.18);
        sweep('sine', 640, 420, t + 0.1, 0.09, 0.16);
        break;
      case 'twinkle':
        [86, 91, 88, 93].forEach(function (m, j) { bell(m, t + j * 0.09, 0.8); });
        break;
      case 'cheer':
        [67, 71, 74, 79, 83].forEach(function (m, j) { bell(m, t + j * 0.08, 1.4); });
        for (i = 0; i < 8; i++) hiss(t + i * 0.07, 7000, 'highpass', 0.7, 0.07, 0.07);
        break;
      default:
        sweep('sine', 320, 980, t, 0.12, 0.3);
    }
  }
  return { play: play, unlock: unlock };
})();
['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, Sfx.unlock, true); });
