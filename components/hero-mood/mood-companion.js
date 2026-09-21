/* Six supplied SVG silhouettes with floating motion and an interactive face.
   Canvas 2D, no downloaded character assets or animation runtime. */
(function () {
  'use strict';
  const root = document.documentElement;
  // In-app browsers (Telegram) resize the viewport as their bars show and hide, and
  // svh/dvh follow it. Freeze the hero's viewport height; refresh only when the width
  // changes (rotation / real resize). --hero-vh is the visible height (home hero);
  // --hero-vh-full also counts the area under the bars (flush-bottom project heroes).
  let heroWidth = innerWidth;
  const unitHeight = unit => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100' + unit + ';visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const height = probe.offsetHeight;
    probe.remove();
    return height;
  };
  const freezeHeroHeight = () => {
    const visible = Math.max(innerHeight, unitHeight('svh'));
    root.style.setProperty('--hero-vh', visible + 'px');
    root.style.setProperty('--hero-vh-full', Math.max(visible, unitHeight('lvh')) + 'px');
    root.toggleAttribute('data-hero-short', visible <= 700);
    root.toggleAttribute('data-hero-short-landscape', visible <= 550);
  };
  freezeHeroHeight();
  addEventListener('resize', () => {
    if (innerWidth !== heroWidth) { heroWidth = innerWidth; freezeHeroHeight(); }
  }, { passive: true });
  const home = document.getElementById('mood-home');
  const actor = document.getElementById('mood-actor');
  const canvas = document.getElementById('mood-canvas');
  if (!actor || !canvas) return;
  const standalone = !home;
  const contactDock = standalone ? document.getElementById('site-socials-toggle') : null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const character = document.getElementById('mood-character');
  const heading = document.getElementById('mood-heading');
  const motionOff = () => reduced.matches;
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
  let primary = mood.bg;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const shapes = ['1', '2', '3', '4', '5', '6'];
  let shapeIndex = index;
  const formPaths = [];
  Promise.all(shapes.map(async (id, i) => {
    const response = await fetch(`/components/hero-mood/forms/${id}.svg`);
    if (!response.ok) throw new Error(`Cannot load form ${id}`);
    const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    const viewBox = svg.documentElement.getAttribute('viewBox').split(/\s+/).map(Number);
    const scale = 330 / Math.max(viewBox[2], viewBox[3]);
    const matrix = new DOMMatrix().translate(-(viewBox[0] + viewBox[2] / 2) * scale, -(viewBox[1] + viewBox[3] / 2) * scale).scale(scale);
    const path = new Path2D();
    svg.querySelectorAll('path').forEach(node => {
      if (!node.closest('defs')) path.addPath(new Path2D(node.getAttribute('d')), matrix);
    });
    formPaths[i] = path;
  })).then(() => { forcePaint = true; wake(); }).catch(error => console.error(error));
  let point = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  let gaze = { x: 0, y: 0 };
  let position = { x: 0, y: 0, size: 0 };
  const exhibition = document.querySelector('.work-gallery');
  let homeRect, stageRect, exhibitionTop = Infinity;
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
  let lastPaint = 0;
  // Mobile browser chrome resizes the viewport while scrolling. Keep the dock
  // anchor stable until the layout width changes (rotation / real resize).
  let dockWidth = innerWidth;
  let dockHeight = innerHeight;
  // Live visible height: the docked character sits on the bottom edge like the
  // fixed footer buttons, so a toolbar showing/hiding moves it with them.
  let liveHeight = innerHeight;
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
    ['Кажется, курсор ушёл за кофе без нас.', 'Я уже придумала себе новую форму.', 'Пс-с. А дальше тоже красиво.'],
    ['Так. Перерыв согласован?', 'Я не завис. Я задумался.', 'Ладно, пять минут можно ничего не делать.']
  ];
  function scheduleIdle(delay = 35000) {
    clearTimeout(idleTimer);
    if (!mounted || document.hidden || idleCount >= 3) return;
    idleTimer = setTimeout(() => {
      if (change || document.querySelector('[role="dialog"]:not([hidden])')) { scheduleIdle(15000); return; }
      if (document.hidden || !mounted) return;
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
      !el.matches('.project-slider__viewport, .work-gallery__viewport') &&
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
    exhibitionTop = exhibition?.getBoundingClientRect().top ?? Infinity;
    // Select existing DS heading roles on the narrowest phones.
    const shortLandscape = innerWidth >= 600 && innerHeight < 550;
    heading?.classList.toggle('text-h1', shortLandscape);
    heading?.classList.toggle('text-display', !shortLandscape && innerWidth < 360);
    heading?.classList.toggle('text-display-lg', !shortLandscape && innerWidth >= 360);
    const footer = document.querySelector('.site-footer');
    if (footer && innerWidth >= 1000) {
      const rect = footer.getBoundingClientRect();
      root.style.setProperty('--chrome-socials-offset', rect.top < 140 && rect.right > innerWidth - 260 ? Math.ceil(rect.width + 12) + 'px' : '0px');
    }
    layoutDirty = false;
  }
  function applyMood(nextIndex, persist = true) {
    index = nextIndex;
    mood = moods[index];
    root.dataset.mood = mood.id;
    primary = getComputedStyle(root).getPropertyValue('--color-action-active').trim() || mood.bg;
    updateCopy();
    if (persist) { try { localStorage.setItem('stasyabis-mood', mood.id); } catch (_) {} }
    forcePaint = true;
  }
  function switchMood() {
    if (change) return; // One scene per activation, including rapid touch/keyboard input.
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
    character.setAttribute('aria-busy', 'true');
    say(['Сейчас будет магия.', 'А вот так умеешь?', 'Так. Меняю форму.'][index], 850);
    wake();
  }
  character.addEventListener('click', e => {
    if (performance.now() < suppressCharacterClickUntil) { e.preventDefault(); return; }
    switchMood();
  });
  character.addEventListener('pointerenter', e => {
    if (!fine.matches || e.pointerType === 'touch' || change || drag?.active) return;
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
  // Toolbar changes on phones resize the visual viewport; keep the dock in step.
  window.visualViewport?.addEventListener('resize', () => wake());
  window.addEventListener('resize', () => {
    if (fine.matches || innerWidth !== dockWidth) {
      dockWidth = innerWidth;
      dockHeight = innerHeight;
      // A toolbar resizing during mobile scroll must not rewrite a custom drop.
      // Rebound only on an actual window resize or orientation change.
      if (placement) {
        placement.x = clamp(placement.x, 8, innerWidth - placement.size - 8);
        placement.y = clamp(placement.y, 8, innerHeight - placement.size - 8);
      }
    }
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
  if (contactDock) observer.observe(contactDock);
  const syncMotion = () => {
    if (change) { if (!change.applied) applyMood((change.from + 1) % moods.length); finishChange(); }
    forcePaint = true;
    wake();
  };
  reduced.addEventListener('change', syncMotion);
  fine.addEventListener('change', () => { hideCursor(); freezeUntil = 0; wake(); });
  window.addEventListener('storage', e => {
    if (e.key !== 'stasyabis-mood') return;
    const next = moods.findIndex(m => m.id === e.newValue);
    if (next < 0) return;
    if (change) finishChange();
    shapeIndex = Math.floor(shapeIndex / 3) * 3 + next;
    actor.dataset.shape = shapes[shapeIndex];
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
    const miniSize = innerWidth < 600 ? 104 : 120;
    const heroAmount = standalone ? 0 : clamp((position.size - miniSize) / Math.max(1, homeRect.width - miniSize), 0, 1);
    const heroScale = mix(1, 1.12, heroAmount);
    // Keep the detailed bitmap throughout the flight, then downsample at rest.
    const compact = following && position.size <= miniSize + .5;
    const wanted = Math.round((compact ? 160 : 480) * pixelRatio);
    if (resolution !== wanted) { canvas.width = canvas.height = wanted; resolution = wanted; }
    ctx.setTransform(resolution / 480, 0, 0, resolution / 480, 0, 0);
    ctx.clearRect(0, 0, 480, 480);
    const t = motionOff() ? 0 : now * .001;
    const sleepy = !motionOff() && now - idleAt > 14000;
    const breathe = motionOff() ? 1 : 1 + Math.sin(t * 1.65) * .024;
    const anger = scene.anger;
    const bounce = motionOff() ? 0 : Math.sin(t * 1.9) * 5 + Math.sin(t * 12) * (fine.matches && !placement ? Math.abs(scrollKick) : 0) * 5;
    ctx.save();
    ctx.translate(240 + scene.x, 240 + bounce + scene.y);
    ctx.rotate(scene.rotate + gaze.x * .035);
    ctx.scale(heroScale * breathe * scene.scale * (1 + anger * .08), heroScale * scene.scale * (1 - anger * .08));
    ctx.globalAlpha = scene.opacity;
    const fallback = new Path2D();
    fallback.arc(0, 0, 150, 0, Math.PI * 2);
    const body = formPaths[shapeIndex] || fallback;
    ctx.fillStyle = primary;
    ctx.fill(body);
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
    // Position updates run on every animation frame. Only canvas paint is
    // capped on touch devices; skipping the whole tick made the flight stutter.
    lastFrame = now;
    if (drag?.active) {
      dragPosition();
    }
    if (layoutDirty) measure();
    if (innerHeight !== liveHeight) {
      // Carry a docked character by the same distance the bottom edge moved,
      // without the easing lag; the dock target below already uses liveHeight.
      if (following && !placement && !drag?.active) position.y += innerHeight - liveHeight;
      liveHeight = innerHeight;
    }
    const wasFollowing = following;
    const exitThreshold = wasFollowing ? 140 : 100;
    following = !!placement || !!drag?.active || standalone || exhibitionTop < innerHeight * .8 || homeRect.bottom < exitThreshold ||
      stageRect.bottom < dockHeight * (wasFollowing ? .22 : .18);
    actor.classList.toggle('is-following', following);
    if (following !== wasFollowing) { hideCursor(); freezeUntil = 0; forcePaint = true; if (following && !placement && !motionOff()) say('Я рядом. Смотрим?', 2200); }
    const homeSize = standalone ? 120 : Math.max(0, Math.min(homeRect.width, homeRect.height));
    let target = standalone ? { x: 0, y: 0, size: 120 } : { x: homeRect.left + (homeRect.width - homeSize) / 2, y: homeRect.top + (homeRect.height - homeSize) / 2, size: homeSize };
    if (following) {
      const size = innerWidth < 600 ? 104 : 120;
      // A fixed dock on both input types: scroll-event velocity must not
      // change the destination while the character is flying towards it.
      const dockX = standalone ? (innerWidth - size) / 2 : innerWidth >= 1101 ? 16 : innerWidth - size - 16;
      target = { x: dockX, y: Math.max(8, liveHeight - size - 16), size };
      // Only internal desktop pages dock beside the contact action. Home and
      // mobile retain their existing destinations; manual placement still wins.
      if (contactDock && innerWidth >= 1000) {
        const contact = contactDock.getBoundingClientRect();
        target.x = Math.max(8, contact.left - size - 12);
        target.y = Math.max(8, contact.top + (contact.height - size) / 2);
      }
      if (now < freezeUntil && position.size) { target.x = position.x; target.y = position.y; }
    }
    // A manual drop owns the screen position until another drag or Escape,
    // including when scrolling back to the hero.
    if (standalone) actor.classList.toggle('is-contact-docked', !!contactDock && innerWidth >= 1000 && !placement && !drag?.active);
    const pinned = placement;
    if (pinned) target = {x: placement.x, y: placement.y, size: placement.size};
    const settledPin = pinned && Math.abs(position.size - target.size) < .1;
    const lerp = drag?.active || settledPin || motionOff() || !position.size ? 1 : 1 - Math.exp(-delta / (following ? 260 : 150));
    const atHome = !following && Math.abs(position.size - target.size) < .1;
    position.x = mix(position.x, target.x, atHome ? 1 : lerp);
    position.y = mix(position.y, target.y, atHome ? 1 : lerp);
    position.size = mix(position.size, target.size, lerp);
    // Read before layout-affecting writes to avoid a forced layout per frame.
    const speechHalf = speech.offsetWidth / 2;
    actor.style.width = actor.style.height = position.size + 'px';
    actor.style.transform = `translate3d(${position.x}px,${position.y}px,0)`;
    actor.style.setProperty('--mood-hit-size', Math.max(64, position.size * .69 * (!following ? 1.25 : 1)) + 'px');
    const cx = position.x + position.size / 2, cy = position.y + position.size / 2;
    // Keep the bubble on screen while its pointed tail stays above the character.
    speech.style.setProperty('--speech-shift', (clamp(cx, speechHalf + 16, innerWidth - speechHalf - 16) - cx) + 'px');
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
      // Swap at the midpoint of a gentle squash; keep the supplied contours intact.
      if (progress >= .5) shapeIndex = change.toShape;
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
        say('Смотри, какая новая форма!', 2200);
      }
      if (progress >= 1) finishChange();
    }

    const moving = Math.abs(position.x - target.x) + Math.abs(position.y - target.y) + Math.abs(position.size - target.size) > .1;
    const paintDue = fine.matches || motionOff() || drag?.active || now - lastPaint >= 1000 / 30;
    if (paintDue && (!motionOff() || forcePaint || moving)) {
      draw(now, scene);
      lastPaint = now;
      forcePaint = false;
    }
    if (!motionOff() || moving || change || drag?.active) wake();
  }
  function wake() { if (!frame && mounted && !document.hidden) frame = requestAnimationFrame(tick); }
  actor.dataset.shape = shapes[shapeIndex];
  applyMood(index, false);
  measure();
  scheduleIdle();
  wake();
})();
