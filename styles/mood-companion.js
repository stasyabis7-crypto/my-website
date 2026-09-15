/* Original procedural particle companion, inspired by the supplied motion reference.
   Canvas 2D, no downloaded character assets or animation runtime. */
(function () {
  'use strict';
  const root = document.documentElement;
  const home = document.getElementById('mood-home');
  const actor = document.getElementById('mood-actor');
  const canvas = document.getElementById('mood-canvas');
  if (!home || !actor || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const character = document.getElementById('mood-character');
  const nextButton = document.getElementById('mood-next');
  const pauseButton = document.getElementById('mood-pause');
  const heading = document.getElementById('mood-heading');
  let paused = false;
  const motionOff = () => reduced.matches || paused;
  const name = document.getElementById('mood-name');
  const description = document.getElementById('mood-description');
  const speech = document.getElementById('mood-speech');
  const stage = document.querySelector('.mood-stage');
  const wave = document.querySelector('.mood-wave');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const moods = [
    { id: 'anastasia', name: 'Anastasia', colour: 'розовое', next: 'сиреневую', ink: '#581B3A', bg: '#FEB7D7', reaction: 'Ну всё. Я обиделась.', hello: 'Ладно, я снова с вами.' },
    { id: 'stasy', name: 'Stasy', colour: 'сиреневое', next: 'жёлтую', ink: '#242C65', bg: '#97A6FD', reaction: 'Лови следующее настроение!', hello: 'О, а что у нас тут?' },
    { id: 'stas', name: 'Stas', colour: 'жёлтое', next: 'розовую', ink: '#52451A', bg: '#FDF07F', reaction: 'Ясно. Ухожу.', hello: 'Так. Смотрим работы.' }
  ];
  let index = Math.max(0, moods.findIndex(m => m.id === root.dataset.mood));
  let mood = moods[index];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const particles = Array.from({ length: 1900 }, (_, i) => {
    const z = 1 - 2 * (i + .5) / 1900;
    const a = i * Math.PI * (3 - Math.sqrt(5));
    const r = Math.sqrt(1 - z * z);
    return { x: Math.cos(a) * r, y: z, z: Math.sin(a) * r, seed: random(i), layer: .68 + random(i + 99) * .32 };
  });
  let point = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  let gaze = { x: 0, y: 0 };
  let position = { x: 0, y: 0, size: 0 };
  let homeRect, stageRect, headerBottom = 110;
  let following = false;
  let hovering = false;
  let freezeUntil = 0;
  let change = null;
  let frame = 0;
  let lastFrame = 0;
  let speechTimer;
  let mounted = true;
  let pixelRatio = Math.min(devicePixelRatio || 1, 2);
  let resolution = 0;
  let lastScroll = scrollY;
  let scrollKick = 0;
  let idleAt = performance.now();
  let blinkAt = performance.now() + 1800;
  let blinkStart = -10000;
  let forcePaint = true;
  let layoutDirty = true;
  const cursor = document.createElement('div');
  cursor.className = 'mood-cursor text-button';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span>Поменять тему</span><span>↗</span>';
  document.body.appendChild(cursor);
  // Moving the actor out of the clipped hero keeps one continuous character on scroll.
  document.body.appendChild(actor);
  actor.classList.add('is-ready');

  function updateCopy() {
    name.textContent = mood.name;
    description.replaceChildren(document.createTextNode('Сегодня настроение ' + mood.colour + '.'), document.createElement('br'), document.createTextNode('Можешь его поменять.'));
    character.setAttribute('aria-label', mood.name + '. Поменять тему на ' + mood.next);
  }
  function say(text, duration = 1900) {
    clearTimeout(speechTimer);
    speech.textContent = text;
    speech.classList.add('is-visible');
    speechTimer = setTimeout(() => speech.classList.remove('is-visible'), duration);
  }
  function hideCursor() {
    hovering = false;
    root.classList.remove('mood-cursor-active');
  }
  function measure() {
    homeRect = home.getBoundingClientRect();
    stageRect = stage.getBoundingClientRect();
    headerBottom = header ? header.getBoundingClientRect().bottom : 110;
    // Select existing DS heading roles on the narrowest phones.
    heading.classList.toggle('text-display', innerWidth < 360);
    heading.classList.toggle('text-display-lg', innerWidth >= 360);
    const footer = document.querySelector('.site-footer');
    if (footer && innerWidth >= 1000) {
      const rect = footer.getBoundingClientRect();
      root.style.setProperty('--gd-socials-offset', rect.top < 140 && rect.right > innerWidth - 260 ? Math.ceil(rect.width + 12) + 'px' : '0px');
    }
    layoutDirty = false;
  }
  function applyMood(nextIndex, persist = true) {
    index = nextIndex;
    mood = moods[index];
    root.dataset.mood = mood.id;
    updateCopy();
    if (persist) { try { localStorage.setItem('stasyabis-mood', mood.id); } catch (_) {} }
    forcePaint = true;
  }
  function switchMood() {
    if (change) return; // One scene per activation, including rapid touch/keyboard input.
    hideCursor();
    idleAt = performance.now();
    if (motionOff()) {
      applyMood((index + 1) % moods.length);
      say(mood.hello);
      wake();
      return;
    }
    change = { start: performance.now(), from: index, applied: false };
    nextButton.setAttribute('aria-busy', 'true');
    character.setAttribute('aria-busy', 'true');
    say(mood.reaction, 850);
    wake();
  }
  character.addEventListener('click', switchMood);
  nextButton.addEventListener('click', switchMood);
  character.addEventListener('pointerenter', e => {
    if (!fine.matches || e.pointerType === 'touch' || change) return;
    hovering = true;
    freezeUntil = Infinity;
    root.classList.add('mood-cursor-active');
  });
  character.addEventListener('pointerleave', () => { hideCursor(); freezeUntil = performance.now() + 1200; });
  character.addEventListener('focus', () => { freezeUntil = Infinity; });
  character.addEventListener('blur', () => { freezeUntil = performance.now() + 1200; });
  window.addEventListener('pointermove', e => {
    point = { x: e.clientX, y: e.clientY, active: e.pointerType !== 'touch' };
    idleAt = performance.now();
    if (fine.matches) {
      const x = clamp(e.clientX + 16, 8, innerWidth - cursor.offsetWidth - 8);
      const y = clamp(e.clientY + 18, 8, innerHeight - 76);
      cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
    }
    forcePaint = true;
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { point.active = false; hideCursor(); freezeUntil = 0; });
  window.addEventListener('blur', () => { point.active = false; hideCursor(); freezeUntil = 0; });
  window.addEventListener('scroll', () => {
    scrollKick = clamp((scrollY - lastScroll) * .02, -1, 1);
    lastScroll = scrollY;
    layoutDirty = true;
    hideCursor();
    if (document.activeElement !== character) freezeUntil = 0;
    wake();
  }, { passive: true });
  window.addEventListener('resize', () => {
    pixelRatio = Math.min(devicePixelRatio || 1, 2);
    layoutDirty = true;
    forcePaint = true;
    freezeUntil = 0;
    hideCursor();
    wake();
  });
  const observer = new ResizeObserver(() => { layoutDirty = true; forcePaint = true; wake(); });
  observer.observe(home);
  observer.observe(stage);
  const header = document.querySelector('.site-header');
  if (header) observer.observe(header);
  const syncMotion = () => {
    if (change) { applyMood((change.from + 1) % moods.length); finishChange(); }
    forcePaint = true;
    wake();
  };
  reduced.addEventListener('change', syncMotion);
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    root.toggleAttribute('data-mood-paused', paused);
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Продолжить анимацию персонажа' : 'Приостановить анимацию персонажа');
    pauseButton.title = paused ? 'Продолжить анимацию' : 'Приостановить анимацию';
    pauseButton.querySelector('path').setAttribute('d', paused ? 'M6 3l11 7-11 7z' : 'M5 3h3v14H5zM12 3h3v14h-3z');
    syncMotion();
  });
  fine.addEventListener('change', () => { hideCursor(); freezeUntil = 0; wake(); });
  window.addEventListener('storage', e => {
    if (e.key !== 'stasyabis-mood') return;
    const next = moods.findIndex(m => m.id === e.newValue);
    if (next < 0) return;
    if (change) finishChange();
    applyMood(next, false);
    wake();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; hideCursor(); }
    else { lastFrame = 0; layoutDirty = true; forcePaint = true; wake(); }
  });
  window.addEventListener('pagehide', () => { mounted = false; cancelAnimationFrame(frame); frame = 0; clearTimeout(speechTimer); });
  window.addEventListener('pageshow', () => { mounted = true; layoutDirty = true; forcePaint = true; wake(); });

  function finishChange() {
    change = null;
    nextButton.removeAttribute('aria-busy');
    character.removeAttribute('aria-busy');
    wave.classList.remove('is-playing');
    wave.style.background = '';
  }
  function roundedEye(x, y, rx, ry, pupilX, pupilY, lid) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, Math.max(1.5, ry * lid), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFDF2';
    ctx.fill();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(x + pupilX, y + pupilY, rx * .53, ry * .53, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#10110F';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + pupilX + 4, y + pupilY - 5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFDF2';
    ctx.fill();
    ctx.restore();
  }
  function draw(now, scene) {
    const compact = following;
    const wanted = Math.round((compact ? 160 : 480) * pixelRatio);
    if (resolution !== wanted) { canvas.width = canvas.height = wanted; resolution = wanted; }
    ctx.setTransform(resolution / 480, 0, 0, resolution / 480, 0, 0);
    ctx.clearRect(0, 0, 480, 480);
    const t = motionOff() ? 0 : now * .001;
    const sleepy = !motionOff() && now - idleAt > 14000;
    const breathe = motionOff() ? 1 : 1 + Math.sin(t * 1.65) * .024;
    const rotation = t * .13;
    const ca = Math.cos(rotation), sa = Math.sin(rotation);
    const anger = scene.anger;
    const bounce = motionOff() ? 0 : Math.sin(t * 1.9) * 5 + Math.sin(t * 12) * Math.abs(scrollKick) * 5;
    ctx.save();
    ctx.translate(240 + scene.x, 240 + bounce + scene.y);
    ctx.rotate(scene.rotate + gaze.x * .035);
    ctx.scale(breathe * scene.scale * (1 + anger * .08), scene.scale * (1 - anger * .08));
    ctx.globalAlpha = scene.opacity;
    // Subtle coloured core keeps the creature legible on dark project covers.
    const core = ctx.createRadialGradient(0, 0, 20, 0, 0, 154);
    core.addColorStop(0, mood.bg + (compact ? 'F0' : '22'));
    core.addColorStop(.65, mood.bg + (compact ? 'D0' : '12'));
    core.addColorStop(1, mood.bg + '00');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, 162, 0, Math.PI * 2); ctx.fill();
    const count = compact ? 680 : (fine.matches ? 1900 : 1200);
    for (let i = 0; i < count; i++) {
      const p = particles[Math.floor(i * particles.length / count)];
      const xx = p.x * ca + p.z * sa;
      const zz = p.z * ca - p.x * sa;
      const wobble = Math.sin(p.y * 7 + t * 1.7 + p.seed * 4) * 5 + Math.cos(xx * 6 - t) * 4;
      const fuzz = Math.sin(t * 4 + p.seed * 70) * (hovering ? 4.5 : 1.6);
      const radius = (151 + wobble + fuzz + anger * 14 * p.seed) * p.layer;
      const spread = scene.scatter * (40 + p.seed * 90);
      let x = xx * (radius + spread);
      let y = p.y * (radius + spread);
      if (!motionOff() && !compact && point.active) {
        const gx = gaze.x * 100, gy = gaze.y * 85;
        const dist = Math.hypot(x - gx, y - gy);
        if (dist < 62) { const repel = (1 - dist / 62) * (hovering ? 16 : 5); x += (x - gx) / (dist || 1) * repel; y += (y - gy) / (dist || 1) * repel; }
      }
      const alpha = (.2 + (zz + 1) * .28) * scene.opacity;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = compact && zz < -.1 ? mood.bg : mood.ink;
      const dot = (compact ? 1.9 : .85) + p.seed * (compact ? 1.7 : .95) + (zz + 1) * .32;
      ctx.fillRect(x, y, dot, dot);
      if (!compact && i % 9 === 0) {
        ctx.globalAlpha = alpha * .4;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + xx * 4, y + p.y * 4); ctx.strokeStyle = mood.ink; ctx.lineWidth = .6; ctx.stroke();
      }
    }
    ctx.globalAlpha = scene.opacity;
    const blink = now - blinkStart;
    let lid = blink >= 0 && blink < 150 ? Math.max(.05, Math.abs(blink - 75) / 75) : 1;
    if (sleepy) lid *= .38;
    const faceX = gaze.x * 13;
    const faceY = gaze.y * 9 - 13;
    ctx.translate(faceX, faceY);
    const eyeRx = index === 0 ? 24 : 25;
    const eyeRy = index === 1 ? 32 : 29;
    const eyeLid = lid * (index === 2 ? .57 : 1) * (1 - anger * .4);
    roundedEye(-36, -7, eyeRx, eyeRy, gaze.x * 8, gaze.y * 9 + 1, eyeLid);
    roundedEye(36, -7, eyeRx, eyeRy, gaze.x * 8, gaze.y * 9 + 1, eyeLid);
    ctx.strokeStyle = '#10110F'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    if (index === 0 && lid > .5) {
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.moveTo(side * 53, -25); ctx.lineTo(side * 62, -37);
        ctx.moveTo(side * 44, -32); ctx.lineTo(side * 47, -44);
        ctx.stroke();
      });
    }
    if (index === 2 || anger > .1) {
      [-1, 1].forEach(side => {
        ctx.beginPath(); ctx.moveTo(side * 17, -33 + anger * 7); ctx.lineTo(side * 55, -35 - anger * 5); ctx.stroke();
      });
    }
    ctx.beginPath();
    if (anger > .3 || index === 2) {
      ctx.moveTo(-8, 42); ctx.quadraticCurveTo(0, 38 - anger * 7, 8, 42); ctx.stroke();
    } else if (index === 1 || sleepy) {
      ctx.ellipse(0, 39, sleepy ? 7 : 10, sleepy ? 10 : 12, 0, 0, Math.PI * 2); ctx.fillStyle = '#10110F'; ctx.fill();
    } else {
      ctx.arc(0, 31, 12, .15, Math.PI - .15); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function tick(now) {
    frame = 0;
    if (!mounted || document.hidden) return;
    const delta = lastFrame ? Math.min(now - lastFrame, 64) : 16;
    // Limit particle redraws to 30fps on touch devices; transforms remain time-based.
    if (lastFrame && !fine.matches && !motionOff() && delta < 30) { wake(); return; }
    lastFrame = now;
    if (layoutDirty) measure();
    const wasFollowing = following;
    following = homeRect.bottom < 100 || stageRect.bottom < innerHeight * .18;
    actor.classList.toggle('is-following', following);
    if (following !== wasFollowing) { hideCursor(); freezeUntil = 0; forcePaint = true; if (following && !motionOff()) say('Я рядом. Смотрим?', 2200); }
    let target = { x: homeRect.left, y: homeRect.top, size: homeRect.width };
    if (following) {
      const size = innerWidth < 600 ? 104 : 120;
      const top = Math.max(150, headerBottom + 70);
      const bottom = Math.max(top, innerHeight - size - 110);
      const desiredY = !motionOff() && point.active && fine.matches ? point.y + 48 : innerHeight * .55 + scrollKick * 35;
      target = { x: innerWidth - size - (innerWidth < 600 ? 8 : 24), y: clamp(desiredY, top, bottom), size };
      if (now < freezeUntil && position.size) { target.x = position.x; target.y = position.y; }
    }
    const lerp = motionOff() || !position.size ? 1 : 1 - Math.exp(-delta / (following ? 260 : 150));
    position.x = mix(position.x, target.x, lerp);
    position.y = mix(position.y, target.y, lerp);
    position.size = mix(position.size, target.size, lerp);
    actor.style.width = actor.style.height = position.size + 'px';
    actor.style.transform = `translate3d(${position.x}px,${position.y}px,0)`;
    actor.style.setProperty('--mood-hit-size', Math.max(64, position.size * .69) + 'px');
    const cx = position.x + position.size / 2, cy = position.y + position.size / 2;
    const gx = point.active ? clamp((point.x - cx) / 210, -1, 1) : 0;
    const gy = point.active ? clamp((point.y - cy) / 210, -1, 1) : 0;
    gaze.x = mix(gaze.x, gx, motionOff() ? 1 : .13);
    gaze.y = mix(gaze.y, gy, motionOff() ? 1 : .13);
    scrollKick *= .9;
    if (!motionOff() && now > blinkAt) { blinkStart = now; blinkAt = now + 2300 + random(now) * 2900; }
    const scene = { x: 0, y: 0, scale: 1, rotate: 0, anger: 0, opacity: 1, scatter: 0 };
    if (change) {
      const elapsed = now - change.start;
      if (elapsed < 320) { scene.anger = ease(elapsed / 320); scene.scale = 1 - Math.sin(elapsed / 320 * Math.PI) * .1; }
      else if (elapsed < 760) {
        const p = ease((elapsed - 320) / 440);
        scene.anger = 1; scene.x = p * 165; scene.opacity = 1 - p; scene.scale = 1 - p * .3;
        scene.rotate = change.from === 1 ? p * 2.8 : p * .16;
        scene.y = change.from === 1 ? -Math.sin(p * Math.PI) * 80 : Math.sin(p * Math.PI * 6) * 9;
        scene.scatter = p * .65;
      } else {
        if (!change.applied) {
          const r = stage.getBoundingClientRect();
          wave.style.setProperty('--wave-x', clamp((cx - r.left) / r.width * 100, 0, 100) + '%');
          wave.style.setProperty('--wave-y', clamp((cy - r.top) / r.height * 100, 0, 100) + '%');
          applyMood((change.from + 1) % moods.length);
          wave.style.background = mood.bg;
          wave.classList.add('is-playing');
          change.applied = true;
          say(mood.hello, 1800);
        }
        const p = ease((elapsed - 760) / 620);
        scene.x = -95 * (1 - p); scene.scale = .6 + p * .4; scene.opacity = p; scene.scatter = (1 - p) * .8;
        scene.y = -Math.sin(p * Math.PI) * (index === 1 ? 50 : 18);
        if (elapsed >= 1450) finishChange();
      }
    }
    const moving = Math.abs(position.x - target.x) + Math.abs(position.y - target.y) + Math.abs(position.size - target.size) > .1;
    if (!motionOff() || forcePaint || moving) { draw(now, scene); forcePaint = false; }
    if (!motionOff() || moving || change) wake();
  }
  function wake() { if (!frame && mounted && !document.hidden) frame = requestAnimationFrame(tick); }
  applyMood(index, false);
  measure();
  wake();
})();
