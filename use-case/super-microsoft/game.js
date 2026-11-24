'use strict';

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const action = document.getElementById('action-button');
  const pauseButton = document.getElementById('pause-button');
  const live = document.getElementById('announcements');
  const levelValue = document.getElementById('level-value');
  const heartsValue = document.getElementById('hearts-value');
  const powerValue = document.getElementById('power-value');
  const stageName = document.getElementById('stage-name');
  const tip = document.getElementById('tip');
  const W = 960, H = 500, ground = 400, worldWidth = 2500;
  const step = 1 / 60;
  const stages = [
    { name: 'CLOVER MEADOW', sky: '#c5e1d3', hill: '#9dc7ae', far: '#b3d5c1', gaps: [[650, 735], [1390, 1490]], enemies: [1110, 1810] },
    { name: 'SUNNY RIDGE', sky: '#f4dfb2', hill: '#c7c795', far: '#e3d3a6', gaps: [[530, 625], [1080, 1175], [1730, 1825]], enemies: [850, 1510, 2090] },
    { name: 'BLUEBELL HILLS', sky: '#c7e1e4', hill: '#99bdba', far: '#b1d1cf', gaps: [[720, 820], [1270, 1370], [1900, 2000]], enemies: [1060, 1640, 2200] },
    { name: 'GOLDEN GROVE', sky: '#ead7bb', hill: '#b9c499', far: '#d4d0ad', gaps: [[500, 600], [1050, 1150], [1600, 1700], [2040, 2140]], enemies: [820, 1400, 1870] },
    { name: 'THE BIG SHOWDOWN', sky: '#d6d8d0', hill: '#a7bba4', far: '#c0ccc0', gaps: [[690, 790], [1280, 1380]], enemies: [] }
  ];
  let state = 'start', level = 0, hearts = 3, player, enemies, boss, shots = [], camera = 0;
  let cooldown = 0, invulnerable = 0, elapsed = 0, lastTime = 0, accumulator = 0;
  const held = { left: false, right: false };
  const heldSources = { left: new Set(), right: new Set() };
  const buttonPresses = new Map();
  const directionButtonKeys = new Map();

  function announce(message) { live.textContent = message; }
  function setDirection(control, source, pressed) {
    if (pressed) heldSources[control].add(source);
    else heldSources[control].delete(source);
    held[control] = heldSources[control].size > 0;
  }
  function setButtonPress(button, source, pressed) {
    const presses = buttonPresses.get(button);
    if (pressed) presses.add(source);
    else presses.delete(source);
    button.classList.toggle('active', presses.size > 0);
  }
  function releaseButtonKey(key) {
    const press = directionButtonKeys.get(key);
    if (!press) return;
    setDirection(press.control, press.source, false);
    setButtonPress(press.button, press.source, false);
    directionButtonKeys.delete(key);
  }
  function clearInputs() {
    heldSources.left.clear();
    heldSources.right.clear();
    held.left = held.right = false;
    directionButtonKeys.clear();
    buttonPresses.forEach(presses => presses.clear());
    document.querySelectorAll('[data-control]').forEach(button => button.classList.remove('active'));
  }
  function makeLevel(index) {
    level = index;
    hearts = 3;
    player = { x: 100, y: ground - 54, w: 42, h: 54, vx: 0, vy: 0, facing: 1, grounded: true, safeX: 100 };
    enemies = stages[level].enemies.map(x => ({ x, origin: x, direction: -1 }));
    boss = level === 4 ? { x: 2130, direction: -1, hp: 3 } : null;
    shots = [];
    cooldown = invulnerable = camera = elapsed = 0;
    clearInputs();
    updateHud();
  }
  function updateHud() {
    levelValue.innerHTML = `${String(level + 1).padStart(2, '0')} <small>/ 05</small>`;
    heartsValue.textContent = '♥ '.repeat(hearts).trim() + (hearts < 3 ? ' ♡'.repeat(3 - hearts) : '');
    heartsValue.setAttribute('aria-label', `${hearts} ${hearts === 1 ? 'heart' : 'hearts'} remaining`);
    powerValue.innerHTML = cooldown > 0 ? 'RECHARGING' : 'READY <i>✦</i>';
    stageName.textContent = state === 'start' ? 'READY WHEN YOU ARE' : stages[level].name;
    tip.textContent = level === 4 ? 'Use your power three times to defeat the boss. Keep moving!' : 'Jump the gaps. A little momentum goes a long way.';
  }
  const overlays = {
    start: ['✦', 'A LITTLE ADVENTURE AWAITS', 'Ready, player one?', 'Cross four colorful worlds, then take on the big boss. Mind the gaps and let your power shine.', 'LET’S PLAY', 'FIVE LEVELS · ONE BRAVE LITTLE HERO'],
    paused: ['Ⅱ', 'TAKE A BREATHER', 'Adventure on pause.', 'Your world will be right here when you’re ready to keep going.', 'RESUME', 'YOUR PROGRESS IS SAFE'],
    complete: ['⚑', 'NICE WORK, HERO', 'A little further!', 'You found the flag. Your hearts will be restored for the next world.', 'NEXT LEVEL', 'THE ADVENTURE CONTINUES'],
    retry: ['♥', 'EVERY HERO STUMBLES', 'Let’s try that again.', 'You’re out of hearts, but your adventure isn’t over. Try this world again with three fresh hearts.', 'RETRY LEVEL', 'YOU’VE GOT THIS'],
    win: ['✦', 'YOU DID IT!', 'What an adventure.', 'Five worlds explored and one big boss defeated. You’re a little legend.', 'PLAY AGAIN', 'THANKS FOR PLAYING']
  };
  function setState(next) {
    state = next;
    clearInputs();
    pauseButton.disabled = next !== 'playing';
    overlay.hidden = next === 'playing';
    if (next !== 'playing') {
      const data = overlays[next];
      document.getElementById('overlay-icon').textContent = data[0];
      document.getElementById('overlay-kicker').textContent = data[1];
      document.getElementById('overlay-title').textContent = data[2];
      document.getElementById('overlay-copy').textContent = data[3];
      action.firstChild.textContent = data[4] + ' ';
      document.getElementById('overlay-hint').textContent = data[5];
      if (next !== 'start') action.focus({ preventScroll: true });
    }
    updateHud();
    if (next === 'playing') announce(`Level ${level + 1}: ${stages[level].name}. ${hearts} hearts. ${level === 4 ? 'Hit the boss three times with your power.' : 'Reach the flag.'}`);
    else if (next !== 'start') announce(overlays[next][2] + ' ' + overlays[next][3]);
  }
  action.addEventListener('click', () => {
    if (state === 'start' || state === 'win') makeLevel(0);
    else if (state === 'complete') makeLevel(level + 1);
    else if (state === 'retry') makeLevel(level);
    setState('playing');
    canvas.focus({ preventScroll: true });
  });
  pauseButton.addEventListener('click', () => { if (state === 'playing') setState('paused'); });

  function jump() {
    if (state === 'playing' && player.grounded) {
      player.vy = -610;
      player.grounded = false;
    }
  }
  function shoot() {
    if (state !== 'playing' || cooldown > 0) return;
    shots.push({ x: player.x + player.w / 2 + player.facing * 26, y: player.y + 24, vx: player.facing * 650, life: 1.6 });
    cooldown = 1;
    updateHud();
    announce('Power fired. Recharging.');
  }
  const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', x: 'power', X: 'power' };
  window.addEventListener('keydown', event => {
    const control = keyMap[event.key];
    if (!control || state !== 'playing' || event.defaultPrevented) return;
    // Keep keyboard activation of focused buttons available.
    if (event.key === ' ' && document.activeElement.tagName === 'BUTTON') return;
    event.preventDefault();
    if (control === 'left' || control === 'right') setDirection(control, `key:${event.code || event.key}`, true);
    else if (!event.repeat && control === 'jump') jump();
    else if (!event.repeat && control === 'power') shoot();
  });
  window.addEventListener('keyup', event => {
    releaseButtonKey(event.key);
    const control = keyMap[event.key];
    if (control === 'left' || control === 'right') setDirection(control, `key:${event.code || event.key}`, false);
  });
  document.querySelectorAll('[data-control]').forEach(button => {
    const control = button.dataset.control;
    buttonPresses.set(button, new Set());
    if (control === 'left' || control === 'right') {
      button.addEventListener('keydown', event => {
        if (state !== 'playing' || (event.key !== ' ' && event.key !== 'Enter')) return;
        // Suppress native activation (and Space scrolling); movement lasts until keyup.
        event.preventDefault();
        if (directionButtonKeys.has(event.key)) return;
        const source = `button-key:${event.key}`;
        directionButtonKeys.set(event.key, { button, control, source });
        setDirection(control, source, true);
        setButtonPress(button, source, true);
      });
      button.addEventListener('blur', () => {
        for (const [key, press] of directionButtonKeys) {
          if (press.button === button) releaseButtonKey(key);
        }
      });
    }
    button.addEventListener('pointerdown', event => {
      if (state !== 'playing') return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      const source = `pointer:${event.pointerId}`;
      setButtonPress(button, source, true);
      if (control === 'left' || control === 'right') setDirection(control, source, true);
      else if (control === 'jump') jump();
      else shoot();
    });
    const release = event => {
      const source = `pointer:${event.pointerId}`;
      setButtonPress(button, source, false);
      if (control === 'left' || control === 'right') setDirection(control, source, false);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    // Keyboard activation of real buttons.
    button.addEventListener('click', event => {
      if (event.detail !== 0 || state !== 'playing') return;
      if (control === 'jump') jump();
      else if (control === 'power') shoot();
    });
  });
  function interrupt() {
    clearInputs();
    if (state === 'playing') setState('paused');
  }
  window.addEventListener('blur', interrupt);
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });

  function onGround(x) {
    return x >= 0 && x <= worldWidth && !stages[level].gaps.some(([start, end]) => x > start && x < end);
  }
  function damage() {
    if (invulnerable > 0 || state !== 'playing') return;
    hearts--;
    shots = [];
    if (hearts <= 0) {
      updateHud();
      setState('retry');
      return;
    }
    player.x = player.safeX;
    player.y = ground - player.h;
    player.vx = player.vy = 0;
    player.grounded = true;
    invulnerable = 2;
    updateHud();
    announce(`Ouch! ${hearts} ${hearts === 1 ? 'heart' : 'hearts'} remaining. Respawned safely.`);
  }
  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function update(dt) {
    elapsed += dt;
    if (cooldown > 0) {
      cooldown = Math.max(0, cooldown - dt);
      if (cooldown === 0) { updateHud(); announce('Power ready.'); }
    }
    invulnerable = Math.max(0, invulnerable - dt);
    const direction = Number(held.right) - Number(held.left);
    player.vx = direction * 225;
    if (direction) player.facing = direction;
    player.x = Math.max(0, Math.min(worldWidth - player.w, player.x + player.vx * dt));
    const oldBottom = player.y + player.h;
    player.vy = Math.min(player.vy + 1650 * dt, 950);
    player.y += player.vy * dt;
    const center = player.x + player.w / 2;
    if (player.vy >= 0 && oldBottom <= ground && player.y + player.h >= ground && onGround(center)) {
      player.y = ground - player.h;
      player.vy = 0;
      player.grounded = true;
    } else if (!onGround(center) || player.y + player.h < ground) {
      player.grounded = false;
    }
    // Only save a respawn point well away from gaps and enemies.
    if (player.grounded && onGround(center - 75) && onGround(center + 75) &&
      enemies.every(e => Math.abs(e.x - player.x) > 160) && (!boss || Math.abs(boss.x - player.x) > 200)) {
      player.safeX = player.x;
    }
    if (player.y > H + 80) damage();
    if (state !== 'playing') return;
    enemies.forEach(enemy => {
      enemy.x += enemy.direction * 55 * dt;
      if (enemy.x < enemy.origin - 70 || enemy.x > enemy.origin + 70) enemy.direction *= -1;
      if (overlaps(player, { x: enemy.x, y: ground - 36, w: 38, h: 36 })) damage();
    });
    if (state !== 'playing') return;
    if (boss) {
      boss.x += boss.direction * 85 * dt;
      if (boss.x < 1900 || boss.x > 2300) boss.direction *= -1;
      if (overlaps(player, { x: boss.x, y: ground - 100, w: 86, h: 100 })) damage();
    }
    if (state !== 'playing') return;
    shots.forEach(shot => { shot.x += shot.vx * dt; shot.life -= dt; });
    shots = shots.filter(shot => {
      if (boss && shot.x > boss.x && shot.x < boss.x + 86 && shot.y > ground - 100 && shot.y < ground) {
        boss.hp--;
        announce(`Boss hit! ${boss.hp} ${boss.hp === 1 ? 'hit' : 'hits'} remaining.`);
        if (boss.hp === 0) setState('win');
        return false;
      }
      return shot.life > 0 && shot.x > 0 && shot.x < worldWidth;
    });
    if (state !== 'playing') return;
    if (!boss && player.x > worldWidth - 150 && player.grounded) setState('complete');
    camera = Math.max(0, Math.min(worldWidth - W, player.x - 280));
  }

  function roundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  function cloud(x, y, scale) {
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.beginPath();
    ctx.ellipse(x, y, 35 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 15 * scale, y - 7 * scale, 13 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 6 * scale, y - 12 * scale, 19 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function hills(color, base, height, width, offset) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-width, H);
    for (let x = -width; x < W + width; x += width) {
      const xx = x - (camera * offset % width);
      ctx.lineTo(xx, base);
      ctx.quadraticCurveTo(xx + width / 2, base - height, xx + width, base);
    }
    ctx.lineTo(W + width, H);
    ctx.closePath();
    ctx.fill();
  }
  function drawHero() {
    if (invulnerable > 0 && Math.floor(invulnerable * 8) % 2 === 0) return;
    const x = player.x - camera, y = player.y;
    const stride = player.grounded && player.vx ? Math.sin(elapsed * 16) * 7 : 0;
    ctx.strokeStyle = '#244839'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 13, y + 37); ctx.lineTo(x + 12 - stride, y + 52); ctx.lineTo(x + 7 - stride, y + 52);
    ctx.moveTo(x + 29, y + 37); ctx.lineTo(x + 30 + stride, y + 52); ctx.lineTo(x + 35 + stride, y + 52); ctx.stroke();
    ctx.save(); ctx.translate(x + 21, y + 20); ctx.rotate(player.vx ? Math.sin(elapsed * 12) * .035 : 0);
    const colors = ['#ef765c', '#f4c95d', '#70adc3', '#86b878'];
    colors.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(-19 + (i % 2) * 20, -19 + Math.floor(i / 2) * 20, 18, 18); });
    ctx.fillStyle = '#254337';
    const face = player.facing * 3;
    ctx.beginPath(); ctx.arc(-6 + face, -3, 1.8, 0, Math.PI * 2); ctx.arc(5 + face, -3, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#254337'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(face, 2, 4, .2, Math.PI - .2); ctx.stroke();
    ctx.restore();
  }
  function render() {
    const stage = stages[level];
    ctx.fillStyle = stage.sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f9e3a0'; ctx.beginPath(); ctx.arc(800 - camera * .08, 75, 35, 0, Math.PI * 2); ctx.fill();
    cloud(170 - camera * .12, 86, .8); cloud(520 - camera * .12, 135, 1); cloud(870 - camera * .12, 175, .65);
    hills(stage.far, 345, 160, 360, .17);
    hills(stage.hill, 392, 125, 270, .32);
    ctx.save(); ctx.translate(-camera, 0);
    const segments = []; let start = 0;
    stage.gaps.forEach(gap => { segments.push([start, gap[0]]); start = gap[1]; });
    segments.push([start, worldWidth]);
    segments.forEach(([a, b]) => {
      ctx.fillStyle = '#d8b990'; ctx.fillRect(a, ground, b - a, H - ground);
      ctx.fillStyle = '#668f66'; ctx.fillRect(a, ground, b - a, 12);
      ctx.fillStyle = '#88ad77'; ctx.fillRect(a, ground, b - a, 5);
      for (let x = Math.ceil(a / 95) * 95; x < b; x += 95) {
        ctx.fillStyle = 'rgba(111,131,84,.45)'; ctx.fillRect(x, 434 + (x % 3) * 7, 4, 4); ctx.fillRect(x + 24, 458, 3, 3);
      }
    });
    for (let x = 170; x < worldWidth; x += 230) {
      if (!onGround(x)) continue;
      ctx.strokeStyle = '#638c64'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, ground); ctx.lineTo(x, ground - 18); ctx.stroke();
      ctx.fillStyle = x % 3 ? '#f5e1a4' : '#f5c2a8';
      ctx.beginPath(); ctx.arc(x, ground - 20, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (!boss) {
      ctx.fillStyle = '#507761'; ctx.fillRect(worldWidth - 100, ground - 130, 4, 130);
      ctx.fillStyle = '#f7d773'; ctx.beginPath(); ctx.moveTo(worldWidth - 96, ground - 130); ctx.lineTo(worldWidth - 48, ground - 112); ctx.lineTo(worldWidth - 96, ground - 94); ctx.fill();
      ctx.fillStyle = '#345c49'; ctx.font = 'bold 12px Arial'; ctx.fillText('GOAL', worldWidth - 115, ground - 143);
    }
    enemies.forEach(enemy => {
      roundRect(enemy.x, ground - 36, 38, 36, 14, '#bd795f');
      ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(enemy.x + 12, ground - 23, 3, 0, Math.PI * 2); ctx.arc(enemy.x + 26, ground - 23, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#493e31'; ctx.fillRect(enemy.x + 11, ground - 24, 2, 3); ctx.fillRect(enemy.x + 25, ground - 24, 2, 3);
      ctx.fillStyle = '#8d5e4d'; ctx.fillRect(enemy.x + 5, ground - 4, 10, 4); ctx.fillRect(enemy.x + 24, ground - 4, 10, 4);
    });
    if (boss) {
      roundRect(boss.x, ground - 100, 86, 100, 25, '#665d79');
      ctx.fillStyle = '#e8b786'; ctx.beginPath(); ctx.moveTo(boss.x + 10, ground - 88); ctx.lineTo(boss.x + 4, ground - 117); ctx.lineTo(boss.x + 31, ground - 96); ctx.moveTo(boss.x + 76, ground - 88); ctx.lineTo(boss.x + 82, ground - 117); ctx.lineTo(boss.x + 55, ground - 96); ctx.fill();
      ctx.fillStyle = '#fff9e8'; ctx.beginPath(); ctx.arc(boss.x + 28, ground - 62, 8, 0, Math.PI * 2); ctx.arc(boss.x + 58, ground - 62, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#34303e'; ctx.beginPath(); ctx.arc(boss.x + 26, ground - 62, 3, 0, Math.PI * 2); ctx.arc(boss.x + 56, ground - 62, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#34303e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(boss.x + 42, ground - 40, 10, .15, Math.PI - .15); ctx.stroke();
      roundRect(boss.x - 4, ground - 143, 94, 8, 4, '#e8e3d5');
      if (boss.hp > 0) roundRect(boss.x - 4, ground - 143, 94 * boss.hp / 3, 8, 4, '#e98170');
      ctx.fillStyle = '#425b4b'; ctx.font = 'bold 11px Arial'; ctx.fillText('BOSS', boss.x + 27, ground - 152);
    }
    shots.forEach(shot => {
      ctx.fillStyle = '#fff2a3'; ctx.beginPath(); ctx.arc(shot.x, shot.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e7aa3f'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('✦', shot.x, shot.y + 8); ctx.textAlign = 'start';
    });
    ctx.restore();
    drawHero();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = 'bold 11px Arial'; ctx.fillText(`WORLD ${String(level + 1).padStart(2, '0')}  /  ${stage.name}`, 25, 30);
  }
  function frame(time) {
    if (!lastTime) lastTime = time;
    const delta = Math.min((time - lastTime) / 1000, .1);
    lastTime = time;
    if (state === 'playing') {
      accumulator += delta;
      while (accumulator >= step && state === 'playing') { update(step); accumulator -= step; }
    } else accumulator = 0;
    render();
    requestAnimationFrame(frame);
  }
  makeLevel(0);
  setState('start');
  requestAnimationFrame(frame);
})();
