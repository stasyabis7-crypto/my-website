(function () {
  var root = document.documentElement;
  var items = document.querySelectorAll('.works-grid__item');
  // Экран загрузки ждёт медиа только первого экрана (без скролла) —
  // остальные слоты стоят на loading="lazy" и не начнут грузиться, пока
  // до них не долистают, так что ждать ИХ значило бы держать чашку до
  // предохранителя на каждой загрузке. Плитки ниже первого экрана как и
  // раньше открываются сами по себе (см. reveal ниже), просто не гейтят
  // #loading-screen.
  var aboveFoldMediaReadyPromises = [];

  function reveal(item) {
    if (item) item.classList.add('is-media-loaded');
  }

  items.forEach(function (item) {
    // Плитка на мобилке заперта works-tap-play.js (постер вместо iframe,
    // запуск по тапу) — src не подставлен, 'load' у iframe никогда не
    // случится, ждать его тут значило бы держать чашку до предохранителя
    // на каждой загрузке. Постер сам по себе картинка, не гейтит экран.
    if (item.classList.contains('is-tap-locked')) {
      reveal(item);
      return;
    }

    var media = item.querySelector('iframe, img');
    if (!media) {
      reveal(item);
      return;
    }

    var ready = media.tagName === 'IMG'
      ? media.complete && media.naturalWidth > 0
      : false;

    if (media.tagName === 'IFRAME') {
      try {
        ready = media.contentDocument && media.contentDocument.readyState === 'complete';
      } catch (_) {
        ready = false;
      }
    }

    var isAboveFold = item.getBoundingClientRect().top < window.innerHeight;

    if (ready) {
      reveal(item);
    } else {
      var mediaReady = new Promise(function (resolve) {
        media.addEventListener('load', function () { reveal(item); resolve(); }, { once: true });
      });
      if (isAboveFold) aboveFoldMediaReadyPromises.push(mediaReady);
    }
  });

  var fontsReady = document.fonts && document.fonts.ready
    ? document.fonts.ready.catch(function () {})
    : Promise.resolve();

  // hero-garden.js выставляет __gardenReady — резолвится, когда цветы
  // сада отрисованы и их картинки загрузились (с 7с-предохранителем там же).
  var gardenReady = window.__gardenReady && typeof window.__gardenReady.then === 'function'
    ? window.__gardenReady.catch(function () {})
    : Promise.resolve();
  var avatar = document.querySelector('.site-header__avatar img');
  var avatarReady = avatar && avatar.decode
    ? avatar.decode().catch(function () {})
    : Promise.resolve();

  // Скелетоны шелла (хедер/футер) всё равно не видны, пока не спрятан
  // #loading-screen ниже — короткий 3с предохранитель тут как раньше,
  // просто чтобы шелл был готов задолго до самой галереи.
  var shellSafetyTimeout = new Promise(function (resolve) { setTimeout(resolve, 3000); });

  Promise.race([
    Promise.all([fontsReady, avatarReady]),
    shellSafetyTimeout
  ]).then(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('is-page-loading'); });
    });
  });

  // ------------ Экран загрузки (цветок + «думающая» фраза) ------------
  var loadingScreen = document.getElementById('loading-screen');

  // Сменяющаяся фраза + «печатающиеся» точки. Таймеры гасим, когда
  // экран прячется.
  var loadingTimers = [];
  var phraseText = document.getElementById('loading-phrase-text');
  var phraseDots = document.getElementById('loading-phrase-dots');
  if (phraseText) {
    var phrases = [
      'Сажаем цветы', 'Поливаем клумбу', 'Расставляем горшки',
      'Ждём, пока распустится', 'Ловим солнце', 'Разгоняем облака'
    ];
    var pi = 0;
    loadingTimers.push(setInterval(function () {
      pi = (pi + 1) % phrases.length;
      phraseText.textContent = phrases[pi];
    }, 2400));
  }
  if (phraseDots) {
    var dc = 0;
    loadingTimers.push(setInterval(function () {
      dc = (dc + 1) % 4;
      phraseDots.textContent = dc ? Array(dc + 1).join('.') : '';
    }, 380));
  }

  if (loadingScreen) {
    // Экран загрузки ждёт больше, чем шелл — держит чашку, пока не
    // готовы шрифты, аватар и медиа первого экрана галереи. Предохранитель
    // тут щедрее (9с): если какое-то вложение зависнет и не отдаст load,
    // экран всё равно не заблокирует сайт навсегда.
    var overlaySafetyTimeout = new Promise(function (resolve) { setTimeout(resolve, 9000); });

    Promise.race([
      Promise.all([fontsReady, avatarReady, gardenReady].concat(aboveFoldMediaReadyPromises)),
      overlaySafetyTimeout
    ]).then(function () {
      loadingTimers.forEach(clearInterval);
      loadingScreen.classList.add('is-hidden');
      // Убираем из раскладки/a11y-дерева только после того, как доиграет
      // fade (.6s, см. loading-screen.css) — иначе переход обрежется.
      setTimeout(function () { loadingScreen.hidden = true; }, 650);
    });
  }
})();
