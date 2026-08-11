/*
  Переключение темы: dark ⇄ light, выбор хранится в localStorage.
  Дефолт (ничего не сохранено) — тёмная, независимо от системной темы
  (так и задумано, не читаем prefers-color-scheme).

  Ставим data-theme на <html> сразу, в первой же строчке скрипта — до
  того, как отрисуется остальная страница, — чтобы не было вспышки
  светлой темы перед переключением на тёмную (FOUC). Поэтому этот файл
  подключается в <head> самым первым, ещё до ссылок на CSS.
*/
(function () {
  var STORAGE_KEY = 'theme';
  var root = document.documentElement;

  function readSaved() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeSaved(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  function syncToggleButton(theme) {
    var input = document.getElementById('theme-toggle');
    if (!input) return;
    var next = theme === 'dark' ? 'light' : 'dark';
    // Костяшка тумблера (луна/солнце) едет чистым CSS от :checked — см.
    // theme-toggle.css, тут только держим сам чекбокс синхронным с
    // текущей темой (важно при первом заходе со светлой сохранённой
    // темой — чекбокс по умолчанию unchecked).
    input.checked = theme === 'light';
    input.setAttribute(
      'aria-label',
      'Переключить на ' + (next === 'light' ? 'светлую' : 'тёмную') + ' тему'
    );
  }

  // Рассылка темы в iframe-анимации галереи (works/*/index.html,
  // см. works/shared/theme-sync.js) — они не видят data-theme
  // родителя сами, только через postMessage.
  function broadcastTheme(theme) {
    var frames = document.querySelectorAll('.works-grid__embed-frame');
    for (var i = 0; i < frames.length; i++) {
      try {
        frames[i].contentWindow.postMessage({ type: 'theme', theme: theme }, '*');
      } catch (e) {}
    }
  }

  // Некоторые превью галереи — не живой iframe, а заранее записанные
  // видео/картинки (см. index.html, слот 14): фон запечён в кадр,
  // поэтому под каждую тему свой файл (data-src-dark/data-src-light),
  // и при смене темы подменяем src, а не красим что-то через CSS.
  // <video> дополнительно нужно перезапустить (.load()+.play()) —
  // смена src на <img> достаточно сама по себе.
  //
  // Играть после свапа — не "если раньше играло" (el.paused в момент
  // смены темы врёт: works-anim-gate.js мог поставить на паузу плитку,
  // которая на самом деле в кадре, — .paused тут не совпадает с
  // "видна ли плитка сейчас"), а по фактической видимости прямо
  // сейчас — тот же допуск в 200px, что и у ближнего IntersectionObserver
  // в works-anim-gate.js, чтобы не разойтись с ним в трактовке "видно".
  function isNearViewport(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.bottom > -200 && rect.top < vh + 200;
  }

  function syncThemedVideos(theme) {
    var media = document.querySelectorAll('[data-src-dark][data-src-light]');
    for (var i = 0; i < media.length; i++) {
      var el = media[i];
      var next = theme === 'light' ? el.dataset.srcLight : el.dataset.srcDark;
      if (!next || el.getAttribute('src') === next) continue;
      if (el.tagName === 'VIDEO') {
        el.src = next;
        el.load();
        if (isNearViewport(el)) el.play().catch(function () {});
      } else {
        el.src = next;
      }
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    syncToggleButton(theme);
    broadcastTheme(theme);
    syncThemedVideos(theme);
  }

  apply(readSaved() === 'light' ? 'light' : 'dark');

  // Хендшейк с анимациями: каждая при своей загрузке шлёт "готова",
  // отвечаем ей одной текущей темой — так не важно, кто из них успел
  // подгрузиться раньше, а кто позже основной страницы.
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'theme-ready' && event.source) {
      event.source.postMessage(
        { type: 'theme', theme: root.getAttribute('data-theme') === 'light' ? 'light' : 'dark' },
        '*'
      );
    }
  });

  // Блик на стеклянных плашках (см. .theme-transitioning в theme.css) —
  // не крутится сам по себе постоянно, включаем на 1с только в момент
  // реальной смены темы (когда красятся сами плашки), а не на каждой
  // загрузке страницы.
  var shimmerTimer = null;
  function triggerGlassShimmer() {
    root.classList.remove('theme-transitioning');
    void root.offsetWidth; // рефлоу — иначе повторный клик подряд не перезапустит анимацию
    root.classList.add('theme-transitioning');
    clearTimeout(shimmerTimer);
    shimmerTimer = setTimeout(function () {
      root.classList.remove('theme-transitioning');
    }, 1000); // держите синхронно с длительностью glass-shimmer-sweep в theme.css
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Первый вызов apply() наверху файла отработал до того, как этот
    // <video> вообще появился в DOM (скрипт подключён в <head>) —
    // досинкаем src теперь, когда галерея уже отрисована.
    syncThemedVideos(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    var input = document.getElementById('theme-toggle');
    if (!input) return;

    syncToggleButton(root.getAttribute('data-theme'));

    input.addEventListener('change', function () {
      var next = input.checked ? 'light' : 'dark';
      apply(next);
      writeSaved(next);
      triggerGlassShimmer();
    });
  });
})();
