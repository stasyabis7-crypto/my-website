/* Лёгкий тактильный отклик для touch-интерфейсов. Браузеры без
   Vibration API (включая Safari на iPhone/iPad) безопасно пропускают его. */
(function () {
  var TARGETS = 'a[href], button, summary, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
  var DURATION_MS = 12;

  function isTouchLike() {
    return (navigator.maxTouchPoints || 0) > 0 ||
      window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  function vibrate() {
    if (!isTouchLike() || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(DURATION_MS);
  }

  function connect(doc) {
    if (!doc || doc.__hapticsReady) return;
    doc.__hapticsReady = true;
    doc.addEventListener('pointerup', function (event) {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      var target = event.target && event.target.closest && event.target.closest(TARGETS);
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
      vibrate();
    }, { capture: true, passive: true });
  }

  function connectFrame(frame) {
    function onLoad() {
      try { connect(frame.contentDocument); } catch (error) { /* cross-origin */ }
    }
    frame.addEventListener('load', onLoad);
    onLoad();
  }

  connect(document);
  document.querySelectorAll('iframe').forEach(connectFrame);
})();
