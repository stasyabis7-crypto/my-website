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

/*
  Карусель метрик (.case-cover__metrics-scroll, ≤900px), колонок роли
  (.case-role__cols-scroll, 641–900px, case-blocks.css) — общий
  код: fade-градиенты по краям видны только пока с этой стороны
  действительно есть карточка/колонка, уходящая за сетку: .is-at-start
  снимает левый градиент (первый элемент стоит по сетке, дальше
  скроллить некуда), .is-at-end — правый (последний элемент по сетке).
  В середине (оба края выглядывают за экран) видны оба.
*/
(function () {
  'use strict';

  var EPS = 2;

  document.querySelectorAll('.case-cover__metrics-scroll, .case-role__cols-scroll').forEach(function (wrap) {
    var track = wrap.querySelector('.case-cover__metrics, .case-role__cols');
    if (!track) return;

    function update() {
      var atStart = track.scrollLeft <= EPS;
      var atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - EPS;
      wrap.classList.toggle('is-at-start', atStart);
      wrap.classList.toggle('is-at-end', atEnd);
    }

    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();


/* Стопка команды: автоматическое перелистывание и клик по колоде, без свайпа. */
(function () {
  'use strict';
  document.querySelectorAll('.case-team__carousel').forEach(function (carousel) {
    var cards = Array.from(carousel.querySelectorAll('.case-team__card'));
    if (cards.length < 2) return;
    var next = carousel.querySelector('[data-team-next]');
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var active = 0, busy = false, visible = false, paused = motion.matches;
    var timer;

    function render() {
      cards.forEach(function (card, i) {
        var position = (i - active + cards.length) % cards.length;
        card.dataset.position = position;
        card.setAttribute('aria-hidden', String(position !== 0));
        if (position === 0) next.setAttribute('aria-label', card.querySelector('h3').textContent + ', ' + (i + 1) + ' из ' + cards.length + '. Следующая карточка команды');
      });
    }
    function schedule() {
      clearTimeout(timer);
      if (!paused && visible && !document.hidden &&
          !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
        timer = setTimeout(advance, 4500);
      }
    }
    function advance() {
      if (busy) return;
      clearTimeout(timer);
      busy = true;
      var outgoing = cards[active];
      outgoing.classList.add('is-leaving');
      setTimeout(function () {
        active = (active + 1) % cards.length;
        render();
        outgoing.classList.remove('is-leaving');
        busy = false;
        schedule();
      }, motion.matches ? 0 : 650);
    }
    next.addEventListener('click', advance);
    carousel.addEventListener('mouseenter', schedule);
    carousel.addEventListener('mouseleave', schedule);
    carousel.addEventListener('focusin', schedule);
    carousel.addEventListener('focusout', function () { setTimeout(schedule, 0); });
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', function () {
      paused = motion.matches;
      schedule();
    });
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0.5 }).observe(carousel);
    render();
    carousel.classList.add('is-ready');
    var deck = carousel.querySelector('.case-team__cards');
    new ResizeObserver(function () {
      next.style.setProperty('--control-surface-height', deck.offsetHeight + 'px');
    }).observe(deck);
    next.hidden = false;
  });
})();


/* Run the scenario only while it is visible. CSS owns every animation frame. */
(function () {
  'use strict';
  var scenarios = document.querySelectorAll('.case-scenario');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!scenarios.length || !('IntersectionObserver' in window)) return;
  function sync(section) {
    var paused = !section.dataset.inView || document.hidden || reduced.matches;
    if (!paused) section.classList.add('is-running');
    section.classList.toggle('is-paused', paused);
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.dataset.inView = 'true';
      else delete entry.target.dataset.inView;
      sync(entry.target);
    });
  }, { threshold: .15 });
  scenarios.forEach(function (section) { observer.observe(section); });
  function syncAll() { scenarios.forEach(sync); }
  document.addEventListener('visibilitychange', syncAll);
  reduced.addEventListener('change', syncAll);
})();

/* Видео-обложка кейса не запускается при prefers-reduced-motion:
   load() возвращает к заглушке (poster) вместо первого кадра. */
(function () {
  'use strict';
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.case-cover__media video[autoplay]').forEach(function (video) {
    video.removeAttribute('autoplay');
    video.pause();
    video.load();
  });
})();
