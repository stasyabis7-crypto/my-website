/*
  Hero-анимация — адаптация референса пользователя (9 кругов-масок +
  9 цветных кругов-фона + 8 кругов переднего плана, дублированных в
  зашумлённую тень) под секцию, а не весь viewport: originally
  onpointermove/onpointerleave висели на всём window и считали
  e.x/innerWidth — здесь событие и разметка скоуплены на #hero/.hero__bg,
  координаты курсора берём относительно rect самой секции.

  Без GSAP (CDN недоступен/заблокирован) скрипт просто не стартует —
  в разметке (index.html) у кругов уже стоят дефолтные cx/cy/r,
  показывающие статичную цветную сетку вместо пустоты.
*/
(function () {
  // Клик по кнопке "Смотреть работы" — обычный smooth-scroll, БЕЗ
  // прописывания #works-gallery в адресную строку: с хешем в URL
  // каждая следующая перезагрузка страницы сама прыгала бы сразу к
  // галерее вместо hero (это и есть "скроллится вниз при загрузке").
  // Не зависит от GSAP — работает, даже если анимация ниже не стартует.
  var cta = document.querySelector('.hero__cta');
  var worksGallery = document.getElementById('works-gallery');
  if (cta && worksGallery) {
    var reduceMotionForScroll = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      worksGallery.scrollIntoView({ behavior: reduceMotionForScroll ? 'auto' : 'smooth' });
    });
  }

  if (typeof gsap === 'undefined') return;

  var hero = document.getElementById('hero');
  var stage = hero && hero.querySelector('.hero__bg');
  if (!hero || !stage) return;

  var masked = stage.querySelector('#hero-masked');
  var fg = stage.querySelector('#hero-fg');
  var turbulence = stage.querySelector('feTurbulence');

  var shadow = fg.cloneNode(true);
  masked.insertBefore(shadow, fg);
  gsap.set(shadow, { attr: { id: 'hero-shadow', filter: 'url(#hero-noise)' } });

  var allCircles = stage.querySelectorAll('circle');
  var shadowCircles = stage.querySelectorAll('#hero-shadow circle');
  var maskCircles = stage.querySelectorAll('#hero-mask circle');
  var bgCircles = stage.querySelectorAll('#hero-bg circle');
  var fgAndShadowCircles = stage.querySelectorAll('#hero-fg circle, #hero-shadow circle');

  gsap.set(allCircles, { attr: { r: 100 } });
  gsap.set(shadowCircles, { attr: { fill: '#000000bb', r: 95 }, x: -5, y: 12 });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Сборка в сетку 3×3 из центра — при reduced-motion сразу на финальные
  // позиции, без 3-секундной expo-анимации.
  [maskCircles, bgCircles].forEach(function (circles) {
    gsap.fromTo(
      circles,
      { attr: { cx: 400, cy: 400 } },
      {
        attr: {
          cx: function (i) { return 200 + (i % 3) * 200; },
          cy: function (i) {
            if (i < 3) return 200;
            if (i < 6) return 400;
            return 600;
          },
        },
        ease: reduceMotion ? 'none' : 'expo.inOut',
        duration: reduceMotion ? 0.01 : 3,
      }
    );
  });

  if (reduceMotion) return; // без непрерывных луп/параллакса — только сборка сетки выше

  // Шум в drop shadow — рандомим seed фильтра каждые 0.2с.
  gsap.to({}, {
    duration: 0.2,
    repeat: -1,
    onRepeat: function () {
      gsap.set(turbulence, { attr: { seed: Math.ceil(Math.random() * 99) } });
    },
  });

  // Лёгкое покачивание переднего плана и его тени вверх/вниз.
  gsap.from(fgAndShadowCircles, {
    duration: 2,
    y: function (i) { return i % 2 ? '-=200' : '+=200'; },
    ease: 'steps(5)',
    repeat: -1,
    yoyo: true,
  });

  // Параллакс кругов за курсором (pointermove/pointerleave) временно
  // убран — ломал прорисовку при скролле (см. чат), вернёмся к нему
  // отдельно. Сборка в сетку + шум тени + покачивание переднего плана
  // выше остаются как есть.
})();
