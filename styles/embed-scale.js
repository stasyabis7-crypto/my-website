/*
  Масштабирует встроенные iframe-превью карточек-проектов (см.
  .works-grid__embed в works-grid.css) под реальную ширину карточки.

  Проектные страницы (works/*.html) — самостоятельные HTML-документы
  с фиксированным нативным размером (data-native-w/h на iframe).
  Вместо того чтобы лезть внутрь чужого документа и переписывать его
  под резиновую вёрстку, iframe рисуется в родном пиксельном размере
  и целиком сжимается через transform: scale() — тот же приём, что и
  в storybook-вьюере typography.
*/
(function () {
  function sync(frame) {
    var wrap = frame.parentElement;
    if (!wrap) return;
    var nativeW = parseFloat(frame.getAttribute('data-native-w')) || frame.offsetWidth || 1;
    var nativeH = parseFloat(frame.getAttribute('data-native-h')) || frame.offsetHeight || 1;
    var scale = wrap.clientWidth / nativeW;

    frame.style.width = nativeW + 'px';
    frame.style.height = nativeH + 'px';
    frame.style.transform = 'scale(' + scale + ')';
  }

  document.querySelectorAll('.works-grid__embed-frame').forEach(function (frame) {
    var wrap = frame.parentElement;
    if (!wrap) return;

    var resync = function () { sync(frame); };
    resync();

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(resync).observe(wrap);
    } else {
      window.addEventListener('resize', resync);
    }
  });
})();
