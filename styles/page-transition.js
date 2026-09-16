(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Resolve from this script so / and subdirectory previews work identically.
  var siteBase = new URL('../', document.currentScript.src);
  var busy = false;
  var navigationTimer = 0;
  var safetyTimer = 0;
  var revealTimer = 0;
  var revealVersion = 0;
  var classes = ['is-transition-boot', 'is-transition-covering', 'is-transition-revealing'];

  function reset() {
    clearTimeout(navigationTimer);
    clearTimeout(safetyTimer);
    clearTimeout(revealTimer);
    revealVersion++;
    busy = false;
    classes.forEach(function (name) { root.classList.remove(name); });
  }

  // This script runs in the head: the first paint already has the curtain.
  // No storage dependency, so private mode works too. A failsafe releases it
  // even if document parsing or font loading is interrupted.
  if (!reduced.matches) {
    root.classList.add('is-transition-boot');
    safetyTimer = setTimeout(reset, 1600);
  }

  function reveal() {
    reset();
    if (reduced.matches) return;
    root.classList.add('is-transition-revealing');
    revealTimer = setTimeout(reset, 430);
  }

  function start() {
    var curtain = document.querySelector('.page-transition');
    if (!curtain) { reset(); return; }
    var version = revealVersion;
    var fontBudget = new Promise(function (resolve) { setTimeout(resolve, 250); });
    var fonts = document.fonts ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    Promise.race([fonts, fontBudget]).then(function () {
      if (version === revealVersion && !busy) reveal();
    });

    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
      var link = event.target.closest && event.target.closest('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.hasAttribute('data-no-transition')) return;
      var url = new URL(link.href, location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
      var normalize = function (path) { return path.replace(/index\.html$/, '').replace(/\/$/, ''); };
      // Anchors, current-page links and query-only changes keep native behavior.
      if (normalize(url.pathname) === normalize(location.pathname)) return;
      // Animate only pages that share this curtain, never assets or embeds.
      var relative = url.pathname.slice(siteBase.pathname.length);
      if (!url.pathname.startsWith(siteBase.pathname) || !(relative === '' || relative === 'index.html' || /^projects\/[^/]+\/(?:index\.html)?$/.test(relative))) return;
      if (busy) { event.preventDefault(); return; }
      reset();
      root.classList.add('is-transition-covering');
      // If the CSS failed, leave navigation entirely native.
      if (getComputedStyle(curtain).display === 'none') { reset(); return; }
      event.preventDefault();
      busy = true;
      navigationTimer = setTimeout(function () { location.assign(url.href); }, 380);
      // A canceled or stalled navigation must never leave a blocking overlay.
      safetyTimer = setTimeout(reset, 4500);
    });
  }

  document.addEventListener('DOMContentLoaded', start, { once: true });
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) reset(); // BFCache restores the actual scroll position.
  });
  reduced.addEventListener('change', function () {
    // Let an already scheduled navigation finish; only remove the motion.
    if (busy) classes.forEach(function (name) { root.classList.remove(name); });
    else reset();
  });
})();
