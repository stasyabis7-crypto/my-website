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
})();
