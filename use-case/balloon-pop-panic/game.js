"use strict";
// Balloon Pop Panic: state machine, fixed-step simulation, input and canvas rendering.
(function () {
  // ---- Constants (logical 360 × 640 field) ----
  var W = 360, H = 640, BX = 180, BY = 448;
  var R_LARGE = 36, R_SMALL = 16, PICK_LARGE = 64, PICK_SMALL = 20, HIT = 0.9, COIN_R = 10;
  var STEP = 1 / 120;
  var ENERGY_START = 50, ENERGY_MAX = 100, DRAIN = 25, COIN_ENERGY = 15;
  var A60 = 120 * 60 + (7 / 6) * 3600; // altitude at t = 60 s (11 400)
  var INK = "#3d2b4f", INK_SOFT = "#5b4a6e";
  var BALLOON = "#ff8fa3", BALLOON_DARK = "#e8657f", BLUSH = "#ff6f8a";
  var COIN = "#ffc83d", COIN_RIM = "#c98a00";
  var PASTELS = ["#f7a8c4", "#9ed8db", "#b8b3e9"];
  var SKIES = ["#fde2e4", "#ffe8cc", "#dff5e8", "#dcebfa", "#e8e0f7"].map(hexToRgb);

  // ---- DOM ----
  function $(id) { return document.getElementById(id); }
  var game = $("game"), canvas = $("view"), ctx = canvas.getContext("2d");
  var hudScore = $("hudScore"), energyPill = $("energyPill"), energyFill = $("energyFill"), live = $("live");
  var overlays = { start: $("startOverlay"), paused: $("pauseOverlay"), gameover: $("overOverlay") };
  var startBtn = $("startBtn"), resumeBtn = $("resumeBtn"), pauseRestartBtn = $("pauseRestartBtn"), restartBtn = $("restartBtn");
  var soundBtns = Array.prototype.slice.call(document.querySelectorAll(".sound-toggle"));

  // ---- Optional deterministic seed (?seed=N) ----
  var seedParam = null;
  try {
    var q = new URLSearchParams(window.location.search).get("seed");
    if (q !== null && /^\d{1,10}$/.test(q)) seedParam = Number(q) >>> 0;
  } catch (e) { /* ignore */ }
  var rngState = 1;
  function rand() { // mulberry32
    rngState = (rngState + 0x6D2B79F5) >>> 0;
    var t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(a, b) { return a + (b - a) * rand(); }

  // ---- Reduced motion ----
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduced = !!(mq && mq.matches);
  if (mq) {
    var onMq = function () { reduced = mq.matches; };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  // ---- Game state ----
  var state = "start", pausedFrom = "playing";
  var clock = 0;             // animation clock: advances in playing / trapped / popping
  var t = 0, altitude = 0, energy = ENERGY_START;
  var rows = [], coins = [], nextRowY = 0, lastRowTop = 0, lastCoinT = 0;
  var size = null;
  var pointerIds = new Set(), keyHeld = false, spaceNeedsRelease = false;
  var lowArmed = true, lastEmpty = -10;
  var trapT = 0, popT = 0;
  var sky = null, shards = [], sparkles = [];
  var shownScore = -1, shownEnergy = -1, shownLow = null;
  var clouds = [];
  for (var ci = 0; ci < 7; ci++) clouds.push({ x: Math.random() * 400 - 20, y: Math.random() * 900, s: 0.6 + Math.random() * 0.7 });

  // ---- Helpers ----
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function score() { return Math.floor(altitude / 10); }
  function speed(time) { return 120 + 140 * Math.min(time, 60) / 60; }
  function altitudeAt(time) { time = Math.max(0, time); return time <= 60 ? 120 * time + (7 / 6) * time * time : A60 + 260 * (time - 60); }
  function timeAt(a) {
    if (a <= 0) return 0;
    if (a <= A60) return (-120 + Math.sqrt(14400 + (14 / 3) * a)) / (7 / 3);
    return 60 + (a - A60) / 260;
  }
  function holding() { return pointerIds.size > 0 || keyHeld; }
  function bestText() { var b = BPPStorage.getBest(); return b === null ? "Best —" : "Best " + fmt(b) + " m"; }

  function announce(msg) {
    live.textContent = "";
    requestAnimationFrame(function () { live.textContent = msg; });
  }

  // ---- Size tween (visual radius; hitbox derives from clamped base radius) ----
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function elastic(p) { return p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(p * Math.PI * 3); }
  function tweenP() { return size.dur > 0 ? clamp((clock - size.start) / size.dur, 0, 1) : 1; }
  function visualRadius() {
    var p = tweenP(), e = size.ease === "elastic" ? elastic(p) : easeOut(p);
    return size.from + (size.to - size.from) * e;
  }
  function baseRadius() { return clamp(visualRadius(), R_SMALL, R_LARGE); }
  function hitRadius() { return baseRadius() * HIT; }
  function pickupRadius() { return PICK_SMALL + (PICK_LARGE - PICK_SMALL) * (baseRadius() - R_SMALL) / (R_LARGE - R_SMALL); }
  function setTarget(small, silent) {
    if (small === (size.target === "small")) return;
    size.from = baseRadius();
    size.to = small ? R_SMALL : R_LARGE;
    size.start = clock;
    size.target = small ? "small" : "large";
    if (small) { size.dur = 0.15; size.ease = "out"; }
    else { size.dur = reduced ? 0.2 : 0.28; size.ease = reduced ? "out" : "elastic"; }
    if (!silent) BPPAudio.play(small ? "shrink" : "inflate");
  }

  // ---- World generation ----
  function reset() {
    rngState = seedParam !== null ? seedParam : (Math.random() * 4294967296) >>> 0;
    t = 0; altitude = 0; energy = ENERGY_START;
    rows = []; coins = []; shards = []; sparkles = [];
    nextRowY = 380; lastRowTop = 90; lastCoinT = 0;
    size = { from: R_LARGE, to: R_LARGE, start: clock - 10, dur: 0, ease: "out", target: "large" };
    sky = { from: SKIES[0], to: 0, start: clock - 100 };
    lowArmed = true; lastEmpty = -10; trapT = 0; popT = 0;
    clearInput();
    shownScore = -1; shownEnergy = -1; shownLow = null;
    ensureRows();
  }

  function ensureRows() {
    while (nextRowY < altitude + BY + 640) makeRow();
    var bottom = altitude - (H - BY) - 100;
    rows = rows.filter(function (r) { return r.y + r.h >= bottom; });
    coins = coins.filter(function (c) { return !c.taken && c.y >= bottom; });
  }

  function makeRow() {
    var y = nextRowY, k = Math.min(timeAt(y), 60) / 60;
    var narrow = rand() < 0.2 + 0.4 * k;
    var row = {
      y: y,
      h: range(24, 40),
      gap: narrow ? range(44, 60) : range(96, 140),
      kind: ["block", "pill", "triangle"][Math.floor(rand() * 3)],
      color: PASTELS[Math.floor(rand() * PASTELS.length)]
    };
    rows.push(row);
    var next = y + Math.max(280 - 110 * k, row.h + 90);
    placeCoin(lastRowTop + 20 + COIN_R, y - 20 - COIN_R, next - 20 - COIN_R);
    lastRowTop = y + row.h;
    nextRowY = next;
  }

  // Coin between rows; forced (centred) when the following slot would break the coin-interval guarantee.
  function placeCoin(lo, hi, nextSlotHi) {
    if (hi < lo) return;
    var limit = lastCoinT < 20 ? 2.5 : 3.5;
    var force = timeAt(nextSlotHi) - lastCoinT > limit;
    var cy, cx = BX;
    if (force) {
      cy = clamp(Math.min(hi, altitudeAt(lastCoinT + limit)), lo, hi);
      cy = clamp(cy - rand() * Math.min(20, cy - lo), lo, hi);
    } else if (rand() < 0.4) {
      cy = range(lo, hi);
      if (rand() < 0.5) cx = clamp(BX + (rand() < 0.5 ? -1 : 1) * range(40, 70), 10, 350);
    } else return;
    coins.push({ x: cx, y: cy, taken: false });
    lastCoinT = timeAt(cy);
  }

  // ---- Collision (screen-space logical units, balloon at BX, BY) ----
  function circleRect(r, x0, y0, x1, y1) {
    var dx = BX - clamp(BX, x0, x1), dy = BY - clamp(BY, y0, y1);
    return dx * dx + dy * dy <= r * r;
  }
  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    var c = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
    var dx = px - (ax + vx * c), dy = py - (ay + vy * c);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function circleTri(r, p) {
    var inside = true, s0 = null;
    for (var i = 0; i < 3; i++) {
      var a = p[i], b = p[(i + 1) % 3];
      if (segDist(BX, BY, a[0], a[1], b[0], b[1]) <= r) return true;
      var cross = (b[0] - a[0]) * (BY - a[1]) - (b[1] - a[1]) * (BX - a[0]);
      var s = cross >= 0;
      if (s0 === null) s0 = s; else if (s !== s0) inside = false;
    }
    return inside;
  }
  function rowTop(r) { return BY - (r.y + r.h - altitude); }
  function triangles(r, top) {
    var bot = top + r.h, gl = BX - r.gap / 2, gr = BX + r.gap / 2;
    return [[[0, top], [gl, top], [gl, bot]], [[W, top], [gr, top], [gr, bot]]];
  }
  function rowHits(r, rad) {
    var top = rowTop(r), bot = top + r.h, gl = BX - r.gap / 2, gr = BX + r.gap / 2;
    if (bot < BY - rad || top > BY + rad) return false;
    if (r.kind === "block") return circleRect(rad, -2000, top, gl, bot) || circleRect(rad, gr, top, 2000, bot);
    if (r.kind === "pill") {
      var cy = top + r.h / 2, hr = r.h / 2;
      return segDist(BX, BY, -2000, cy, gl - hr, cy) <= rad + hr || segDist(BX, BY, gr + hr, cy, 2000, cy) <= rad + hr;
    }
    var tris = triangles(r, top);
    return circleTri(rad, tris[0]) || circleTri(rad, tris[1]);
  }
  function overlaps() {
    var rad = hitRadius();
    for (var i = 0; i < rows.length; i++) if (rowHits(rows[i], rad)) return true;
    return false;
  }

  // ---- Simulation ----
  function step(dt) {
    clock += dt;
    if (state === "playing") {
      t += dt;
      altitude += speed(t) * dt;
      var hold = holding();
      if (hold && energy <= 0 && clock - lastEmpty >= 0.6) { lastEmpty = clock; BPPAudio.play("puff"); flashPill(); }
      setTarget(hold && energy > 0);
      if (size.target === "small") {
        energy = Math.max(0, energy - DRAIN * dt);
        if (energy <= 0) setTarget(false);
      }
      ensureRows();
      collectCoins();
      if (energy <= 20 && lowArmed) { lowArmed = false; BPPAudio.play("low"); announce("Low energy."); }
      else if (energy > 30) lowArmed = true;
      var stage = Math.floor(score() / 500) % 5;
      if (stage !== sky.to) { sky.from = skyRgb(); sky.to = stage; sky.start = clock; }
      if (overlaps()) enter("trapped");
    } else if (state === "trapped") {
      trapT += dt;
      if (trapT >= 0.5) enter("popping");
    } else if (state === "popping") {
      popT += dt;
      for (var i = 0; i < shards.length; i++) {
        var s = shards[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 420 * dt; s.rot += s.vr * dt;
      }
      if (popT >= 0.65) enter("gameover");
    }
    sparkles = sparkles.filter(function (sp) {
      var done = clock - sp.start >= sp.dur;
      if (done && sp.flash) flashPill();
      return !done;
    });
  }

  function collectCoins() {
    var reach = pickupRadius() + COIN_R;
    for (var i = 0; i < coins.length; i++) {
      var c = coins[i];
      if (c.taken) continue;
      var dx = c.x - BX, dy = c.y - altitude;
      if (dx * dx + dy * dy <= reach * reach) {
        c.taken = true;
        energy = Math.min(ENERGY_MAX, energy + COIN_ENERGY);
        BPPAudio.play("coin");
        var sy = BY - (c.y - altitude);
        if (reduced) { sparkles.push({ x: c.x, y: sy, start: clock, dur: 0.12, fade: true, flash: false }); flashPill(); }
        else sparkles.push({ x: c.x, y: sy, start: clock, dur: 0.45, fade: false, flash: true });
      }
    }
  }

  function flashPill() {
    energyPill.classList.remove("flash");
    void energyPill.offsetWidth;
    energyPill.classList.add("flash");
  }
  energyPill.addEventListener("animationend", function () { energyPill.classList.remove("flash"); });

  function skyRgb() {
    var p = clamp((clock - sky.start) / (reduced ? 6 : 2.5), 0, 1), to = SKIES[sky.to];
    return [0, 1, 2].map(function (i) { return Math.round(sky.from[i] + (to[i] - sky.from[i]) * p); });
  }

  // ---- State machine ----
  function clearInput() {
    if (keyHeld) spaceNeedsRelease = true;
    pointerIds.clear();
    keyHeld = false;
  }

  function enter(next) {
    var prev = state;
    state = next;
    var overlayOpen = next === "start" || next === "paused" || next === "gameover";
    overlays.start.hidden = next !== "start";
    overlays.paused.hidden = next !== "paused";
    overlays.gameover.hidden = next !== "gameover";
    if (overlayOpen) {
      var focusEl = next === "start" ? startBtn : next === "paused" ? resumeBtn : restartBtn;
      focusEl.focus({ preventScroll: true });
      game.setAttribute("aria-hidden", "true");
      game.tabIndex = -1;
    } else {
      game.removeAttribute("aria-hidden");
      game.tabIndex = 0;
      if (document.activeElement !== game) game.focus({ preventScroll: true });
    }
    if (next === "trapped" && prev === "playing") { trapT = 0; clearInput(); }
    if (next === "popping") startPop();
    if (next === "gameover") finishRun();
  }

  function startGame() {
    BPPAudio.unlock();
    reset();
    enter("playing");
    BPPAudio.resume();
    announce("Climbing. Hold to shrink.");
  }

  function pauseGame() {
    if (state !== "playing" && state !== "trapped") return;
    pausedFrom = state;
    clearInput();
    if (state === "playing") setTarget(false, true);
    $("pauseScore").textContent = fmt(score()) + " m";
    enter("paused");
    BPPAudio.suspend();
    announce("Paused at " + fmt(score()) + " metres.");
  }

  function resumeGame() {
    if (state !== "paused") return;
    BPPAudio.resume();
    enter(pausedFrom);
    announce("Resumed.");
  }

  function startPop() {
    popT = 0;
    BPPAudio.play("pop");
    shards = [];
    if (reduced) return;
    var r = baseRadius();
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, v = 150 + Math.random() * 160;
      shards.push({ x: BX + Math.cos(a) * r * 0.6, y: BY + Math.sin(a) * r * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 5 + Math.random() * 6, c: i % 3 ? BALLOON : BALLOON_DARK });
    }
  }

  function finishRun() {
    var sc = score(), prevBest = BPPStorage.getBest();
    var isNew = sc > (prevBest || 0);
    if (isNew) BPPStorage.setBest(sc);
    $("overScore").textContent = fmt(sc) + " m";
    $("newBest").hidden = !isNew;
    $("overBest").textContent = bestText();
    $("startBest").textContent = bestText();
    var best = BPPStorage.getBest();
    announce("Pop! " + fmt(sc) + " metres. " + (isNew ? "New best!" : best !== null ? "Best " + fmt(best) + " metres." : ""));
  }

  function toggleMute() {
    var m = !BPPStorage.getMuted();
    BPPStorage.setMuted(m);
    BPPAudio.setMuted(m);
    updateSoundLabels();
    announce(m ? "Sound off." : "Sound on.");
  }
  function updateSoundLabels() {
    var text = "Sound: " + (BPPStorage.getMuted() ? "Off" : "On");
    soundBtns.forEach(function (b) { b.querySelector(".sound-label").textContent = text; });
  }

  // ---- Input ----
  game.addEventListener("pointerdown", function (e) {
    if (state !== "playing") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try { game.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    pointerIds.add(e.pointerId);
    if (document.activeElement !== game) game.focus({ preventScroll: true });
  });
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach(function (type) {
    game.addEventListener(type, function (e) { pointerIds.delete(e.pointerId); });
  });
  document.addEventListener("pointerdown", function () { BPPAudio.unlock(); }, true);
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  document.addEventListener("keydown", function (e) {
    BPPAudio.unlock();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, isSpace = k === " " || e.code === "Space";
    if (k === "m" || k === "M") { if (!e.repeat) toggleMute(); return; }
    if (k === "p" || k === "P" || k === "Escape") {
      if (e.repeat) return;
      if (state === "playing" || state === "trapped") { e.preventDefault(); pauseGame(); }
      else if (state === "paused") { e.preventDefault(); resumeGame(); }
      return;
    }
    if (k && k.indexOf("Arrow") === 0) { e.preventDefault(); return; }
    if (!isSpace && k !== "Enter") return;
    if (state === "playing" || state === "trapped" || state === "popping") {
      if (isSpace) {
        e.preventDefault();
        if (!e.repeat && !spaceNeedsRelease && state === "playing") keyHeld = true;
      }
      return;
    }
    if (isSpace || e.repeat) e.preventDefault();
    if (e.repeat) return;
    var btn = e.target && e.target.closest ? e.target.closest("button") : null;
    if (state === "start" || state === "gameover") {
      if (btn && btn.classList.contains("sound-toggle")) { if (isSpace) btn.click(); return; }
      e.preventDefault();
      if (isSpace) spaceNeedsRelease = true;
      startGame();
      return;
    }
    if (state === "paused" && btn && isSpace) btn.click();
  }, true);

  document.addEventListener("keyup", function (e) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      keyHeld = false;
      spaceNeedsRelease = false;
    }
  }, true);

  function autoPause() { if (state === "playing" || state === "trapped") pauseGame(); }
  document.addEventListener("visibilitychange", function () { if (document.hidden) autoPause(); });
  window.addEventListener("blur", autoPause);

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  pauseRestartBtn.addEventListener("click", startGame);
  resumeBtn.addEventListener("click", resumeGame);
  soundBtns.forEach(function (b) { b.addEventListener("click", function () { BPPAudio.unlock(); toggleMute(); }); });

  // ---- Rendering ----
  var dpr = 1, cssW = 0, cssH = 0, viewScale = 1, viewOx = 0, viewOy = 0;
  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    cssW = Math.max(1, rect.width); cssH = Math.max(1, rect.height);
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    viewScale = Math.min(cssW / W, cssH / H);
    viewOx = (cssW - W * viewScale) / 2;
    viewOy = (cssH - H * viewScale) / 2;
  }
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

  function expression() {
    if (state === "popping" || state === "gameover") return "popped";
    if (state === "trapped" || (state === "paused" && pausedFrom === "trapped")) return "trapped";
    if (state === "playing" && holding() && energy <= 0) return "strained";
    if (size.target === "small") return "squeezed";
    if (size.target === "large" && clock - size.start < size.dur) return "bounce";
    if (energy <= 20 && state !== "start") return "nervous";
    return "happy";
  }

  function render() {
    var c = skyRgb();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var s = viewScale * dpr;
    ctx.setTransform(s, 0, 0, s, viewOx * dpr, viewOy * dpr);
    var left = -viewOx / viewScale - 4, right = W + viewOx / viewScale + 4;
    var vTop = -viewOy / viewScale, vBot = H + viewOy / viewScale;

    drawClouds(left, right, vTop, vBot, c);
    ctx.save();
    if (!reduced && (state === "trapped" || (state === "popping" && popT < 0.25))) {
      ctx.translate((Math.random() * 2 - 1) * 6, (Math.random() * 2 - 1) * 6);
    }
    drawRows(left, right, vTop, vBot);
    drawCoins(vTop, vBot);
    if (state !== "popping" && state !== "gameover") drawRing();
    drawBalloon();
    drawShards();
    ctx.restore();
    drawSparkles();
    updateHud();
  }

  function drawClouds(left, right, vTop, vBot, sky) {
    var night = sky[0] + sky[1] + sky[2] < 330;
    ctx.fillStyle = night ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.75)";
    var span = vBot - vTop + 160;
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var y = vTop - 80 + ((((cl.y + (reduced ? 0 : altitude * 0.25)) % span) + span) % span);
      var x = left + (cl.x / 400) * (right - left);
      ctx.beginPath();
      ctx.ellipse(x, y, 34 * cl.s, 13 * cl.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 16 * cl.s, y + 3 * cl.s, 18 * cl.s, 10 * cl.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 12 * cl.s, y - 8 * cl.s, 18 * cl.s, 13 * cl.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRows(left, right, vTop, vBot) {
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK_SOFT;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], top = rowTop(r), bot = top + r.h;
      if (bot < vTop - 10 || top > vBot + 10) continue;
      var gl = BX - r.gap / 2, gr = BX + r.gap / 2;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      if (r.kind === "block") {
        ctx.rect(left, top, gl - left, r.h);
        ctx.rect(gr, top, right - gr, r.h);
      } else if (r.kind === "pill") {
        var hr = r.h / 2, cy = top + hr;
        ctx.moveTo(left, top); ctx.lineTo(gl - hr, top); ctx.arc(gl - hr, cy, hr, -Math.PI / 2, Math.PI / 2); ctx.lineTo(left, bot); ctx.closePath();
        ctx.moveTo(right, top); ctx.lineTo(gr + hr, top); ctx.arc(gr + hr, cy, hr, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(right, bot); ctx.closePath();
      } else {
        var tris = triangles(r, top);
        tris.forEach(function (p) { ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.closePath(); });
        // Thin rails continue the wedge line into the letterbox.
        if (left < -8) { ctx.rect(left, top, -left, 4); ctx.rect(W, top, right - W, 4); }
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawCoin(x, y, alpha, squeeze) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(squeeze, 1);
    ctx.beginPath(); ctx.arc(0, 0, COIN_R, 0, Math.PI * 2);
    ctx.fillStyle = COIN; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = COIN_RIM; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, COIN_R - 4.5, 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.stroke();
    star(-3, -3, 3.2, "#fff");
    ctx.restore();
  }
  function star(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }
  function drawCoins(vTop, vBot) {
    for (var i = 0; i < coins.length; i++) {
      var c = coins[i];
      if (c.taken) continue;
      var y = BY - (c.y - altitude);
      if (y < vTop - 20 || y > vBot + 20) continue;
      var sq = reduced ? 1 : 0.55 + 0.45 * Math.abs(Math.cos(clock * 2.5 + c.y * 0.01));
      drawCoin(c.x, y, 1, sq);
    }
  }

  function drawRing() {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(43,36,64,0.3)";
    ctx.beginPath(); ctx.arc(BX, BY, pickupRadius(), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawBalloon() {
    var r = visualRadius(), alpha = 1;
    if (state === "popping" || state === "gameover") {
      if (!reduced) {
        if (state === "popping" && popT < 0.25) { // burst ring
          ctx.save();
          ctx.globalAlpha = 1 - popT / 0.25;
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(BX, BY, r + popT * 220, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        return;
      }
      alpha = state === "popping" ? clamp(1 - popT / 0.25, 0, 1) : 0;
      if (alpha <= 0) return;
    }
    var sx = 1, sy = 1, rot = 0, jx = 0, expr = expression();
    if (!reduced) {
      var p = tweenP();
      if (p < 1) { var k = Math.sin(p * Math.PI) * 0.12; if (size.target === "small") { sx = 1 + k; sy = 1 - k; } else { sx = 1 - k; sy = 1 + k; } }
      if (expr === "trapped" && state === "trapped") rot = Math.sin(clock * 40) * 0.12;
      if (expr === "nervous" && state === "playing") jx = Math.sin(clock * 70) * 0.9;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(BX + jx, BY);
    ctx.rotate(rot);
    // String
    ctx.strokeStyle = INK_SOFT; ctx.lineWidth = 1.8;
    var sway = reduced ? 0 : Math.sin(clock * 3) * 4;
    ctx.beginPath(); ctx.moveTo(0, r * 1.1 + 4);
    ctx.quadraticCurveTo(8 + sway, r * 1.1 + 24, 0, r * 1.1 + 40);
    ctx.quadraticCurveTo(-8 - sway, r * 1.1 + 56, 0, r * 1.1 + 70);
    ctx.stroke();
    ctx.scale(sx, sy);
    // Knot
    ctx.fillStyle = BALLOON_DARK;
    ctx.beginPath(); ctx.moveTo(0, r * 1.04); ctx.lineTo(5, r * 1.1 + 6); ctx.lineTo(-5, r * 1.1 + 6); ctx.closePath(); ctx.fill();
    // Body
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.25);
    g.addColorStop(0, "#ffc2d1"); g.addColorStop(0.45, BALLOON); g.addColorStop(1, BALLOON_DARK);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.ellipse(-r * 0.42, -r * 0.48, r * 0.15, r * 0.26, -0.5, 0, Math.PI * 2); ctx.fill();
    // Blush
    ctx.fillStyle = BLUSH;
    ctx.beginPath(); ctx.ellipse(-r * 0.52, r * 0.2, r * 0.15, r * 0.1, 0, 0, Math.PI * 2); ctx.ellipse(r * 0.52, r * 0.2, r * 0.15, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    drawFace(expr, r / R_LARGE);
    ctx.restore();
  }

  function line(pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); }
  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function drawFace(expr, f) {
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.6 * f; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var ex = 11 * f, ey = -6 * f;
    switch (expr) {
      case "popped":
        line([-ex - 4 * f, ey - 4 * f, -ex + 4 * f, ey + 4 * f]); line([-ex + 4 * f, ey - 4 * f, -ex - 4 * f, ey + 4 * f]);
        line([ex - 4 * f, ey - 4 * f, ex + 4 * f, ey + 4 * f]); line([ex + 4 * f, ey - 4 * f, ex - 4 * f, ey + 4 * f]);
        line([-6 * f, 10 * f, 6 * f, 10 * f]);
        break;
      case "trapped":
        [-ex, ex].forEach(function (x) {
          ctx.fillStyle = "#fff"; dot(x, ey, 5 * f); ctx.stroke(); ctx.fillStyle = INK; dot(x, ey + 1 * f, 2 * f);
        });
        ctx.beginPath(); ctx.ellipse(0, 10 * f, 4 * f, 5 * f, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      case "strained":
        line([-ex - 4 * f, ey - 5 * f, -ex + 3 * f, ey - 1 * f, -ex - 4 * f, ey + 3 * f]); line([-ex - 4 * f, ey + 6 * f, -ex + 3 * f, ey + 6 * f]);
        line([ex + 4 * f, ey - 5 * f, ex - 3 * f, ey - 1 * f, ex + 4 * f, ey + 3 * f]); line([ex + 4 * f, ey + 6 * f, ex - 3 * f, ey + 6 * f]);
        ctx.strokeRect(-7 * f, 7 * f, 14 * f, 6 * f); line([-7 * f, 10 * f, 7 * f, 10 * f]);
        break;
      case "squeezed":
        line([-ex - 4 * f, ey - 4 * f, -ex + 3 * f, ey, -ex - 4 * f, ey + 4 * f]);
        line([ex + 4 * f, ey - 4 * f, ex - 3 * f, ey, ex + 4 * f, ey + 4 * f]);
        line([-4 * f, 9 * f, 4 * f, 9 * f]);
        break;
      case "bounce":
        line([-ex - 4 * f, ey + 2 * f, -ex, ey - 3 * f, -ex + 4 * f, ey + 2 * f]);
        line([ex - 4 * f, ey + 2 * f, ex, ey - 3 * f, ex + 4 * f, ey + 2 * f]);
        ctx.beginPath(); ctx.arc(0, 5 * f, 7 * f, 0, Math.PI); ctx.closePath(); ctx.fill();
        break;
      case "nervous":
        [-ex, ex].forEach(function (x) { ctx.beginPath(); ctx.arc(x, ey, 4.5 * f, 0, Math.PI * 2); ctx.stroke(); dot(x, ey, 1.6 * f); });
        line([-7 * f, 10 * f, -3.5 * f, 8 * f, 0, 10 * f, 3.5 * f, 8 * f, 7 * f, 10 * f]);
        ctx.fillStyle = "#8fd3ff";
        ctx.beginPath(); ctx.moveTo(25 * f, -22 * f); ctx.quadraticCurveTo(31 * f, -12 * f, 25 * f, -10 * f); ctx.quadraticCurveTo(19 * f, -12 * f, 25 * f, -22 * f); ctx.fill();
        break;
      default:
        dot(-ex, ey, 3 * f); dot(ex, ey, 3 * f);
        ctx.beginPath(); ctx.arc(0, 4 * f, 7 * f, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  }

  function drawShards() {
    if (state !== "popping" || reduced) return;
    var a = clamp(1 - (popT - 0.25) / 0.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    for (var i = 0; i < shards.length; i++) {
      var s = shards[i];
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.moveTo(-s.s, -s.s * 0.6); ctx.lineTo(s.s, -s.s * 0.2); ctx.lineTo(-s.s * 0.2, s.s * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function pillTarget() {
    var pr = energyPill.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    return [((pr.left + pr.width * 0.25) - cr.left - viewOx) / viewScale, ((pr.top + pr.height / 2) - cr.top - viewOy) / viewScale];
  }
  function drawSparkles() {
    if (!sparkles.length) return;
    var target = pillTarget();
    for (var i = 0; i < sparkles.length; i++) {
      var sp = sparkles[i], p = clamp((clock - sp.start) / sp.dur, 0, 1);
      if (sp.fade) { drawCoin(sp.x, sp.y, 1 - p, 1); continue; }
      var e = easeOut(p);
      var x = sp.x + (target[0] - sp.x) * e, y = sp.y + (target[1] - sp.y) * e - Math.sin(p * Math.PI) * 30;
      ctx.save(); ctx.globalAlpha = 1 - p * 0.4;
      star(x, y, 9 * (1 - p * 0.5), COIN);
      star(x, y, 4 * (1 - p * 0.5), "#fff");
      ctx.restore();
    }
  }

  function updateHud() {
    var sc = score();
    if (sc !== shownScore) { shownScore = sc; hudScore.textContent = fmt(sc) + " m"; }
    var e = Math.round(energy * 2) / 2;
    if (e !== shownEnergy) { shownEnergy = e; energyFill.style.transform = "scaleX(" + (e / ENERGY_MAX) + ")"; }
    var low = energy <= 20;
    if (low !== shownLow) { shownLow = low; energyPill.classList.toggle("low", low); }
  }

  // ---- Loop ----
  var last = null, acc = 0;
  function running() { return state === "playing" || state === "trapped" || state === "popping"; }
  function frame(ts) {
    if (last === null) last = ts;
    var dt = Math.min(0.1, Math.max(0, (ts - last) / 1000));
    last = ts;
    if (running()) {
      acc += dt;
      while (acc >= STEP) {
        step(STEP);
        acc -= STEP;
        if (!running()) { acc = 0; break; }
      }
    } else acc = 0;
    render();
    requestAnimationFrame(frame);
  }

  // ---- Boot ----
  BPPAudio.setMuted(BPPStorage.getMuted());
  updateSoundLabels();
  $("startBest").textContent = bestText();
  reset();
  resize();
  enter("start");
  requestAnimationFrame(frame);
})();
