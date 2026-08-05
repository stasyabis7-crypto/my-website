/*
  Масштабирует встроенные iframe-превью карточек-проектов (см.
  .works-grid__embed в works-grid.css) под реальный размер карточки.

  Проектные страницы (works/*.html) — самостоятельные HTML-документы
  с фиксированным нативным размером (data-native-w/h на iframe).
  Вместо того чтобы лезть внутрь чужого документа и переписывать его
  под резиновую вёрстку, iframe рисуется в родном пиксельном размере
  и целиком сжимается через transform: scale() — тот же приём, что и
  в storybook-вьюере typography.

  Масштаб — по МЕНЬШЕЙ из двух осей (contain), не только по ширине:
  у карточек теперь фиксированные формы (квадрат/широкая/высокая, см.
  works-grid.css), и нативная пропорция анимации часто не совпадает с
  формой слота, в который её поставили. Раньше масштаб считался только
  от ширины — если пропорции расходились, анимация либо вылезала за
  нижний край карточки (обрезалась overflow:hidden, невидимая часть
  просто терялась), либо не дотягивала до низа, оставляя пустую полосу
  фона карточки снизу — и то, и другое почти всегда выглядело как
  случайный обрез, а не как решение. Contain гарантирует, что анимация
  целиком помещается в карточку по обеим осям, а center (см. left/top
  ниже) кладёт лишнее поле поровну по краям, а не всё в один угол.
*/
(function () {
  function sync(frame) {
    var wrap = frame.parentElement;
    if (!wrap) return;
    var nativeW = parseFloat(frame.getAttribute('data-native-w')) || frame.offsetWidth || 1;
    var nativeH = parseFloat(frame.getAttribute('data-native-h')) || frame.offsetHeight || 1;
    var wrapW = wrap.clientWidth;
    var wrapH = wrap.clientHeight;
    var scale = Math.min(wrapW / nativeW, wrapH / nativeH);

    frame.style.width = nativeW + 'px';
    frame.style.height = nativeH + 'px';
    frame.style.left = (wrapW - nativeW * scale) / 2 + 'px';
    frame.style.top = (wrapH - nativeH * scale) / 2 + 'px';
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
