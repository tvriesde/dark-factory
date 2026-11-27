"use strict";
// Persists only the best score and the mute preference. In-memory values are the source of truth.
var BPPStorage = (function () {
  var BEST_KEY = "balloonPopPanic.best";
  var MUTED_KEY = "balloonPopPanic.muted";
  var best = null;
  var muted = false;
  try {
    var raw = localStorage.getItem(BEST_KEY);
    if (raw !== null && /^\d+$/.test(raw)) {
      var n = Number(raw);
      if (Number.isSafeInteger(n) && n >= 0) best = n;
    }
    muted = localStorage.getItem(MUTED_KEY) === "1";
  } catch (e) { /* storage unavailable: session-only */ }

  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  return {
    getBest: function () { return best; },
    setBest: function (n) {
      if (!Number.isSafeInteger(n) || n < 0) return;
      best = n;
      write(BEST_KEY, String(n));
    },
    getMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      write(MUTED_KEY, muted ? "1" : "0");
    }
  };
})();
