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
  var overlapFrame = 0, measureFrame = 0;
  var layoutWidth = innerWidth, viewportHeight = innerHeight;
  var timeline = typeof ScrollTimeline === 'function'
    ? new ScrollTimeline({ source: document.scrollingElement, axis: 'block' }) : null;
  function layoutTop(element) {
    var top = 0;
    for (var node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  }
  function cancelAnimations(pair) {
    (pair.animations || []).forEach(function (animation) { animation.cancel(); });
    pair.animations = [];
  }
  function animateOverlap(pair, extent) {
    if (!timeline || reduced.matches) {
      cancelAnimations(pair);
      return;
    }
    var travel = Math.max(0, pair.end - pair.start);
    function range(value) { return (value / extent * 100) + '%'; }
    var ranges = [range(pair.start), range(Math.max(pair.start + 1, pair.end)),
      range(pair.fadeStart), range(pair.fadeStart + pair.fadeDistance)];
    try {
      if (!pair.animations || !pair.animations.length) {
        pair.animations = [];
        pair.animations.push(pair.underlay.animate([
          { transform: 'translate3d(0,0,0)' },
          { transform: 'translate3d(0,' + travel + 'px,0)' }
        ], { timeline: timeline, duration: 'auto', rangeStart: ranges[0],
          rangeEnd: ranges[1], fill: 'both' }));
        pair.animations.push(pair.underlay.animate([
          { opacity: 1 }, { opacity: 0 }
        ], { timeline: timeline, duration: 'auto', rangeStart: ranges[2],
          rangeEnd: ranges[3], easing: 'cubic-bezier(.33,0,.67,1)', fill: 'both' }));
        if (!('rangeStart' in pair.animations[0])) throw new Error('Unsupported animation ranges');
      } else {
        // Keep the same compositor animations alive during browser-bar resizes.
        // Cancelling and recreating them causes a blank/stale frame on mobile.
        if (pair.travel !== travel) pair.animations[0].effect.setKeyframes([
          { transform: 'translate3d(0,0,0)' },
          { transform: 'translate3d(0,' + travel + 'px,0)' }
        ]);
        if (pair.ranges[0] !== ranges[0]) pair.animations[0].rangeStart = ranges[0];
        if (pair.ranges[1] !== ranges[1]) pair.animations[0].rangeEnd = ranges[1];
        if (pair.ranges[2] !== ranges[2]) pair.animations[1].rangeStart = ranges[2];
        if (pair.ranges[3] !== ranges[3]) pair.animations[1].rangeEnd = ranges[3];
      }
      pair.travel = travel;
      pair.ranges = ranges;
    } catch (_) {
      cancelAnimations(pair);
    }
  }
  function paintOverlap() {
    overlapFrame = 0;
    var enabled = !reduced.matches;
    var scroll = window.scrollY;
    overlaps.forEach(function (pair) {
      var progress = enabled ? Math.max(0, Math.min(1,
        (scroll - pair.fadeStart) / pair.fadeDistance)) : 0;
      pair.underlay.classList.toggle('is-covered', enabled && progress === 1);
      // Native timelines keep transform and opacity in sync with compositor
      // scrolling. JS only updates accessibility at the fully hidden boundary.
      if (pair.animations && pair.animations.length) return;
      var fade = progress * progress * (3 - 2 * progress);
      pair.underlay.style.opacity = enabled ? String(1 - fade) : '';
      pair.underlay.style.transform = enabled
        ? 'translate3d(0,' + Math.max(0, Math.min(pair.end - pair.start, scroll - pair.start)) + 'px,0)'
        : '';
    });
    cursorTarget();
  }
  function measure() {
    measureFrame = 0;
    // Read layout coordinates without resetting transforms and forcing another
    // layout. Browser toolbar height changes do not alter this geometry.
    overlaps.forEach(function (pair) {
      var top = layoutTop(pair.surface), height = pair.surface.offsetHeight;
      pair.fadeStart = top - viewportHeight;
      pair.fadeDistance = Math.max(1, Math.min(height, viewportHeight) * 0.65);
      pair.start = layoutTop(pair.underlay) + pair.underlay.offsetHeight - viewportHeight;
      pair.end = Math.min(top, top + height - viewportHeight);
    });
    var extent = Math.max(1, document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight);
    overlaps.forEach(function (pair) {
      pair.underlay.classList.toggle('overlap-underlay', !reduced.matches);
      pair.surface.classList.toggle('overlap-surface', !reduced.matches);
      animateOverlap(pair, extent);
      if (reduced.matches || (pair.animations && pair.animations.length)) {
        pair.underlay.style.transform = '';
        pair.underlay.style.opacity = '';
      }
    });
    paintOverlap();
  }
  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  window.addEventListener('scroll', function () {
    if (!overlapFrame) overlapFrame = requestAnimationFrame(paintOverlap);
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!fine.matches && innerWidth === layoutWidth) { scheduleMeasure(); return; }
    layoutWidth = innerWidth;
    viewportHeight = innerHeight;
    scheduleMeasure();
  });
  reduced.addEventListener('change', scheduleMeasure);
  var overlapObserver = new ResizeObserver(scheduleMeasure);
  overlaps.forEach(function (pair) {
    overlapObserver.observe(pair.underlay);
    overlapObserver.observe(pair.surface);
  });
  overlapObserver.observe(document.body);
  overlapObserver.observe(document.documentElement);
  document.fonts.ready.then(scheduleMeasure);
  measure();
})();
