(function () {
  'use strict';
  // Shared page bundles must never register a second transition controller.
  if (window.__pageTransitionInitialized) return;
  window.__pageTransitionInitialized = true;
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
  var classes = ['is-transition-pending', 'is-transition-boot', 'is-transition-covering', 'is-transition-revealing'];

  function pageKey(href) {
    var url = new URL(href, location.href);
    return url.origin + url.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + url.search;
  }

  try {
    var handoff = JSON.parse(sessionStorage.getItem(handoffKey) || 'null');
    sessionStorage.removeItem(handoffKey);
    var navigation = performance.getEntriesByType('navigation')[0];
    // This one-use handoff was consumed above. A slow document response must
    // not expire it and replay the cover animation on the destination page.
    incoming = !!(handoff && handoff.page === pageKey(location.href) &&
      (!navigation || navigation.type === 'navigate'));
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
    // This blocking head script hides the new document before its first paint.
    // Outgoing navigation does not use pending: it covers the current page.
    root.classList.add('is-transition-pending', incoming ? 'is-transition-boot' : 'is-transition-covering');
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
    if (!url.pathname.startsWith(siteBase.pathname) || !(relative === '' || relative === 'index.html' || /^projects\/(?:[^/]+\/)+(?:index\.html)?$/.test(relative))) return;
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
    var version = revealVersion;
    // Release the prepared hero on the actual last ribbon frame, without an
    // additional timeout gap. Keep a fallback for unavailable animation APIs.
    if (curtain.getAnimations) {
      Promise.all(curtain.getAnimations({ subtree: true }).map(function (animation) {
        return animation.finished.catch(function () {});
      })).then(function () { if (version === revealVersion) reset(); });
    } else {
      revealTimer = setTimeout(reset, duration('reveal', 850) + 2 * duration('stagger', 90));
    }
  }

  function imageReady(image) {
    // A lazy image under the curtain still needs to start loading now.
    image.loading = 'eager';
    return new Promise(function (resolve) {
      function settled() {
        image.removeEventListener('load', settled);
        image.removeEventListener('error', settled);
        if (image.naturalWidth && image.decode) image.decode().catch(function () {}).then(resolve);
        else resolve(); // A failed image must not trap the visitor behind the curtain.
      }
      if (image.complete) { settled(); return; }
      image.addEventListener('load', settled);
      image.addEventListener('error', settled);
    });
  }

  async function viewportImagesReady(version) {
    var checked = new WeakSet();
    while (version === revealVersion && !reduced.matches) {
      // Let page scripts, anchor positioning and decoded images settle layout.
      await new Promise(function (resolve) { requestAnimationFrame(resolve); });
      var images = Array.from(document.images).filter(function (image) {
        if (checked.has(image)) return false;
        var rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
          rect.top < innerHeight && rect.left < innerWidth;
      });
      if (!images.length) return;
      await Promise.all(images.map(function (image) {
        checked.add(image);
        return imageReady(image);
      }));
    }
  }

  function start() {
    curtain = document.querySelector('.page-transition');
    if (!curtain) { reset(); return; }
    // Visible images, rather than a fixed timer, decide when to reveal.
    var version = revealVersion;
    var fontBudget = new Promise(function (resolve) { setTimeout(resolve, 700); });
    var entranceTime = incoming ? 320 : duration('cover', 800) + 2 * duration('stagger', 90) + 120;
    var hold = new Promise(function (resolve) { setTimeout(resolve, entranceTime); });
    var fonts = document.fonts ? document.fonts.ready.catch(function () {}) : Promise.resolve();
    Promise.all([hold, Promise.race([fonts, fontBudget])]).then(function () {
      return Promise.all([window.projectHeroReady, viewportImagesReady(version)]);
    }).then(function () {
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
