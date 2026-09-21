(function () {
  'use strict';
  // Shared page bundles must never register a second controller.
  if (window.__pageSpinnerInitialized) return;
  window.__pageSpinnerInitialized = true;
  var root = document.documentElement;
  // Resolve from this script so / and subdirectory previews work identically.
  var siteBase = new URL('../../', document.currentScript.src);
  var pointer = null;
  var overlay;
  var text;
  var showTimer = 0;
  var phraseTimer = 0;
  var phrases = ['Загружаем…', 'Собираем страницу…', 'Расставляем пиксели…', 'Ещё немного…', 'Почти готово…'];
  var phraseIndex = 0;
  var SHOW_DELAY = 450;

  function pageKey(href) {
    var url = new URL(href, location.href);
    return url.origin + url.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + url.search;
  }

  // The custom cursor dot keeps its position across a real navigation: it is
  // handed over through sessionStorage so the next page shows it at once.
  var cursorKey = 'mood-cursor:' + siteBase.pathname;
  try {
    var carried = JSON.parse(sessionStorage.getItem(cursorKey) || 'null');
    sessionStorage.removeItem(cursorKey);
    var entry = performance.getEntriesByType('navigation')[0];
    if (carried && carried.cursor && carried.page === pageKey(location.href) &&
        Date.now() - carried.at < 10000 && (!entry || entry.type === 'navigate')) {
      window.__pageTransitionCursor = carried.cursor;
    }
  } catch (_) { /* Without storage the dot appears on the next mouse move. */ }

  document.addEventListener('pointermove', function (event) {
    pointer = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY };
  }, { passive: true });

  function build() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'page-spinner';
    overlay.setAttribute('role', 'status');
    overlay.innerHTML = '<span class="page-spinner__ring" aria-hidden="true"></span><p class="page-spinner__text"></p>';
    text = overlay.lastChild;
    root.appendChild(overlay);
    return overlay;
  }

  function nextPhrase() {
    text.textContent = phrases[phraseIndex % phrases.length];
    phraseIndex++;
  }

  function show() {
    build();
    phraseIndex = 0;
    nextPhrase();
    clearInterval(phraseTimer);
    phraseTimer = setInterval(nextPhrase, 2200);
    // Force a frame so the fade-in transition runs from the hidden state.
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');
  }

  function hide() {
    clearTimeout(showTimer);
    clearInterval(phraseTimer);
    if (overlay) overlay.classList.remove('is-visible');
  }

  // First visit: show only if the page is still not ready after a moment.
  if (document.readyState !== 'complete') {
    showTimer = setTimeout(show, SHOW_DELAY);
    window.addEventListener('load', hide, { once: true });
    // A stalled subresource must never trap the visitor behind the overlay.
    setTimeout(hide, 10000);
  }

  function destination(link) {
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    var normalize = function (path) { return path.replace(/index\.html$/, '').replace(/\/$/, ''); };
    if (normalize(url.pathname) === normalize(location.pathname)) return;
    return url;
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[href]');
    var url = destination(link);
    if (!url) return;
    try {
      if (pointer && root.classList.contains('has-dot-cursor')) {
        sessionStorage.setItem(cursorKey, JSON.stringify({ page: pageKey(url.href), cursor: pointer, at: Date.now() }));
      }
    } catch (_) { /* Storage is optional. */ }
    // Navigation stays native; the spinner appears only if it drags on.
    clearTimeout(showTimer);
    showTimer = setTimeout(show, SHOW_DELAY);
    setTimeout(hide, 10000);
  }, true);

  // A restored bfcache page must not keep the overlay from the outgoing visit.
  window.addEventListener('pageshow', function (event) { if (event.persisted) hide(); });
})();
