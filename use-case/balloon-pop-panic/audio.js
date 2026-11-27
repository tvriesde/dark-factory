"use strict";
// Synthesized Web Audio effects. Every call is a safe no-op if audio is unavailable.
var BPPAudio = (function () {
  var ctx = null, master = null, noise = null, failed = false, muted = false, paused = false;

  function unlock() {
    if (failed) return;
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { failed = true; return; }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.5;
        master.connect(ctx.destination);
        noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
        var d = noise.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (!paused && ctx.state === "suspended") ctx.resume().catch(function () {});
    } catch (e) { failed = true; ctx = null; }
  }

  function ready() { return !!(ctx && !failed && ctx.state === "running" && !muted); }

  function sweep(type, f0, f1, dur, vol, when) {
    try {
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  function burst(filterType, freq, dur, vol) {
    try {
      var t = ctx.currentTime;
      var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise;
      f.type = filterType; f.frequency.value = freq; f.Q.value = filterType === "bandpass" ? 1.2 : 0.7;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t); s.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  function play(name) {
    if (!ready()) return;
    switch (name) {
      case "shrink": sweep("sine", 700, 350, 0.12, 0.25); break;
      case "inflate": sweep("triangle", 200, 500, 0.2, 0.25); break;
      case "coin": sweep("sine", 880, 880, 0.08, 0.2); sweep("sine", 1320, 1320, 0.08, 0.2, 0.08); break;
      case "low": sweep("sine", 330, 330, 0.14, 0.12); sweep("sine", 262, 262, 0.2, 0.12, 0.14); break;
      case "pop": burst("bandpass", 1800, 0.15, 0.6); sweep("sine", 120, 50, 0.2, 0.4); break;
      case "puff": burst("lowpass", 600, 0.12, 0.12); break;
    }
  }

  function setMuted(m) {
    muted = !!m;
    try { if (master) master.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime); } catch (e) { /* ignore */ }
  }

  function suspend() {
    paused = true;
    try { if (ctx && ctx.state === "running") ctx.suspend().catch(function () {}); } catch (e) { /* ignore */ }
  }

  function resume() {
    paused = false;
    try { if (ctx && ctx.state === "suspended") ctx.resume().catch(function () {}); } catch (e) { /* ignore */ }
  }

  return { unlock: unlock, play: play, setMuted: setMuted, suspend: suspend, resume: resume };
})();
