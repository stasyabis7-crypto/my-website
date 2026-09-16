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
    dot.classList.toggle('is-suppressed', !!(target && target.closest('[data-cursor-hidden]')));
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

  // Ease the nearest scrollable surface, including menus and horizontal tracks.
  // Native positions keep scrollbars, focus, anchors and observers in sync.
  var frame = 0, destination = 0, previousTime = 0, written = 0;
  var surface = null, axis = 'y';
  function stopScroll() { cancelAnimationFrame(frame); frame = 0; }
  function locked() {
    return root.classList.contains('contact-scroll-lock') || root.classList.contains('work-toc-scroll-lock') || root.classList.contains('is-page-loading');
  }
  function position() {
    return surface === window ? window.scrollY : surface[axis === 'y' ? 'scrollTop' : 'scrollLeft'];
  }
  function limit() {
    if (surface === window) return Math.max(0, root.scrollHeight - innerHeight);
    return Math.max(0, axis === 'y' ? surface.scrollHeight - surface.clientHeight : surface.scrollWidth - surface.clientWidth);
  }
  function step(now) {
    if ((surface === window ? locked() : !surface.isConnected || !surface.getClientRects().length) || Math.abs(position() - written) > 2) { stopScroll(); return; }
    var dt = Math.min(64, now - previousTime);
    previousTime = now;
    destination = Math.max(0, Math.min(destination, limit()));
    var next = position() + (destination - position()) * (1 - Math.exp(-dt / 115));
    if (Math.abs(destination - next) < .8) next = destination;
    var options = { behavior: 'instant' };
    options[axis === 'y' ? 'top' : 'left'] = next;
    surface.scrollTo(options);
    written = position();
    cursorTarget();
    if (next !== destination) frame = requestAnimationFrame(step);
    else frame = 0;
  }
  window.addEventListener('wheel', function (event) {
    if (!fine.matches || reduced.matches || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey) { stopScroll(); return; }
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) { stopScroll(); return; }
    var nextAxis = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 'x' : 'y';
    var delta = nextAxis === 'x' ? (event.deltaX || event.deltaY) : event.deltaY;
    if (!delta) return;
    var nextSurface = null;
    for (var el = event.target; el && el !== document.body; el = el.parentElement) {
      var css = getComputedStyle(el);
      var overflow = nextAxis === 'y' ? css.overflowY : css.overflowX;
      var max = nextAxis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
      if (/auto|scroll/.test(overflow) && max > 1) {
        var offset = nextAxis === 'y' ? el.scrollTop : el.scrollLeft;
        var containment = nextAxis === 'y' ? css.overscrollBehaviorY : css.overscrollBehaviorX;
        if ((delta < 0 && offset > 0) || (delta > 0 && offset < max - 1) || /contain|none/.test(containment)) {
          nextSurface = el;
          break;
        }
      }
      // A modal boundary must never hand the gesture to the background page.
      if (el.matches('[role="dialog"]')) { stopScroll(); return; }
    }
    if (!nextSurface) {
      if (locked() || nextAxis === 'x') { stopScroll(); return; }
      nextSurface = window;
    }
    delta *= event.deltaMode === 1 ? 16 : event.deltaMode === 2
      ? (nextSurface === window ? innerHeight : nextAxis === 'y' ? nextSurface.clientHeight : nextSurface.clientWidth) : 1;
    event.preventDefault();
    if (nextSurface !== surface || nextAxis !== axis) stopScroll();
    surface = nextSurface;
    axis = nextAxis;
    if (!frame || Math.sign(delta) !== Math.sign(destination - position())) destination = position();
    destination = Math.max(0, Math.min(limit(), destination + delta));
    if (!frame) {
      written = position();
      previousTime = performance.now();
      frame = requestAnimationFrame(step);
    }
  }, { passive: false });
  ['pointerdown', 'touchstart', 'keydown', 'resize', 'pagehide'].forEach(function (name) {
    window.addEventListener(name, stopScroll, { passive: true });
  });
  reduced.addEventListener('change', stopScroll);
  fine.addEventListener('change', stopScroll);

  // Every filled section covers its preceding sibling, after that sibling's
  // bottom has been readable. Short surfaces never leave the underlay exposed
  // below them. Layout remains in normal flow, including anchor navigation.
  var overlaps = Array.from(document.querySelectorAll('.project-slider--themed, .case-block--surface'))
    .filter(function (surface) { return surface.previousElementSibling; })
    .map(function (surface) {
      return { surface: surface, underlay: surface.previousElementSibling, start: 0, end: 0, fadeStart: 0, fadeDistance: 1 };
    });
  if (!overlaps.length) return;
  var overlapFrame = 0;
  function paintOverlap() {
    overlapFrame = 0;
    overlaps.forEach(function (pair) {
      var enabled = !reduced.matches;
      pair.underlay.classList.toggle('overlap-underlay', enabled);
      pair.surface.classList.toggle('overlap-surface', enabled);
      // Fade only once the next surface enters the viewport. Tie opacity to
      // scroll so reversing direction restores the previous content smoothly.
      var progress = enabled ? Math.max(0, Math.min(1,
        (window.scrollY - pair.fadeStart) / pair.fadeDistance)) : 0;
      var fade = progress * progress * (3 - 2 * progress);
      pair.underlay.style.setProperty('--overlap-opacity', 1 - fade);
      pair.underlay.classList.toggle('is-covered', enabled && progress === 1);
      pair.underlay.style.transform = enabled
        ? 'translate3d(0,' + Math.max(0, Math.min(pair.end - pair.start, window.scrollY - pair.start)) + 'px,0)'
        : '';
    });
    cursorTarget();
  }
  function measure() {
    overlaps.forEach(function (pair) { pair.underlay.style.transform = ''; });
    overlaps.forEach(function (pair) {
      var bounds = pair.surface.getBoundingClientRect();
      pair.fadeStart = window.scrollY + bounds.top - innerHeight;
      pair.fadeDistance = Math.max(1, Math.min(bounds.height, innerHeight) * 0.65);
      pair.start = window.scrollY + pair.underlay.getBoundingClientRect().bottom - innerHeight;
      pair.end = window.scrollY + Math.min(bounds.top, bounds.bottom - innerHeight);
    });
    paintOverlap();
  }
  window.addEventListener('scroll', function () {
    if (!overlapFrame) overlapFrame = requestAnimationFrame(paintOverlap);
  }, { passive: true });
  window.addEventListener('resize', measure);
  reduced.addEventListener('change', measure);
  var overlapObserver = new ResizeObserver(measure);
  overlaps.forEach(function (pair) {
    overlapObserver.observe(pair.underlay);
    overlapObserver.observe(pair.surface);
  });
  document.fonts.ready.then(measure);
  measure();
})();
