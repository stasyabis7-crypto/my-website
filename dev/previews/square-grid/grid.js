// Выпадающие списки шапки стенда: открываются по кнопке, закрываются по
// повторному нажатию, клику мимо и Escape.
(function () {
  'use strict';
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-drop]'));
  function close(except) {
    buttons.forEach(function (button) {
      if (button === except) return;
      button.setAttribute('aria-expanded', 'false');
      document.getElementById(button.dataset.drop).hidden = true;
    });
  }
  buttons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      var panel = document.getElementById(button.dataset.drop);
      var open = panel.hidden;
      close(button);
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.drop')) close();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') close();
  });

  // Блоки одной группы (обложка и её подпись) подсвечиваются вместе.
  function group(event, on) {
    var block = event.target.closest('[data-group]');
    if (!block) return;
    document.querySelectorAll('[data-group="' + block.dataset.group + '"]').forEach(function (item) {
      item.classList.toggle('is-hover', on);
    });
  }
  document.addEventListener('mouseover', function (event) { group(event, true); });
  document.addEventListener('mouseout', function (event) { group(event, false); });
  document.addEventListener('focusin', function (event) { group(event, true); });
  document.addEventListener('focusout', function (event) { group(event, false); });

  // Баннер: секторы фото по одному меняют стиль, текстовые квадраты — фон.
  var photos = Array.prototype.slice.call(document.querySelectorAll('.b--photo'));
  var tones = Array.prototype.slice.call(document.querySelectorAll('.b--tone'));
  if (photos.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var next = function (value, count) { return (value + 1 + Math.floor(Math.random() * (count - 1))) % count; };
    setInterval(function () {
      var cell = photos[Math.floor(Math.random() * photos.length)];
      cell.dataset.style = next(+cell.dataset.style, 7);
    }, 1300);
    setInterval(function () {
      var cell = tones[Math.floor(Math.random() * tones.length)];
      if (!cell) return;
      var others = tones.filter(function (item) { return item !== cell; }).map(function (item) { return +item.dataset.tone; });
      var tone = +cell.dataset.tone;
      do { tone = next(tone, 5); } while (others.indexOf(tone) !== -1);
      cell.dataset.tone = tone;
    }, 3200);
  }
})();
