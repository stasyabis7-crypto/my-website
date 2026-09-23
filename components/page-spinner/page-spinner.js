(function () {
  'use strict';
  // Shared page bundles must never register a second controller.
  if (window.__pageSpinnerInitialized) return;
  window.__pageSpinnerInitialized = true;
  var root = document.documentElement;
  // Resolve from this script so / and subdirectory previews work identically.
  var siteBase = new URL('../../', document.currentScript.src);
  var overlay;
  var text;
  var phraseTimer = 0;
  var phrases = ['Загружаем…', 'Собираем страницу…', 'Расставляем пиксели…', 'Ещё немного…', 'Почти готово…'];
  var phraseIndex = 0;
  var MIN_VISIBLE = 300;
  var shownAt = 0;
  var handoffKey = 'page-spinner:' + siteBase.pathname;

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

  // instant: the previous page already showed the spinner, so this document
  // continues it without a second fade-in (one loading screen per navigation).
  function show(instant, startIndex) {
    build();
    phraseIndex = startIndex || 0;
    nextPhrase();
    clearInterval(phraseTimer);
    phraseTimer = setInterval(nextPhrase, 2200);
    shownAt = Date.now();
    overlay.classList.toggle('is-instant', !!instant);
    // Force a frame so the fade-in transition runs from the hidden state.
    void overlay.offsetWidth;
    overlay.classList.add('is-visible');
    if (instant) requestAnimationFrame(function () { overlay.classList.remove('is-instant'); });
  }

  function hide() {
    if (!overlay || !overlay.classList.contains('is-visible')) return;
    // Never blink: once shown, stay for a moment before fading out.
    var wait = Math.max(0, MIN_VISIBLE - (Date.now() - shownAt));
    setTimeout(function () {
      clearInterval(phraseTimer);
      overlay.classList.remove('is-visible');
    }, wait);
  }

  // Leaving while the spinner is on screen: tell the next page to keep it.
  window.addEventListener('pagehide', function () {
    try {
      if (overlay && overlay.classList.contains('is-visible')) {
        sessionStorage.setItem(handoffKey, JSON.stringify({ at: Date.now(), index: phraseIndex }));
      }
    } catch (_) { /* Storage is optional. */ }
  });
  var handoff = null;
  try {
    handoff = JSON.parse(sessionStorage.getItem(handoffKey) || 'null');
    sessionStorage.removeItem(handoffKey);
  } catch (_) { /* Without storage each page decides on its own. */ }
  var continued = !!(handoff && Date.now() - handoff.at < 8000);

  // Any document that is still loading starts behind the spinner.
  if (document.readyState !== 'complete') {
    // Shown from the very first paint (instantly, continuing the previous
    // page's spinner when there was one), so content never flashes in first.
    show(true, continued ? handoff.index : 0);
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

  // Bubble phase: a page handler that cancels the navigation (drag, lightbox)
  // has already called preventDefault by now, so no spinner is left hanging.
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[href]');
    var url = destination(link);
    if (!url) return;
    // Navigation stays native; the spinner starts turning right at the click
    // and keeps turning until the next page has loaded.
    show(false, 0);
    // A cancelled or stalled navigation must never leave the overlay up.
    setTimeout(hide, 10000);
  });

  // A restored bfcache page must not keep the overlay from the outgoing visit.
  window.addEventListener('pageshow', function (event) { if (event.persisted) hide(); });
})();
