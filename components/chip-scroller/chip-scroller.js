/* Строки чипов: показывает стрелки/растворение только с той стороны, куда
   ещё можно прокрутить. Работает и для строк, добавленных позже —
   window.chipScroller.init(root). */
(function () {
  'use strict';
  var observer = 'ResizeObserver' in window ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) { update(entry.target.closest('[data-chip-scroller]')); });
  }) : null;

  function update(scroller) {
    if (!scroller) return;
    var track = scroller.querySelector('.chip-scroller__track');
    var max = track.scrollWidth - track.clientWidth;
    var before = track.scrollLeft > 1;
    var after = track.scrollLeft < max - 1;
    scroller.classList.toggle('has-before', before);
    scroller.classList.toggle('has-after', after);
    var prev = scroller.querySelector('.chip-scroller__arrow--prev');
    var next = scroller.querySelector('.chip-scroller__arrow--next');
    if (prev) prev.hidden = !before;
    if (next) next.hidden = !after;
  }

  function setup(scroller) {
    if (scroller.dataset.chipScrollerReady) { update(scroller); return; }
    scroller.dataset.chipScrollerReady = '1';
    var track = scroller.querySelector('.chip-scroller__track');
    track.addEventListener('scroll', function () { update(scroller); }, { passive: true });
    scroller.querySelectorAll('.chip-scroller__arrow').forEach(function (arrow) {
      arrow.addEventListener('click', function () {
        var direction = arrow.classList.contains('chip-scroller__arrow--prev') ? -1 : 1;
        track.scrollBy({ left: direction * track.clientWidth * 0.8 });
      });
    });
    if (observer) observer.observe(track);
    update(scroller);
  }

  function init(root) {
    (root || document).querySelectorAll('[data-chip-scroller]').forEach(setup);
  }

  window.chipScroller = { init: init, update: update };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  window.addEventListener('load', function () { init(); });
})();
