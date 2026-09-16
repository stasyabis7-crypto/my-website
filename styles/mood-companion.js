/* Procedural matte-clay companion with diffuse lighting and morphing shapes.
   Canvas 2D, no downloaded character assets or animation runtime. */
(function () {
  'use strict';
  const root = document.documentElement;
  const home = document.getElementById('mood-home');
  const actor = document.getElementById('mood-actor');
  const canvas = document.getElementById('mood-canvas');
  if (!actor || !canvas) return;
  const standalone = !home;
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
    { id: 'anastasia', name: 'Anastasia', colour: 'розовый', next: 'сиреневую', ink: '#581B3A', bg: '#FEB7D7', reaction: 'Ну всё. Я обиделась.', hello: 'Ладно, я снова с вами.' },
    { id: 'stasy', name: 'Stasy', colour: 'сиреневый', next: 'жёлтую', ink: '#242C65', bg: '#97A6FD', reaction: 'Лови следующее настроение!', hello: 'О, а что у нас тут?' },
    { id: 'stas', name: 'Stas', colour: 'жёлтый', next: 'розовую', ink: '#52451A', bg: '#FDF07F', reaction: 'Ясно. Ухожу.', hello: 'Так. Смотрим работы.' }
  ];
  let index = Math.max(0, moods.findIndex(m => m.id === root.dataset.mood));
  let mood = moods[index];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const shapes = ['wave', 'flower', 'heart', 'star'];
  let shapeIndex = 0;
  const sculptButton = document.getElementById('mood-sculpt');
  const sculptSave = document.getElementById('mood-sculpt-save');
  const sculptReset = document.getElementById('mood-sculpt-reset');
  const sculptCancel = document.getElementById('mood-sculpt-cancel');
  const sculptHelp = document.getElementById('mood-sculpt-help');
  const sculptKey = 'stasyabis-clay-shape-v1';
  let savedShape = null, clayShape = null, sculpting = false, sculptDrag = null;
  try {
    const value = JSON.parse(sessionStorage.getItem(sculptKey));
    if (Array.isArray(value) && value.length === 96 && value.every(v => Number.isFinite(v) && v >= .55 && v <= 1.28)) savedShape = value;
  } catch (_) {}
  clayShape = savedShape && [...savedShape];

  // A radial heart silhouette keeps the contour continuous during morphs.
  const heartOutline = Array.from({ length: 360 }, (_, i) => {
    const angle = i / 360 * Math.PI * 2;
    let low = 0, high = 1.6;
    for (let step = 0; step < 16; step++) {
      const r = (low + high) / 2;
      const x = Math.cos(angle) * r, y = -Math.sin(angle) * r;
      if (Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0) low = r;
      else high = r;
    }
    return (low + high) / 2 * .93;
  });
  const roundedHeart = heartOutline.map((_, i) => {
    let sum = 0, weight = 0;
    for (let offset = -20; offset <= 20; offset++) {
      const w = 21 - Math.abs(offset);
      sum += heartOutline[(i + offset + 360) % 360] * w;
      weight += w;
    }
    return sum / weight;
  });
  function silhouette(shape, angle, time) {
    if (clayShape) {
      const sample = ((angle / (Math.PI * 2) % 1 + 1) % 1) * clayShape.length;
      const start = Math.floor(sample);
      return mix(clayShape[start], clayShape[(start + 1) % clayShape.length], sample - start);
    }
    if (shape === 1) return 1 + .21 * Math.cos(angle * 5 + .25 * Math.sin(time));
    if (shape === 2) return roundedHeart[Math.round((angle + Math.PI * 2) / (Math.PI * 2) * 360) % 360];
    if (shape === 3) return .98 + .2 * Math.cos(angle * 5 + Math.PI / 2);
    return 1 + .07 * Math.sin(angle * 3 + time * .35) + .035 * Math.sin(angle * 5 - time * .28);
  }
  let point = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  let gaze = { x: 0, y: 0 };
  let position = { x: 0, y: 0, size: 0 };
  let homeRect, stageRect, headerBottom = 110;
  let following = false;
  let placement = null; // Viewport coordinates: a dropped companion stays fixed on screen.
  let drag = null;
  let suppressCharacterClickUntil = 0;
  let obstacles = [];
  const interactive = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [contenteditable="true"], [tabindex]:not([tabindex="-1"]), iframe, video[controls]';
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
  let idleTimer;
  let idleCount = 0;
  let idleSpeech = false;
  let idlePhrase = 0;
  const idleLines = [
    ['Я пока порепетировала эффектное появление.', 'Ты читаешь, а я делаю вид, что работаю.', 'Если что, я всё ещё очень розовая.'],
    ['Кажется, курсор ушёл за кофе без нас.', 'Я уже пересчитала все свои частицы.', 'Пс-с. А дальше тоже красиво.'],
    ['Так. Перерыв согласован?', 'Я не завис. Я задумался.', 'Ладно, пять минут можно ничего не делать.']
  ];
  function scheduleIdle(delay = 35000) {
    clearTimeout(idleTimer);
    if (!mounted || document.hidden || paused || idleCount >= 3) return;
    idleTimer = setTimeout(() => {
      if (change || document.querySelector('[role="dialog"]:not([hidden])')) { scheduleIdle(15000); return; }
      if (document.hidden || paused || !mounted) return;
      say(idleLines[index][idlePhrase++ % 3], 6500);
      idleSpeech = true;
      idleCount++;
      scheduleIdle(90000);
    }, delay);
  }
  function activity() {
    idleAt = performance.now();
    idleCount = 0;
    if (idleSpeech) { speech.classList.remove('is-visible'); idleSpeech = false; }
    scheduleIdle();
  }
  let blinkAt = performance.now() + 1800;
  let blinkStart = -10000;
  let forcePaint = true;
  let layoutDirty = true;
  const cursor = document.createElement('div');
  cursor.className = 'mood-cursor text-button';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span>А если нажать?</span><span class="icon icon--arrow-diagonal"></span>';
  document.body.appendChild(cursor);
  // Moving the actor out of the clipped hero keeps one continuous character on scroll.
  document.body.appendChild(actor);
  actor.classList.add('is-ready');
  character.setAttribute('aria-description', 'Нажатие меняет форму и настроение. Можно перетащить в свободное место. С клавиатуры: Alt и стрелки; Escape — вернуть на исходное место.');
  function readObstacles() {
    obstacles = [...document.querySelectorAll(interactive)].filter(el =>
      !actor.contains(el) && !el.closest('[inert], [hidden]') &&
      !el.classList.contains('project-slider__viewport') &&
      getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).pointerEvents !== 'none'
    ).flatMap(el => [...el.getClientRects()]).filter(r => r.width && r.height && r.bottom > 0 && r.top < innerHeight);
  }
  function safeSpot(x, y, size) {
    const padding = 8;
    return !obstacles.some(r => x < r.right + padding && x + size > r.left - padding &&
      y < r.bottom + padding && y + size > r.top - padding);
  }
  function nearestSpot(x, y, size) {
    const bound = (x, y) => ({x: clamp(x, 8, innerWidth - size - 8), y: clamp(y, 8, innerHeight - size - 8), size});
    const desired = bound(x, y);
    if (safeSpot(desired.x, desired.y, size)) return desired;
    for (let radius = 24; radius < Math.max(innerWidth, innerHeight); radius += 24) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
        const candidate = bound(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        if (safeSpot(candidate.x, candidate.y, size)) return candidate;
      }
    }
    return null;
  }
  function dragPosition() {
    if (!drag?.active) return;
    placement = {
      x: clamp(drag.clientX - drag.offsetX, 8, innerWidth - drag.size - 8),
      y: clamp(drag.clientY - drag.offsetY, 8, innerHeight - drag.size - 8),
      size: drag.size
    };
    actor.classList.toggle('is-drop-blocked', !safeSpot(placement.x, placement.y, placement.size));
  }
  function endDrag(cancel = false) {
    if (!drag) return;
    const current = drag;
    if (current.active) {
      readObstacles();
      const spot = cancel ? null : nearestSpot(placement.x, placement.y, placement.size);
      placement = spot ? {...spot} : current.previous;
      suppressCharacterClickUntil = performance.now() + 500;
    }
    drag = null;
    if (character.hasPointerCapture(current.id)) character.releasePointerCapture(current.id);
    actor.classList.remove('is-dragging', 'is-drop-blocked');
    root.classList.remove('mood-character-dragging');
    layoutDirty = true; forcePaint = true; wake();
  }
  character.addEventListener('pointerdown', e => {
    if (sculpting) return;
    if (e.button !== 0 || !e.isPrimary || change) return;
    const size = innerWidth < 600 ? 104 : 120;
    drag = {id: e.pointerId, startX: e.clientX, startY: e.clientY,
      clientX: e.clientX, clientY: e.clientY, size, previous: placement && {...placement}, active: false,
      offsetX: clamp((e.clientX - position.x) / position.size, 0, 1) * size,
      offsetY: clamp((e.clientY - position.y) / position.size, 0, 1) * size};
    character.setPointerCapture(e.pointerId);
    readObstacles();
  });
  character.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.clientX = e.clientX; drag.clientY = e.clientY;
    if (!drag.active && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 7) {
      drag.active = true; character.setPointerCapture(e.pointerId);
      hideCursor(); speech.classList.remove('is-visible');
      actor.classList.add('is-dragging'); root.classList.add('mood-character-dragging');
    }
    if (drag.active) { e.preventDefault(); dragPosition(); wake(); }
  });
  character.addEventListener('pointerup', e => { if (e.pointerId === drag?.id) endDrag(); });
  character.addEventListener('pointercancel', e => { if (e.pointerId === drag?.id) endDrag(true); });
  character.addEventListener('lostpointercapture', () => { if (drag) endDrag(true); });
  character.addEventListener('dragstart', e => e.preventDefault());
  window.addEventListener('blur', () => endDrag(true));
  character.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault(); endDrag(true); placement = null; freezeUntil = 0; hideCursor(); layoutDirty = true; wake(); return;
    }
    if (!e.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault(); hideCursor(); readObstacles();
    const size = innerWidth < 600 ? 104 : 120;
    const x = position.x + position.size / 2 - size / 2 + (e.key === 'ArrowLeft' ? -24 : e.key === 'ArrowRight' ? 24 : 0);
    const y = position.y + position.size / 2 - size / 2 + (e.key === 'ArrowUp' ? -24 : e.key === 'ArrowDown' ? 24 : 0);
    const spot = nearestSpot(x, y, size);
    if (spot) placement = {...spot};
    layoutDirty = true; forcePaint = true; wake();
  });


  function sculptUI(active) {
    sculpting = active; sculptDrag = null;
    root.classList.toggle('mood-sculpting', active);
    sculptButton?.setAttribute('aria-pressed', String(active));
    if (sculptButton) sculptButton.hidden = active;
    for (const button of [sculptSave, sculptReset, sculptCancel]) if (button) button.hidden = !active;
    if (sculptHelp) sculptHelp.hidden = !active;
    if (nextButton) nextButton.disabled = active;
    character.setAttribute('aria-label', active ? 'Лепка: тяни за край. Стрелки вытягивают, Shift со стрелками вдавливает.' : mood.name + '. Поменять тему');
    hideCursor(); forcePaint = true; wake();
  }
  sculptButton?.addEventListener('click', () => {
    if (change) return;
    clayShape = clayShape || Array.from({length: 96}, (_, i) => clamp(silhouette(shapeIndex, i / 96 * Math.PI * 2, 0), .55, 1.28));
    sculptUI(true);
  });
  sculptSave?.addEventListener('click', () => {
    savedShape = [...clayShape];
    try { sessionStorage.setItem(sculptKey, JSON.stringify(savedShape)); }
    catch (_) { say('Форма сохранена до обновления страницы.'); sculptUI(false); return; }
    sculptUI(false); say('Сохранила форму для этой вкладки.');
  });
  sculptReset?.addEventListener('click', () => {
    clayShape = null;
    clayShape = Array.from({length: 96}, (_, i) => clamp(silhouette(shapeIndex, i / 96 * Math.PI * 2, 0), .55, 1.28));
    forcePaint = true; wake();
  });
  sculptCancel?.addEventListener('click', () => { clayShape = savedShape && [...savedShape]; sculptUI(false); });
  function sculptPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = following ? 1 : 1.12;
    return {x: ((e.clientX - rect.left) * 480 / rect.width - 240) / scale,
      y: ((e.clientY - rect.top) * 480 / rect.height - 240) / scale};
  }
  function sculptPull(angle, amount, base) {
    clayShape = base.map((r, i) => {
      const distance = Math.atan2(Math.sin(i / 96 * Math.PI * 2 - angle), Math.cos(i / 96 * Math.PI * 2 - angle));
      return clamp(r + amount * Math.exp(-distance * distance / .20), .55, 1.28);
    });
    forcePaint = true; wake();
  }
  actor.addEventListener('pointerdown', e => {
    if (!sculpting || !e.isPrimary || e.button !== 0) return;
    const p = sculptPoint(e);
    if (Math.hypot(p.x, p.y) < 35) return;
    e.preventDefault(); e.stopPropagation();
    sculptDrag = {id: e.pointerId, angle: Math.atan2(p.y, p.x), start: p, base: [...clayShape]};
    actor.setPointerCapture(e.pointerId);
  }, true);
  actor.addEventListener('pointermove', e => {
    if (!sculptDrag || sculptDrag.id !== e.pointerId) return;
    e.preventDefault(); e.stopPropagation();
    const p = sculptPoint(e), d = sculptDrag;
    sculptPull(d.angle, ((p.x - d.start.x) * Math.cos(d.angle) + (p.y - d.start.y) * Math.sin(d.angle)) / 151, d.base);
  }, true);
  const finishSculpt = e => {
    if (sculptDrag?.id !== e.pointerId) return;
    sculptDrag = null; suppressCharacterClickUntil = performance.now() + 400;
    if (actor.hasPointerCapture(e.pointerId)) actor.releasePointerCapture(e.pointerId);
  };
  actor.addEventListener('pointerup', finishSculpt);
  actor.addEventListener('pointercancel', finishSculpt);
  actor.addEventListener('lostpointercapture', () => { sculptDrag = null; });
  character.addEventListener('keydown', e => {
    if (!sculpting) return;
    const angles = {ArrowRight: 0, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowUp: -Math.PI / 2};
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); clayShape = savedShape && [...savedShape]; sculptUI(false); }
    else if (e.key in angles) { e.preventDefault(); e.stopImmediatePropagation(); sculptPull(angles[e.key], e.shiftKey ? -.06 : .06, [...clayShape]); }
  }, true);

  function updateCopy() {
    if (name) name.textContent = mood.name;
    if (description) description.replaceChildren(document.createTextNode('Цвет настроеееения ' + mood.colour + '.'), document.createElement('br'), document.createTextNode('Нажми на меня — я умею превращаться.'));
    character.setAttribute('aria-label', mood.name + '. Изменить форму и поменять тему на ' + mood.next);
  }
  function say(text, duration = 1900) {
    clearTimeout(speechTimer);
    idleSpeech = false;
    speech.textContent = text;
    speech.classList.add('is-visible');
    speechTimer = setTimeout(() => speech.classList.remove('is-visible'), duration);
  }
  function hideCursor() {
    hovering = false;
    root.classList.remove('mood-cursor-active');
  }
  function measure() {
    homeRect = home?.getBoundingClientRect();
    stageRect = stage?.getBoundingClientRect();
    headerBottom = header ? header.getBoundingClientRect().bottom : 110;
    // Select existing DS heading roles on the narrowest phones.
    heading?.classList.toggle('text-display', innerWidth < 360);
    heading?.classList.toggle('text-display-lg', innerWidth >= 360);
    const footer = document.querySelector('.site-footer');
    if (footer && innerWidth >= 1000) {
      const rect = footer.getBoundingClientRect();
      root.style.setProperty('--chrome-socials-offset', rect.top < 140 && rect.right > innerWidth - 260 ? Math.ceil(rect.width + 12) + 'px' : '0px');
    }
    if (placement) {
      placement.x = clamp(placement.x, 8, innerWidth - placement.size - 8);
      placement.y = clamp(placement.y, 8, innerHeight - placement.size - 8);
      readObstacles();
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
    if (sculpting || change) return; // One scene per activation, including rapid touch/keyboard input.
    hideCursor();
    activity();
    if (motionOff()) {
      shapeIndex = (shapeIndex + 1) % shapes.length;
      actor.dataset.shape = shapes[shapeIndex];
      applyMood((index + 1) % moods.length);
      say(mood.hello);
      wake();
      return;
    }
    change = { start: performance.now(), from: index, fromShape: shapeIndex, toShape: (shapeIndex + 1) % shapes.length, applied: false };
    nextButton?.setAttribute('aria-busy', 'true');
    character.setAttribute('aria-busy', 'true');
    say(['Сейчас будет магия.', 'А вот так умеешь?', 'Так. Меняю форму.'][index], 850);
    wake();
  }
  character.addEventListener('click', e => {
    if (sculpting || performance.now() < suppressCharacterClickUntil) { e.preventDefault(); return; }
    switchMood();
  });
  nextButton?.addEventListener('click', switchMood);
  character.addEventListener('pointerenter', e => {
    if (sculpting || !fine.matches || e.pointerType === 'touch' || change || drag?.active) return;
    hovering = true;
    freezeUntil = Infinity;
    root.classList.add('mood-cursor-active');
  });
  character.addEventListener('pointerleave', () => { hideCursor(); freezeUntil = performance.now() + 1200; });
  character.addEventListener('focus', () => { freezeUntil = Infinity; });
  character.addEventListener('blur', () => { freezeUntil = performance.now() + 1200; });
  window.addEventListener('pointermove', e => {
    point = { x: e.clientX, y: e.clientY, active: true, touch: e.pointerType === 'touch' };
    activity();
    if (fine.matches && e.pointerType !== 'touch') {
      const x = clamp(e.clientX + 16, 8, innerWidth - cursor.offsetWidth - 8);
      const y = clamp(e.clientY + 18, 8, innerHeight - 76);
      cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
    }
    forcePaint = true;
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (!point.touch) point.active = false; hideCursor(); freezeUntil = 0; });
  window.addEventListener('blur', () => { point.active = false; hideCursor(); freezeUntil = 0; });
  function trackTouch(event) {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    point = { x: touch.clientX, y: touch.clientY, active: true, touch: true };
    activity();
    forcePaint = true;
    wake();
  }
  // Native scrolling cancels Pointer Events; passive Touch Events keep reporting
  // the finger's position without blocking the browser's scrolling gesture.
  window.addEventListener('touchstart', trackTouch, { passive: true });
  window.addEventListener('touchmove', trackTouch, { passive: true });
  window.addEventListener('pointerdown', e => {
    point = { x: e.clientX, y: e.clientY, active: true, touch: e.pointerType === 'touch' };
    activity(); forcePaint = true; wake();
  }, { passive: true });
  window.addEventListener('keydown', activity);
  window.addEventListener('scroll', () => {
    activity();
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
  if (home) observer.observe(home);
  if (stage) observer.observe(stage);
  const header = document.querySelector('.site-header');
  if (header) observer.observe(header);
  const syncMotion = () => {
    if (change) { if (!change.applied) applyMood((change.from + 1) % moods.length); finishChange(); }
    forcePaint = true;
    wake();
  };
  reduced.addEventListener('change', syncMotion);
  if (pauseButton) pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (paused) { clearTimeout(speechTimer); speech.classList.remove('is-visible'); }
    scheduleIdle();
    root.toggleAttribute('data-mood-paused', paused);
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Продолжить анимацию персонажа' : 'Приостановить анимацию персонажа');
    pauseButton.title = paused ? 'Продолжить анимацию' : 'Приостановить анимацию';
    pauseButton.querySelector('.icon').classList.toggle('icon--pause', !paused);
    pauseButton.querySelector('.icon').classList.toggle('icon--play', paused);
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
    if (document.hidden) { clearTimeout(idleTimer); clearTimeout(speechTimer); speech.classList.remove('is-visible'); cancelAnimationFrame(frame); frame = 0; hideCursor(); }
    else { activity(); lastFrame = 0; layoutDirty = true; forcePaint = true; wake(); }
  });
  window.addEventListener('pagehide', () => { mounted = false; clearTimeout(idleTimer); cancelAnimationFrame(frame); frame = 0; clearTimeout(speechTimer); });
  window.addEventListener('pageshow', () => { mounted = true; activity(); layoutDirty = true; forcePaint = true; wake(); });

  function finishChange() {
    if (change) shapeIndex = change.toShape;
    actor.dataset.shape = shapes[shapeIndex];
    change = null;
    nextButton?.removeAttribute('aria-busy');
    character.removeAttribute('aria-busy');
    if (wave) { wave.classList.remove('is-playing'); wave.style.background = ''; }
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
    const heroScale = compact ? 1 : 1.12;
    const wanted = Math.round((compact ? 160 : 480) * pixelRatio);
    if (resolution !== wanted) { canvas.width = canvas.height = wanted; resolution = wanted; }
    ctx.setTransform(resolution / 480, 0, 0, resolution / 480, 0, 0);
    ctx.clearRect(0, 0, 480, 480);
    const t = motionOff() || sculpting ? 0 : now * .001;
    const sleepy = !motionOff() && now - idleAt > 14000;
    const breathe = motionOff() || sculpting ? 1 : 1 + Math.sin(t * 1.65) * .024;
    const anger = scene.anger;
    const bounce = motionOff() || sculpting ? 0 : Math.sin(t * 1.9) * 5 + Math.sin(t * 12) * Math.abs(scrollKick) * 5;
    ctx.save();
    ctx.translate(240 + scene.x, 240 + bounce + scene.y);
    ctx.rotate(scene.rotate + (sculpting ? 0 : gaze.x * .035));
    ctx.scale(heroScale * breathe * scene.scale * (1 + anger * .08), heroScale * scene.scale * (1 - anger * .08));
    ctx.globalAlpha = scene.opacity;
    const outlineAt = angle => change
      ? mix(silhouette(change.fromShape, angle, t), silhouette(change.toShape, angle, t), scene.morph || 0)
      : silhouette(shapeIndex, angle, t);
    // Matte clay: a solid contour with broad, diffuse lighting.
    const body = new Path2D();
    for (let step = 0; step <= 180; step++) {
      const angle = step / 180 * Math.PI * 2;
      const radius = 151 * outlineAt(angle) * (1 + .009 * Math.sin(angle * 9 + .8) + .006 * Math.cos(angle * 13));
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (step === 0) body.moveTo(x, y);
      else body.lineTo(x, y);
    }
    body.closePath();
    ctx.save();
    const shade = ['219,74,133', '83,100,213', '218,159,27'][index];
    ctx.shadowColor = `rgba(${shade},.16)`;
    ctx.shadowBlur = compact ? 12 : 18;
    ctx.shadowOffsetY = 9;
    ctx.fillStyle = mood.bg;
    ctx.fill(body);
    ctx.restore();
    ctx.save();
    ctx.clip(body);
    const lightX = -57 + gaze.x * 12, lightY = -70 + gaze.y * 8;
    const light = ctx.createRadialGradient(lightX, lightY, 8, -20, -30, 195);
    light.addColorStop(0, 'rgba(255,255,255,.65)');
    light.addColorStop(.36, 'rgba(255,255,255,.26)');
    light.addColorStop(.54, 'rgba(255,255,255,0)');
    light.addColorStop(.78, `rgba(${shade},.34)`);
    light.addColorStop(1, `rgba(${shade},.60)`);
    ctx.fillStyle = light;
    ctx.fillRect(-210, -210, 420, 420);
    // Broad reflected light and subtle thumb impressions suggest hand-worked clay.
    const sheen = ctx.createRadialGradient(lightX - 6, lightY - 12, 0, lightX, lightY, 100);
    sheen.addColorStop(0, 'rgba(255,255,255,.36)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(-210, -210, 420, 420);
    const reflected = ctx.createRadialGradient(108, 92, 0, 108, 92, 100);
    reflected.addColorStop(0, 'rgba(255,255,255,.24)');
    reflected.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = reflected;
    ctx.fillRect(-210, -210, 420, 420);
    // Fixed shallow indentations stay attached to the material, never shimmer.
    for (const [x, y, radius] of [[-92, 26, 25], [73, 76, 32], [48, -103, 22], [-37, 110, 24]]) {
      const dent = ctx.createRadialGradient(x - 3, y - 4, 0, x, y, radius);
      dent.addColorStop(0, `rgba(${shade},.075)`);
      dent.addColorStop(.65, `rgba(${shade},.035)`);
      dent.addColorStop(1, `rgba(${shade},0)`);
      ctx.fillStyle = dent;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      const lip = ctx.createRadialGradient(x + 4, y + 7, 0, x + 4, y + 7, radius * .8);
      lip.addColorStop(0, 'rgba(255,255,255,.10)');
      lip.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lip;
      ctx.beginPath(); ctx.arc(x + 4, y + 7, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
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
    // Limit canvas redraws to 30fps on touch devices; transforms remain time-based.
    if (lastFrame && !fine.matches && !motionOff() && !drag?.active && delta < 30) { wake(); return; }
    lastFrame = now;
    if (drag?.active) {
      dragPosition();
    }
    if (layoutDirty) measure();
    const wasFollowing = following;
    following = !!drag?.active || standalone || homeRect.bottom < 100 || stageRect.bottom < innerHeight * .18;
    actor.classList.toggle('is-following', following);
    if (following !== wasFollowing) { hideCursor(); freezeUntil = 0; forcePaint = true; if (following && !placement && !motionOff()) say('Я рядом. Смотрим?', 2200); }
    let target = standalone ? { x: 0, y: 0, size: 120 } : { x: homeRect.left, y: homeRect.top, size: homeRect.width };
    if (following) {
      const size = innerWidth < 600 ? 104 : 120;
      const top = Math.max(150, headerBottom + 70);
      const bottom = Math.max(top, innerHeight - size - 110);
      // Desktop companion stays anchored; only its eyes track the pointer.
      const desiredY = innerHeight * .55 + (fine.matches ? 0 : scrollKick * 35);
      target = { x: innerWidth - size - (innerWidth < 600 ? 8 : 24), y: clamp(desiredY, top, bottom), size };
      if (now < freezeUntil && position.size) { target.x = position.x; target.y = position.y; }
    }
    // The visible hero always owns the character; remember the custom screen
    // position for the next time the visitor scrolls below the hero.
    const pinned = following && placement;
    if (pinned) target = {x: placement.x, y: placement.y, size: placement.size};
    const settledPin = pinned && Math.abs(position.size - target.size) < .1;
    const lerp = drag?.active || settledPin || motionOff() || !position.size ? 1 : 1 - Math.exp(-delta / (following ? 260 : 150));
    position.x = mix(position.x, target.x, lerp);
    position.y = mix(position.y, target.y, lerp);
    position.size = mix(position.size, target.size, lerp);
    actor.style.width = actor.style.height = position.size + 'px';
    actor.style.transform = `translate3d(${position.x}px,${position.y}px,0)`;
    actor.style.setProperty('--mood-hit-size', Math.max(64, position.size * .69 * (!following ? 1.25 : 1)) + 'px');
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
      const progress = clamp(elapsed / 1350, 0, 1);
      scene.morph = progress * progress * (3 - 2 * progress);
      const play = Math.sin(progress * Math.PI);
      scene.scatter = play * .16;
      scene.scale = 1 - play * .09;
      scene.rotate = Math.sin(progress * Math.PI * 2) * (change.from === 1 ? .16 : .09);
      scene.y = -play * 12;
      if (progress >= .5 && !change.applied) {
        applyMood((change.from + 1) % moods.length);
        if (stage && wave) {
          const r = stage.getBoundingClientRect();
          wave.style.setProperty('--wave-x', clamp((cx - r.left) / r.width * 100, 0, 100) + '%');
          wave.style.setProperty('--wave-y', clamp((cy - r.top) / r.height * 100, 0, 100) + '%');
          wave.style.background = mood.bg;
          wave.classList.add('is-playing');
        }
        change.applied = true;
        say(['Смотри, как я умею!', 'Сегодня я цветочек.', 'Это тебе ♥', 'Мой звёздный час!'][change.toShape], 2200);
      }
      if (progress >= 1) finishChange();
    }

    const moving = Math.abs(position.x - target.x) + Math.abs(position.y - target.y) + Math.abs(position.size - target.size) > .1;
    if (!motionOff() || forcePaint || moving) { draw(now, scene); forcePaint = false; }
    if (!motionOff() || moving || change || drag?.active) wake();
  }
  function wake() { if (!frame && mounted && !document.hidden) frame = requestAnimationFrame(tick); }
  actor.dataset.shape = shapes[shapeIndex];
  applyMood(index, false);
  measure();
  scheduleIdle();
  wake();
})();
