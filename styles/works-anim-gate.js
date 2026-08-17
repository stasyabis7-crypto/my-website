/*
  Два уровня "гашения" встроенных проектов (works-grid__embed-frame),
  пока плитка не видна на экране, и восстановления, когда она снова
  попадает в область просмотра.

  Зачем два уровня: паузы rAF-цикла (см. ../works/shared/raf-gate.js)
  достаточно, чтобы не жечь CPU впустую, но iframe при этом остаётся
  полностью загруженным документом (DOM + canvas) навсегда — память под
  него не освобождается, даже когда плитку давно проскроллили мимо. На
  странице ~26 таких iframe разом, страница на телефоне высотой в
  несколько экранов — суммарная память по мере скролла только растёт.
  Именно накопленная память, а не CPU, чаще всего и есть причина, по
  которой мобильный браузер сам перезагружает вкладку (выглядит как
  "сайт сбрасывается") — пауза одна эту причину не убирает.

  Поэтому: ближний уровень (rootMargin PAUSE_MARGIN) паузит/включает
  rAF, как раньше — для плиток, которые всё ещё близко и могут скоро
  понадобиться. Дальний уровень (rootMargin UNLOAD_MARGIN, заметно
  шире) при выходе плитки далеко за экран очищает src iframe
  (about:blank) — браузер выгружает документ и освобождает память — а
  при возврате в эту широкую зону восстанавливает src из data-src и
  анимация стартует заново с нуля (это ожидаемо: плитка была не видна).
  Небольшая задержка перед выгрузкой (UNLOAD_DELAY) гасит дребезг при
  быстрой прокрутке туда-обратно у самой границы.

  iframe у нас все одного происхождения (относительные пути того же
  сайта), поэтому можно напрямую звать __setAnimPaused у contentWindow —
  без postMessage. Если у конкретной страницы проекта нет raf-gate.js
  (статичная анимация или её вообще нет), вызов просто не находит функцию
  и ничего не делает — безопасно для всех плиток разом.
*/
(function () {
  if (typeof IntersectionObserver === 'undefined') return;

  var PAUSE_MARGIN = '200px 0px';
  // Была 1200px — на телефоне это всё ещё оставляло одновременно
  // загруженными больше плиток, чем Safari готов держать в памяти
  // (по факту ~3-5 "страниц" разом, дальше — сам сбрасывает вкладку).
  // Уже к 400px гораздо меньше live-iframe одновременно, и меньше
  // залпового пересоздания плиток при быстрой прокрутке.
  var UNLOAD_MARGIN = '400px 0px';
  var UNLOAD_DELAY = 600;

  function setPaused(el, paused) {
    try {
      if (el.tagName === 'VIDEO') {
        if (paused) el.pause();
        else el.play().catch(function () {});
        return;
      }
      var win = el.contentWindow;
      if (win && typeof win.__setAnimPaused === 'function') win.__setAnimPaused(paused);
    } catch (_) {
      // кросс-origin или iframe ещё не готов — просто пропускаем
    }
  }

  var pauseObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        setPaused(entry.target, !entry.isIntersecting);
      });
    },
    { rootMargin: PAUSE_MARGIN }
  );

  var targets = document.querySelectorAll('.works-grid__embed-frame, .works-grid__video');
  targets.forEach(function (el) {
    pauseObserver.observe(el);
    // На случай, если iframe ещё не отдал contentWindow к моменту первого
    // срабатывания observer — досинкать состояние после загрузки.
    if (el.tagName !== 'VIDEO') {
      el.addEventListener('load', function () {
        var rect = el.getBoundingClientRect();
        var inView = rect.bottom > -200 && rect.top < window.innerHeight + 200;
        setPaused(el, !inView);
      });
    }
  });

  // Дальний уровень — только iframe (видео не накапливается так же:
  // одна плитка на всю страницу, отдельный документ не создаёт).
  var frames = document.querySelectorAll('.works-grid__embed-frame');
  var unloadTimers = new WeakMap();

  function unload(frame) {
    if (frame.getAttribute('src') === 'about:blank') return;
    frame.src = 'about:blank';
  }

  function reload(frame) {
    var original = frame.dataset.src;
    if (!original || frame.getAttribute('src') === original) return;
    frame.src = original;
  }

  var unloadObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var frame = entry.target;
        var pending = unloadTimers.get(frame);
        if (pending) clearTimeout(pending);

        if (entry.isIntersecting) {
          unloadTimers.delete(frame);
          reload(frame);
        } else {
          var timer = setTimeout(function () {
            unloadTimers.delete(frame);
            unload(frame);
          }, UNLOAD_DELAY);
          unloadTimers.set(frame, timer);
        }
      });
    },
    { rootMargin: UNLOAD_MARGIN }
  );

  frames.forEach(function (frame) {
    // dataset.src может быть уже выставлен works-paginate.js (мобилка,
    // плитки за пределами текущей порции ещё не получили src в атрибут,
    // см. этот файл) — тогда берём готовое значение, а не пустую строку
    // из ещё не загруженного src.
    frame.dataset.src = frame.dataset.src || frame.getAttribute('src') || '';
    unloadObserver.observe(frame);
  });
})();
