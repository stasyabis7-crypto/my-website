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
  var curtain;
  var warmed = new Set();
  var handoffKey = 'mood-transition:' + siteBase.pathname;
  var incoming = false;
  var classes = ['is-transition-boot', 'is-transition-covering', 'is-transition-revealing'];

  function pageKey(href) {
    var url = new URL(href, location.href);
    return url.origin + url.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + url.search;
  }

  try {
    var handoff = JSON.parse(sessionStorage.getItem(handoffKey) || 'null');
    sessionStorage.removeItem(handoffKey);
    var navigation = performance.getEntriesByType('navigation')[0];
    incoming = !!(handoff && handoff.page === pageKey(location.href) &&
      Date.now() - handoff.at < 15000 && (!navigation || navigation.type === 'navigate'));
  } catch (_) { /* Without storage, use the complete entrance/exit sequence. */ }

  function reset() {
    clearTimeout(navigationTimer);
    clearTimeout(safetyTimer);
    clearTimeout(revealTimer);
    revealVersion++;
    busy = false;
    classes.forEach(function (name) { root.classList.remove(name); });
  }

  // Only a navigation whose source has already covered the screen starts
  // covered. Direct visits and reloads begin with ribbons offscreen and play
  // the entire entrance, hold and exit sequence.
  if (!reduced.matches) {
    root.classList.add(incoming ? 'is-transition-boot' : 'is-transition-covering');
    safetyTimer = setTimeout(reset, 4000);
  }

  function duration(name, fallback) {
    return Number(getComputedStyle(curtain).getPropertyValue('--transition-' + name + '-ms')) || fallback;
  }

  function destination(link) {
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.hasAttribute('data-no-transition')) return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    var normalize = function (path) { return path.replace(/index\.html$/, '').replace(/\/$/, ''); };
    if (normalize(url.pathname) === normalize(location.pathname)) return;
    var relative = url.pathname.slice(siteBase.pathname.length);
    if (!url.pathname.startsWith(siteBase.pathname) || !(relative === '' || relative === 'index.html' || /^projects\/[^/]+\/(?:index\.html)?$/.test(relative))) return;
    return url;
  }

  function warm(url) {
    var href = new URL(url.href);
    href.hash = '';
    if (warmed.has(href.href)) return;
    warmed.add(href.href);
    var hint = document.createElement('link');
    // Prefetch downloads the document while the outgoing ribbons are moving.
    // Safari versions without document prefetch warm the HTTP cache via fetch.
    if (hint.relList && hint.relList.supports && hint.relList.supports('prefetch')) {
      hint.rel = 'prefetch';
      hint.as = 'document';
      hint.href = href.href;
      document.head.appendChild(hint);
    } else {
      fetch(href.href, { credentials: 'same-origin' }).then(function (response) {
        return response.arrayBuffer();
      }).catch(function () { warmed.delete(href.href); });
    }
  }

  function reveal() {
    reset();
    if (reduced.matches) return;
    root.classList.add('is-transition-revealing');
    revealTimer = setTimeout(reset, duration('reveal', 850) + 2 * duration('stagger', 90) + 50);
  }

  function start() {
    curtain = document.querySelector('.page-transition');
    if (!curtain) { reset(); return; }
    var version = revealVersion;
    var fontBudget = new Promise(function (resolve) { setTimeout(resolve, 700); });
    var entranceTime = incoming ? 320 : duration('cover', 800) + 2 * duration('stagger', 90) + 120;
    var hold = new Promise(function (resolve) { setTimeout(resolve, entranceTime); });
    var fonts = document.fonts ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    Promise.all([hold, Promise.race([fonts, fontBudget])]).then(function () {
      if (version === revealVersion && !busy) reveal();
    });

    ['pointerover', 'focusin'].forEach(function (name) {
      document.addEventListener(name, function (event) {
        if (navigator.connection && navigator.connection.saveData) return;
        var url = destination(event.target.closest && event.target.closest('a[href]'));
        if (url) warm(url);
      }, { passive: true });
    });

    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
      var link = event.target.closest && event.target.closest('a[href]');
      var url = destination(link);
      if (!url) return;
      if (busy) { event.preventDefault(); return; }
      reset();
      root.classList.add('is-transition-covering');
      // If the CSS failed, leave navigation entirely native.
      if (getComputedStyle(curtain).display === 'none') { reset(); return; }
      event.preventDefault();
      busy = true;
      warm(url);
      // All three ribbons finish, then rest briefly at full coverage.
      navigationTimer = setTimeout(function () {
        try {
          sessionStorage.setItem(handoffKey, JSON.stringify({ page: pageKey(url.href), at: Date.now() }));
        } catch (_) { /* Navigation still works when storage is disabled. */ }
        location.assign(url.href);
      }, duration('cover', 800) + 2 * duration('stagger', 90) + 120);
      // A canceled or stalled navigation must never leave a blocking overlay.
      safetyTimer = setTimeout(reset, 8000);
    });
  }

  document.addEventListener('DOMContentLoaded', start, { once: true });
  window.addEventListener('pagehide', function () {
    clearTimeout(navigationTimer);
    clearTimeout(safetyTimer);
    clearTimeout(revealTimer);
    revealVersion++;
    // Keep the solid curtain on the outgoing document until the browser swaps
    // it. Clearing classes here used to expose the old page for one frame.
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) reset(); // BFCache restores the actual scroll position.
  });
  reduced.addEventListener('change', function () {
    // Let an already scheduled navigation finish; only remove the motion.
    if (busy) classes.forEach(function (name) { root.classList.remove(name); });
    else reset();
  });
})();
