(function () {
  'use strict';

  var IDEAS = [
    { emoji: '🪁', label: 'Kite' },
    { emoji: '📚', label: 'Picture book' },
    { emoji: '🧱', label: 'Building blocks' },
    { emoji: '🖍️', label: 'Crayons and sketchbook' },
    { emoji: '🧩', label: 'Jigsaw puzzle' },
    { emoji: '🧸', label: 'Teddy bear' },
    { emoji: '⚽', label: 'Football' },
    { emoji: '🎲', label: 'Board game' },
    { emoji: '🚂', label: 'Toy train' },
    { emoji: '🎨', label: 'Paint set' },
    { emoji: '🔬', label: 'Junior science kit' },
    { emoji: '🎹', label: 'Toy keyboard' },
    { emoji: '🛼', label: 'Roller skates' },
    { emoji: '🪀', label: 'Yo-yo' },
    { emoji: '🔭', label: 'Star-gazing telescope' }
  ];
  var MAX_CARDS = 6;
  var LAUGH_MS = 700;
  var BUBBLE_MS = 1600;

  var santa = document.getElementById('santa');
  var bubble = document.getElementById('bubble');
  var soundBtn = document.getElementById('sound');
  var soundIcon = document.getElementById('sound-icon');
  var soundState = document.getElementById('sound-state');
  var clearBtn = document.getElementById('clear');
  var empty = document.getElementById('empty');
  var list = document.getElementById('ideas');
  var status = document.getElementById('status');

  function noop() {}

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  var deck = {
    queue: [],
    lastServed: null,
    next: function () {
      if (this.queue.length === 0) {
        this.queue = shuffle(IDEAS);
      }
      var n = this.queue.length;
      if (n > 1 && this.queue[0] === this.lastServed) {
        var k = 1 + randomInt(n - 1);
        var tmp = this.queue[0];
        this.queue[0] = this.queue[k];
        this.queue[k] = tmp;
      }
      this.lastServed = this.queue.shift();
      return this.lastServed;
    }
  };

  // Audio: created lazily, only inside a Santa press while sound is on.
  var soundOn = true;
  var ctx = null;
  var ctxFailed = false;
  var laughUntil = 0;

  function ensureContext() {
    if (ctx || ctxFailed) return ctx;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        ctxFailed = true;
        return null;
      }
      ctx = new Ctor();
    } catch (e) {
      ctxFailed = true;
      ctx = null;
    }
    return ctx;
  }

  function playLaugh() {
    if (!soundOn) return;
    if (Date.now() < laughUntil) return;
    var ac = ensureContext();
    if (!ac) return;
    try {
      if (ac.state === 'suspended' && typeof ac.resume === 'function') {
        var p = ac.resume();
        if (p && typeof p.catch === 'function') p.catch(noop);
      }
      var freqs = [196, 175, 156];
      var noteLen = 0.18;
      var gap = 0.09;
      var start = ac.currentTime + 0.02;
      freqs.forEach(function (freq, i) {
        var t = start + i * (noteLen + gap);
        var osc = ac.createOscillator();
        var filter = ac.createBiquadFilter();
        var gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + noteLen);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + noteLen + 0.02);
      });
      var totalMs = Math.ceil((freqs.length * noteLen + (freqs.length - 1) * gap + 0.04) * 1000);
      laughUntil = Date.now() + totalMs;
    } catch (e) {
      // Silent fallback.
    }
  }

  function announce(text) {
    status.textContent = '';
    var set = function () { status.textContent = text; };
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(set);
    } else {
      window.setTimeout(set, 50);
    }
  }

  var laughTimer = null;
  var bubbleTimer = null;

  function laugh() {
    santa.classList.remove('is-laughing');
    void santa.offsetWidth; // force reflow so the animation restarts
    santa.classList.add('is-laughing');
    window.clearTimeout(laughTimer);
    laughTimer = window.setTimeout(function () {
      santa.classList.remove('is-laughing');
    }, LAUGH_MS);

    bubble.hidden = false;
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(function () {
      bubble.hidden = true;
    }, BUBBLE_MS);
  }

  function syncEmpty() {
    var hasCards = list.children.length > 0;
    empty.hidden = hasCards;
    clearBtn.disabled = !hasCards;
  }

  function addCard(idea) {
    var first = list.firstElementChild;
    if (first) {
      first.classList.remove('card--new', 'card--drop');
    }
    var li = document.createElement('li');
    li.className = 'card card--new card--drop';

    var emoji = document.createElement('span');
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = idea.emoji;

    var label = document.createElement('span');
    label.className = 'label';
    label.textContent = idea.label;

    var tag = document.createElement('span');
    tag.className = 'new-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = 'NEW';

    li.appendChild(emoji);
    li.appendChild(label);
    li.appendChild(tag);
    list.insertBefore(li, list.firstChild);

    while (list.children.length > MAX_CARDS) {
      list.removeChild(list.lastElementChild);
    }
    syncEmpty();
  }

  santa.addEventListener('click', function () {
    var idea = deck.next();
    laugh();
    playLaugh();
    addCard(idea);
    announce('Santa suggests: ' + idea.label + '.');
  });

  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundState.textContent = soundOn ? 'On' : 'Off';
    soundIcon.textContent = soundOn ? '🔊' : '🔇';
  });

  clearBtn.addEventListener('click', function () {
    if (typeof list.replaceChildren === 'function') {
      list.replaceChildren();
    } else {
      while (list.firstChild) list.removeChild(list.firstChild);
    }
    syncEmpty();
    announce('Gift ideas cleared.');
    santa.focus();
  });

  syncEmpty();
})();
