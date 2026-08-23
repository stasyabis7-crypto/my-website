(function () {
  var root = document.documentElement;
  var items = document.querySelectorAll('.works-grid__item');
  // Экран загрузки ждёт медиа только первого экрана (без скролла) —
  // остальные слоты стоят на loading="lazy" и не начнут грузиться, пока
  // до них не долистают, так что ждать ИХ значило бы держать экран загрузки до
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
    // случится, ждать его тут значило бы держать экран загрузки до предохранителя
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

  // ------------ Экран загрузки (парящий бриллиант + статус) ------------
  var LOADING_STATUSES = [
    'Загружаю…',
    'Собираю…',
    'Волшебничаю…',
    'Колдую…',
    'Начаровываю…',
    'Настраиваю пиксели…'
  ];

  var loadingScreen = document.getElementById('loading-screen');
  var loadingStatus = document.getElementById('loading-screen-status');
  var reduceMotionForStatus = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (loadingStatus && loadingScreen) {
    if (reduceMotionForStatus) {
      // Без анимации и без цикла — один статус, сразу целиком, как раньше.
      loadingStatus.textContent = LOADING_STATUSES[Math.floor(Math.random() * LOADING_STATUSES.length)];
    } else {
      startStatusTypewriter(loadingScreen, loadingStatus, LOADING_STATUSES);
    }
  }

  // Печатает текст посимвольно (каждый символ — свой <span> с задержкой
  // анимации). Зовёт onDone, когда напечатался последний символ.
  function typewriteInto(el, text, onDone) {
    el.textContent = '';
    var CHAR_STEP_MS = 22;
    var frag = document.createDocumentFragment();
    text.split('').forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'loading-screen__status-char';
      span.style.animationDelay = i * CHAR_STEP_MS + 'ms';
      span.textContent = ch;
      frag.appendChild(span);
    });
    el.appendChild(frag);

    var totalMs = text.length * CHAR_STEP_MS + 220; // + длительность анимации последнего символа
    return setTimeout(onDone, totalMs);
  }

  // Печатает по кругу статусы из shuffled-очереди, пока жив #loading-screen
  // — если загрузка идёт долго, статус продолжает меняться; MutationObserver
  // останавливает цикл сразу, как только экран спрятан (.is-hidden или
  // [hidden]), чтобы не тикать таймерами вникуда.
  function startStatusTypewriter(screen, el, statuses) {
    var order = statuses.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }

    var idx = 0;
    var stopped = false;
    var pendingTimer = null;
    var HOLD_MS = 1600; // держим показанный статус на экране, прежде чем сменить

    function isScreenGone() {
      return screen.classList.contains('is-hidden') || screen.hidden;
    }

    function showNext() {
      if (stopped || isScreenGone()) return;
      var text = order[idx % order.length];
      idx += 1;
      typewriteInto(el, text, function () {
        if (stopped || isScreenGone()) return;
        pendingTimer = setTimeout(showNext, HOLD_MS);
      });
    }

    showNext();

    var observer = new MutationObserver(function () {
      if (!isScreenGone()) return;
      stopped = true;
      clearTimeout(pendingTimer);
      observer.disconnect();
    });
    observer.observe(screen, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  if (loadingScreen) {
    // Экран загрузки ждёт больше, чем шелл — держит бриллиант, пока не
    // готовы шрифты, аватар и медиа первого экрана галереи. Предохранитель
    // тут щедрее (9с): если какое-то вложение зависнет и не отдаст load,
    // экран всё равно не заблокирует сайт навсегда.
    var overlaySafetyTimeout = new Promise(function (resolve) { setTimeout(resolve, 9000); });

    Promise.race([
      Promise.all([fontsReady, avatarReady].concat(aboveFoldMediaReadyPromises)),
      overlaySafetyTimeout
    ]).then(function () {
      loadingScreen.classList.add('is-hidden');
      // Убираем из раскладки/a11y-дерева только после того, как доиграет
      // fade (.6s, см. loading-screen.css) — иначе переход обрежется.
      setTimeout(function () { loadingScreen.hidden = true; }, 650);
    });
  }
})();
