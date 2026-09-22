/* Falling keycaps with pointer dragging, keyboard actions and a protected copy area. */
(() => {
  'use strict';
  const hero = document.querySelector('.mood-hero--spheres');
  if (!hero) return;
  const canvas = hero.querySelector('.hero-spheres');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const title = hero.querySelector('.mood-title');
  // Preserve the heading's accessible name and spaces, including Cyrillic copy.
  const words = title.textContent.trim().split(/\s+/);
  title.setAttribute('aria-label', title.textContent.trim());
  title.replaceChildren(...words.flatMap((word, i) => {
    const span = document.createElement('span');
    span.className = 'hero-reveal-word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--reveal-delay', `${i * .13}s`);
    span.textContent = word;
    return i ? [document.createTextNode(' '), span] : [span];
  }));
  hero.classList.add('is-reveal-pending');
  const reveal = () => {
    if (document.documentElement.matches('.is-page-loading, .is-transition-pending')) return;
    const lines = [];
    title.querySelectorAll('.hero-reveal-word').forEach(word => {
      if (!lines.includes(word.offsetTop)) lines.push(word.offsetTop);
      word.style.setProperty('--reveal-delay', `${lines.indexOf(word.offsetTop) * .18}s`);
    });
    hero.classList.remove('is-reveal-pending');
    hero.classList.add('is-revealing');
    observer.disconnect();
  };
  const observer = new MutationObserver(reveal);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  reveal();
  if (!ctx) return;
  let width = 0, height = 0, frame = 0, last = 0, visible = true;
  let keys = [], safe, floor, dragged = null;
  const labels = ['Esc', '⌘', 'A', 'S', 'D', 'F', '↵', '⌥', 'Z', 'X', 'C', 'V', '⇧', '←', '↓', '↑', '→', '⌘', 'B', 'Tab'];
  const controls = document.createElement('div');
  controls.className = 'hero-sphere-controls';
  canvas.after(controls);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const buttons = labels.map((label, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--fill-keycap btn--icon-only hero-sphere-control';
    button.setAttribute('aria-label', `Клавиша ${label}: перетащите или используйте стрелки`);
    button.addEventListener('pointerenter', () => { if (keys[i]) { keys[i].hover = true; paint(); } });
    button.addEventListener('pointerleave', () => { if (keys[i]) { keys[i].hover = false; paint(); } });
    button.addEventListener('focus', () => { if (keys[i]) { keys[i].focus = true; paint(); } });
    button.addEventListener('blur', () => { if (keys[i]) { keys[i].focus = false; paint(); } });
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || dragged) return;
      const key = keys[i];
      if (!key) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      button.setPointerCapture(event.pointerId);
      dragged = { key, id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
      key.vx = key.vy = key.spin = 0;
      button.classList.add('is-dragging');
      paint();
    });
    button.addEventListener('pointermove', event => {
      if (!dragged || dragged.id !== event.pointerId || dragged.key !== keys[i]) return;
      const key = dragged.key, now = performance.now();
      const dt = Math.max(.016, (now - dragged.time) / 1000);
      const oldX = key.x, oldY = key.y;
      key.x += event.clientX - dragged.x; key.y += event.clientY - dragged.y;
      constrain(key);
      key.vx = clamp((key.x - oldX) / dt, -700, 700);
      key.vy = clamp((key.y - oldY) / dt, -700, 700);
      key.angle = clamp(key.vx / 1600, -.3, .3);
      Object.assign(dragged, { x: event.clientX, y: event.clientY, time: now });
      paint();
    });
    const release = event => {
      if (!dragged || dragged.id !== event.pointerId || dragged.key !== keys[i]) return;
      const key = dragged.key;
      if (event.type !== 'pointerup' || performance.now() - dragged.time > 100) key.vx = key.vy = 0;
      key.spin = key.vx / 450;
      dragged = null;
      button.classList.remove('is-dragging');
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      wake();
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => button.addEventListener(type, release));
    button.addEventListener('keydown', event => {
      const delta = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[event.key];
      if (!delta) return;
      event.preventDefault();
      const key = keys[i]; key.x += delta[0]; key.y += delta[1];
      key.vx = key.vy = 0; constrain(key); wake();
    });
    button.addEventListener('click', event => {
      if (event.detail || !keys[i]) return;
      const key = keys[i];
      if (!reduced.matches) { key.vy = -280; key.spin = .8; }
      wake();
    });
    controls.appendChild(button);
    return button;
  });
  function resetKeys() {
    dragged = null;
    buttons.forEach(button => button.classList.remove('is-dragging'));
    const bounds = canvas.getBoundingClientRect();
    const content = hero.querySelector('.mood-content').getBoundingClientRect();
    safe = { left: content.left - bounds.left - 20, right: content.right - bounds.left + 20,
      top: content.top - bounds.top - 24, bottom: content.bottom - bounds.top + 24 };
    floor = height - 20;
    const size = clamp(width * .062, 54, 86);
    const count = width < 600 ? 12 : labels.length;
    keys = labels.slice(0, count).map((label, i) => {
      const r = size * .7;
      let x = r + (width - 2 * r) * ((i * .61803398875) % 1);
      let y = -r - (i % 5) * size * 1.65;
      // Narrow screens have no side passage: drop into the space below the copy.
      if (safe.left < r * 2 && safe.right > width - r * 2) y = safe.bottom + r + (i % 2) * size;
      else if (x > safe.left - r && x < safe.right + r) x = i % 2 ? width - r * 1.2 : r * 1.2;
      return { label, x, y, r, size, vx: (i % 2 ? -1 : 1) * 22, vy: 0,
        angle: (i % 5 - 2) * .12, spin: (i % 3 - 1) * .3, bounce: 0 };
    });
    if (reduced.matches) for (let i = 0; i < 360; i++) step(1 / 60);
  }
  function constrain(key) {
    const r = key.r;
    key.x = clamp(key.x, r, width - r);
    key.y = Math.min(key.y, floor - r);
    if (dragged?.key === key) key.y = Math.max(r, key.y);
    if (key.x > safe.left - r && key.x < safe.right + r && key.y > safe.top - r && key.y < safe.bottom + r) {
      const exits = [
        { distance: key.x - safe.left + r, x: safe.left - r, y: key.y, ok: safe.left >= r * 2 },
        { distance: safe.right + r - key.x, x: safe.right + r, y: key.y, ok: safe.right <= width - r * 2 },
        { distance: safe.bottom + r - key.y, x: key.x, y: safe.bottom + r, ok: true }
      ].filter(exit => exit.ok).sort((a, b) => a.distance - b.distance);
      key.x = exits[0].x; key.y = exits[0].y;
    }
  }
  function step(dt) {
    for (const key of keys) {
      if (dragged?.key === key) continue;
      key.vy += 850 * dt;
      key.x += key.vx * dt; key.y += key.vy * dt;
      key.angle += key.spin * dt;
      key.spin *= Math.exp(-dt * 1.5); key.bounce *= Math.exp(-dt * 12);
      if (key.x < key.r || key.x > width - key.r) key.vx *= -.35;
      if (key.y >= floor - key.r) {
        key.bounce = Math.min(.1, Math.abs(key.vy) / 6000);
        key.vy = Math.abs(key.vy) > 65 ? -key.vy * .28 : 0;
        key.vx *= Math.exp(-dt * 9); key.spin *= .8;
      }
      constrain(key);
    }
    // Several small solver passes keep a quiet, softly packed pile.
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i], b = keys[j], dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.hypot(dx, dy), gap = a.r + b.r;
        if (distance >= gap) continue;
        const nx = distance ? dx / distance : 1, ny = distance ? dy / distance : 0;
        const weightA = dragged?.key === a ? 0 : dragged?.key === b ? 1 : .5;
        const weightB = 1 - weightA;
        const overlap = gap - distance;
        a.x -= nx * overlap * weightA; a.y -= ny * overlap * weightA;
        b.x += nx * overlap * weightB; b.y += ny * overlap * weightB;
        const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (speed < 0) {
          a.vx += speed * nx * weightA * 1.2; a.vy += speed * ny * weightA * 1.2;
          b.vx -= speed * nx * weightB * 1.2; b.vy -= speed * ny * weightB * 1.2;
        }
      }
      keys.forEach(constrain);
    }
  }
  function paint() {
    ctx.clearRect(0, 0, width, height);
    const typography = getComputedStyle(hero);
    buttons.forEach((button, i) => { button.hidden = !keys[i]; });
    for (const [i, key] of keys.entries()) {
      const { x, y, size, angle } = key;
      const active = key.hover || key.focus || dragged?.key === key;
      const button = buttons[i];
      button.style.left = `${x}px`; button.style.top = `${y}px`;
      button.style.rotate = `${angle}rad`;
      button.style.setProperty('--keycap-hit-size', `${size}px`);
      button.hidden = y + key.r < 0;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.scale(1 + key.bounce, 1 - key.bounce);
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
      const base = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      base.addColorStop(0, active ? '#83b8ff' : '#ffffff');
      base.addColorStop(1, active ? '#1856cf' : '#9299a5');
      ctx.fillStyle = base; ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, size * .19); ctx.fill();
      ctx.shadowColor = 'transparent';
      const top = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      top.addColorStop(0, active ? '#6aa8ff' : '#ffffff');
      top.addColorStop(1, active ? '#2873ed' : '#e4e7ec');
      ctx.fillStyle = top; ctx.beginPath(); ctx.roundRect(-size * .41, -size * .44, size * .82, size * .75, size * .13); ctx.fill();
      ctx.strokeStyle = active ? '#a5caff' : '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = active ? '#ffffff' : '#535b69';
      ctx.font = `${typography.getPropertyValue('--font-size-text').trim()} ${typography.getPropertyValue('--font-family-body').trim()}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(key.label, 0, -size * .04); ctx.restore();
    }
  }
  function tick(now) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, .032) : 0;
    for (let i = 0; i < 3; i++) step(dt / 3);
    last = now; paint();
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function wake() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    paint();
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); resetKeys(); wake();
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas); sizeObserver.observe(hero.querySelector('.mood-content'));
  const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
  visibilityObserver.observe(canvas);
  addEventListener('pageshow', () => { visibilityObserver.unobserve(canvas); visibilityObserver.observe(canvas); });
  document.addEventListener('visibilitychange', wake);
  reduced.addEventListener('change', resize);
})();
