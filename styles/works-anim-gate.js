/*
  Ставит анимации встроенных проектов (works-grid__embed-frame) на паузу,
  пока плитка не видна на экране, и включает обратно, когда она снова
  попадает в область просмотра.

  Зачем: у части проектов внутри — бесконечный requestAnimationFrame-цикл
  (см. ../works/shared/raf-gate.js), который без этого крутится вечно, даже
  когда плитку давно проскроллили мимо. Десятки таких циклов одновременно —
  ощутимая нагрузка на память/CPU, и именно из-за неё на телефоне браузер
  иногда сам перезагружает вкладку (выглядит как "сайт сбрасывается").

  iframe у нас все одного происхождения (относительные пути того же
  сайта), поэтому можно напрямую звать __setAnimPaused у contentWindow —
  без postMessage. Если у конкретной страницы проекта нет raf-gate.js
  (статичная анимация или её вообще нет), вызов просто не находит функцию
  и ничего не делает — безопасно для всех 55 плиток разом.
*/
(function () {
  if (typeof IntersectionObserver === 'undefined') return;

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

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        setPaused(entry.target, !entry.isIntersecting);
      });
    },
    { rootMargin: '200px 0px' }
  );

  var targets = document.querySelectorAll('.works-grid__embed-frame, .works-grid__video');
  targets.forEach(function (el) {
    observer.observe(el);
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
})();
