(function () {
  'use strict';
  var root = document.documentElement;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // A white difference layer inverts the actual pixels beneath the dot.
  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  var x = -100, y = -100, visible = false;
  function hideCursor() {
    visible = false;
    root.classList.remove('has-dot-cursor');
    dot.classList.remove('is-visible');
  }
  function cursorTarget() {
    if (!visible) return;
    var target = document.elementFromPoint(x, y);
    var action = target && target.closest('a[href], button, [role="button"], input, select, textarea, summary, [contenteditable="true"], [data-close]');
    dot.classList.toggle('is-action', !!action && !action.matches(':disabled, [aria-disabled="true"]'));
  }
  document.addEventListener('pointermove', function (event) {
    if (!fine.matches || event.pointerType === 'touch') { hideCursor(); return; }
    x = event.clientX; y = event.clientY;
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    visible = true;
    root.classList.add('has-dot-cursor');
    dot.classList.add('is-visible');
    cursorTarget();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('pointerdown', function (event) { if (event.pointerType === 'touch') hideCursor(); });
  fine.addEventListener('change', hideCursor);
  window.addEventListener('scroll', cursorTarget, { passive: true });

  // Wheel easing uses native scroll positions; anchors, keyboard and touch keep
  // their normal behavior. Never consume zoom or scroll inside a dialog/control.
  var frame = 0, targetY = 0, previousTime = 0, writtenY = 0;
  function stopScroll() { cancelAnimationFrame(frame); frame = 0; }
  function locked() {
    return root.classList.contains('contact-scroll-lock') || root.classList.contains('work-toc-scroll-lock') || root.classList.contains('is-page-loading');
  }
  function step(now) {
    if (locked() || Math.abs(window.scrollY - writtenY) > 2) { stopScroll(); return; }
    var dt = Math.min(64, now - previousTime);
    previousTime = now;
    targetY = Math.min(targetY, Math.max(0, root.scrollHeight - innerHeight));
    var next = window.scrollY + (targetY - window.scrollY) * (1 - Math.exp(-dt / 115));
    if (Math.abs(targetY - next) < .8) next = targetY;
    window.scrollTo({ top: next, behavior: 'instant' });
    writtenY = window.scrollY;
    if (next !== targetY) frame = requestAnimationFrame(step);
    else frame = 0;
  }
  window.addEventListener('wheel', function (event) {
    if (!fine.matches || reduced.matches || locked() || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { stopScroll(); return; }
    for (var el = event.target; el && el !== document.body; el = el.parentElement) {
      if (el.matches('input, textarea, select, [contenteditable="true"], [role="dialog"]') || (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) { stopScroll(); return; }
    }
    var delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (!delta) return;
    event.preventDefault();
    if (!frame || Math.sign(delta) !== Math.sign(targetY - window.scrollY)) targetY = window.scrollY;
    targetY = Math.max(0, Math.min(root.scrollHeight - innerHeight, targetY + delta));
    if (!frame) {
      writtenY = window.scrollY;
      previousTime = performance.now();
      frame = requestAnimationFrame(step);
    }
  }, { passive: false });
  ['pointerdown', 'touchstart', 'keydown', 'resize', 'pagehide'].forEach(function (name) {
    window.addEventListener(name, stopScroll, { passive: true });
  });
  reduced.addEventListener('change', stopScroll);
  fine.addEventListener('change', stopScroll);

  // Hold the bottom of the long Avito collection only after all its rows have
  // been readable. Ozon continues in normal flow, covering it from below.
  var avito = document.getElementById('works-gallery');
  var ozon = document.getElementById('ozon-projects');
  if (!avito || !ozon) return;
  var start = 0, end = 0, overlapFrame = 0;
  function paintOverlap() {
    overlapFrame = 0;
    var enabled = !reduced.matches;
    root.classList.toggle('has-project-overlap', enabled);
    avito.style.transform = enabled ? 'translate3d(0,' + Math.max(0, Math.min(end - start, window.scrollY - start)) + 'px,0)' : '';
    cursorTarget();
  }
  function measure() {
    // offsetTop is unaffected by the visual translation.
    avito.style.transform = '';
    start = window.scrollY + avito.getBoundingClientRect().bottom - innerHeight;
    end = window.scrollY + ozon.getBoundingClientRect().top;
    paintOverlap();
  }
  window.addEventListener('scroll', function () {
    if (!overlapFrame) overlapFrame = requestAnimationFrame(paintOverlap);
  }, { passive: true });
  window.addEventListener('resize', measure);
  reduced.addEventListener('change', measure);
  new ResizeObserver(measure).observe(avito);
  document.fonts.ready.then(measure);
  measure();
})();
