/*
  Кейсы — поведение блоков из case-blocks.css.
  - Счётчик чисел в карточках метрик (.case-metric__value): при попадании
    карточки во вьюпорт цифры "досчитывают" от 0 до финального значения
    из разметки. Работает с любым текстом, где есть числа — регуляркой
    находит их в строке и анимирует каждое отдельно, не трогая остальной
    текст (суффиксы вроде "тыс.", префиксы вроде "До") и сохраняя число
    знаков после запятой ("1,5–3 тыс." → анимируются и 1,5, и 3).
    Без JS/при prefers-reduced-motion просто остаётся финальный текст
    из разметки — анимация не обязательна для восприятия контента.
*/
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.case-metric__value');
  if (!els.length || reduced || !('IntersectionObserver' in window)) return;

  var NUMBER_RE = /\d+(?:,\d+)?/g;
  var DURATION = 1200;

  function animate(el) {
    var final = el.textContent;
    var matches = final.match(NUMBER_RE);
    if (!matches) return;

    var targets = matches.map(function (m) { return parseFloat(m.replace(',', '.')); });
    var decimals = matches.map(function (m) {
      var i = m.indexOf(',');
      return i === -1 ? 0 : m.length - i - 1;
    });

    var start = null;
    el.classList.add('is-counting');

    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / DURATION, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var i = 0;
      el.textContent = final.replace(NUMBER_RE, function () {
        var text = (targets[i] * eased).toFixed(decimals[i]).replace('.', ',');
        i++;
        return text;
      });
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = final;
        el.classList.remove('is-counting');
      }
    }

    requestAnimationFrame(frame);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animate(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  els.forEach(function (el) { io.observe(el); });
})();
