/* Decorative, time-based bouncing spheres. No scroll or navigation ownership. */
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
  const spheres = [
    [.36, .108, .25, 3.8, 0], [.56, .055, .42, 3.1, .3],
    [.76, .028, .32, 2.7, .6], [.92, .012, .65, 2.4, .1],
    [.64, .009, .72, 2.9, .8], [.84, .007, .88, 3.6, .4],
    [.26, .005, .70, 3.3, .7], [.46, .006, .53, 2.6, .2],
    [.96, .019, .20, 2.8, .9]
  ];
  let balls = [];
  let floor = 0;
  let gravity = 0;
  // Slow the whole simulation together, preserving the arcs and soft recovery.
  const motionSpeed = .55;
  function resetBalls() {
    floor = height - (width < 600 ? 45 : 32);
    gravity = height * 1.25;
    balls = spheres.map(([x, size, amplitude, period, phase], i) => {
      const r = Math.max(2, Math.min(width, height) * size);
      return { x: width * x, y: floor - r - height * amplitude * .3, r,
        vx: (i % 2 ? -1 : 1) * width * (.025 + phase * .02), vy: 0,
        amplitude, jumps: i % 4, squash: 0, angle: Math.PI / 2 };
    });
  }
  function impact(ball, speed, angle) {
    ball.squash = Math.min(.24, .04 + speed / Math.max(height, 1) * .1);
    ball.angle = angle;
  }
  function step(dt) {
    for (const ball of balls) {
      ball.squash *= Math.exp(-dt * 9);
      ball.vy += gravity * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.r || ball.x > width - ball.r) {
        ball.x = Math.max(ball.r, Math.min(width - ball.r, ball.x));
        impact(ball, Math.abs(ball.vx), 0); ball.vx *= -1;
      }
      if (ball.y + ball.r >= floor && ball.vy > 0) {
        ball.y = floor - ball.r;
        impact(ball, ball.vy, Math.PI / 2);
        ball.jumps++;
        const available = width < 600 ? Math.max(70, height - hero.querySelector('.mood-content').offsetHeight - 220) : height * .7;
        const leap = ball.jumps % 4 === 0 ? height * 1.4 + ball.r * 2 : available * ball.amplitude;
        ball.vy = -Math.sqrt(2 * gravity * leap);
      }
    }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
      if (!distance || distance >= a.r + b.r) continue;
      const nx = dx / distance, ny = dy / distance;
      const ma = a.r * a.r, mb = b.r * b.r;
      const shareA = mb / (ma + mb), shareB = ma / (ma + mb);
      const overlap = a.r + b.r - distance;
      a.x -= nx * overlap * shareA; a.y -= ny * overlap * shareA;
      b.x += nx * overlap * shareB; b.y += ny * overlap * shareB;
      const velocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (velocity >= 0) continue;
      const impulse = -1.65 * velocity;
      a.vx -= impulse * shareA * nx; a.vy -= impulse * shareA * ny;
      b.vx += impulse * shareB * nx; b.vy += impulse * shareB * ny;
      impact(a, -velocity, Math.atan2(ny, nx)); impact(b, -velocity, Math.atan2(ny, nx));
    }
  }
  function paint() {
    ctx.clearRect(0, 0, width, height);
    for (const ball of balls) {
      const { x: cx, r: radius } = ball;
      const cy = reduced.matches ? floor - radius : ball.y;
      const lift = Math.max(0, floor - radius - cy);
      ctx.save(); ctx.translate(cx, floor); ctx.scale(1, .12);
      const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.6);
      shadow.addColorStop(0, `rgba(255,255,255,${.12 * Math.max(0, 1 - lift / height)})`);
      shadow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shadow; ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 4); ctx.restore();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ball.angle);
      const squash = reduced.matches ? 0 : ball.squash;
      ctx.scale(1 - squash, 1 / (1 - squash)); ctx.rotate(-ball.angle);
      const surface = ctx.createRadialGradient(-radius * .3, -radius * .4, 0, 0, 0, radius);
      surface.addColorStop(0, '#ffffff'); surface.addColorStop(.5, '#f1f2ef'); surface.addColorStop(.85, '#ced1ce'); surface.addColorStop(1, '#a6aca8');
      ctx.fillStyle = surface; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  function tick(now) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, .04) : 0;
    for (let i = 0; i < 4; i++) step(dt * motionSpeed / 4);
    last = now; paint();
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function wake() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    paint();
    if (visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  new ResizeObserver(() => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); resetBalls(); wake();
  }).observe(canvas);
  const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
  visibilityObserver.observe(canvas);
  // Reconnect after the initial layout/transition has settled.
  addEventListener('pageshow', () => { visibilityObserver.unobserve(canvas); visibilityObserver.observe(canvas); });
  document.addEventListener('visibilitychange', wake);
  reduced.addEventListener('change', wake);
})();
