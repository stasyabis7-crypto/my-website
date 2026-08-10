/*
  Патчит requestAnimationFrame/cancelAnimationFrame внутри страницы проекта,
  чтобы родительская галерея (см. works-anim-gate.js) могла ставить
  бесконечный rAF-цикл анимации на паузу, когда плитка со встроенным iframe
  уходит за пределы экрана, и включать обратно, когда она снова видна.

  Без этого все анимированные проекты крутятся вечно и одновременно, даже
  невидимые (loading="lazy" откладывает только первую загрузку iframe, не
  то, что происходит после неё) — на телефоне это быстро съедает память,
  и мобильный браузер в ответ молча перезагружает вкладку (см. чат).

  Подключать синхронным (не defer/async) тегом в <head>, ДО собственного
  animation-скрипта страницы — иначе он успеет захватить неподменённый
  requestAnimationFrame.
*/
(function () {
  var nativeRAF = window.requestAnimationFrame.bind(window);
  var nativeCAF = window.cancelAnimationFrame.bind(window);
  var paused = false;
  var pending = {};
  var nextFakeId = -1; // отрицательные — не пересекаются с настоящими id браузера

  window.requestAnimationFrame = function (cb) {
    if (!paused) return nativeRAF(cb);
    var id = nextFakeId--;
    pending[id] = cb;
    return id;
  };

  window.cancelAnimationFrame = function (id) {
    if (id in pending) { delete pending[id]; return; }
    nativeCAF(id);
  };

  window.__setAnimPaused = function (next) {
    next = !!next;
    if (next === paused) return;
    paused = next;
    if (!paused) {
      var queued = pending;
      pending = {};
      Object.keys(queued).forEach(function (id) { nativeRAF(queued[id]); });
    }
  };
})();
