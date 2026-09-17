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
  var x = -100, y = -100, visible = false, cursorFrame = 0;
  function hideCursor() {
    visible = false;
    cancelAnimationFrame(cursorFrame);
    cursorFrame = 0;
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
  // Content can move or be replaced beneath a stationary pointer. Hit-test
  // while the cursor is visible, including native scroll and CSS transitions.
  function trackCursorTarget() {
    cursorTarget();
    cursorFrame = requestAnimationFrame(trackCursorTarget);
  }
  document.addEventListener('pointermove', function (event) {
    if (!fine.matches || event.pointerType === 'touch') { hideCursor(); return; }
    x = event.clientX; y = event.clientY;
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    visible = true;
    root.classList.add('has-dot-cursor');
    dot.classList.add('is-visible');
    cursorTarget();
    if (!cursorFrame) cursorFrame = requestAnimationFrame(trackCursorTarget);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', function () { if (document.hidden) hideCursor(); });
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
      return { surface: surface, underlay: surface.previousElementSibling };
    });
  if (!overlaps.length) return;
  // One implementation for every input type: native sticky positioning and
  // one fade per crossing, with no per-scroll style writes or timeline ranges.
  root.classList.add('has-native-overlap');
  var layoutWidth = innerWidth, viewportHeight = innerHeight;
  overlaps.forEach(function (pair) {
    var group = document.createElement('div');
    group.className = 'overlap-group';
    var gap = getComputedStyle(pair.surface.parentElement).rowGap;
    group.style.gap = gap === 'normal' ? '0px' : gap;
    pair.underlay.before(group);
    group.append(pair.underlay, pair.surface);
    pair.group = group;
    pair.underlay.classList.add('overlap-sticky');
    // Collections can span thousands of pixels. Fade a screen-sized cover,
    // rather than compositing the entire image gallery with changing opacity.
    pair.screenFade = pair.underlay.matches('.project-slider');
    pair.underlay.classList.toggle('overlap-sticky--screen-fade', pair.screenFade);
    pair.surface.classList.add('overlap-surface');
    var marker = document.createElement('span');
    marker.className = 'overlap-marker';
    marker.setAttribute('aria-hidden', 'true');
    pair.surface.prepend(marker);
    pair.marker = marker;
  });
  var measureFrame = 0, fadeObserver;
  function measureOverlap() {
    measureFrame = 0;
    overlaps.forEach(function (pair) {
      pair.underlay.style.setProperty('--overlap-pin-top', Math.min(0, viewportHeight - pair.underlay.offsetHeight) + 'px');
      if (pair.screenFade) pair.underlay.style.setProperty('--overlap-screen-height', viewportHeight + 'px');
    });
  }
  function scheduleOverlapMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measureOverlap);
  }
  function observeFade() {
    if (fadeObserver) fadeObserver.disconnect();
    overlaps.forEach(function (pair) {
      pair.group.classList.toggle('is-motion-disabled', reduced.matches);
      if (reduced.matches) {
        pair.underlay.classList.remove('is-faded');
        if (pair.screenFade) pair.underlay.inert = false;
      }
    });
    if (reduced.matches) return;
    // The marker remains inside the observer after leaving the top edge,
    // so scrolling farther down never resurrects the covered section.
    fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var pair = overlaps.find(function (item) { return item.marker === entry.target; });
        pair.underlay.classList.toggle('is-faded', entry.isIntersecting);
        if (pair.screenFade) pair.underlay.inert = entry.isIntersecting;
      });
    }, { rootMargin: '100000px 0px -' + Math.round(viewportHeight * .2) + 'px 0px' });
    overlaps.forEach(function (pair) { fadeObserver.observe(pair.marker); });
  }
  var sizeObserver = new ResizeObserver(scheduleOverlapMeasure);
  overlaps.forEach(function (pair) { sizeObserver.observe(pair.underlay); });
  window.addEventListener('resize', function () {
    if (!fine.matches && innerWidth === layoutWidth) return;
    layoutWidth = innerWidth;
    viewportHeight = innerHeight;
    scheduleOverlapMeasure();
    observeFade();
  });
  reduced.addEventListener('change', observeFade);
  document.fonts.ready.then(scheduleOverlapMeasure);
  measureOverlap();
  observeFade();
})();
