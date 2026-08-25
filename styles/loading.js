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

  // ------------ Экран загрузки (чашка кофе + фан-факт) ------------
  // Временные фан-факты — 3 штуки для затравки, реальный текст донесёт
  // пользователь позже (см. чат). innerHTML безопасен — это статичный
  // массив из кода, не пользовательский ввод.
  var LOADING_FACTS = [
    'Дизайнер в среднем открывает <strong>Figma</strong> чаще, чем <em>холодильник</em> — и не всегда с большим успехом.',
    'Кнопку можно передвинуть <strong>247 раз</strong> за один день и всё равно услышать: <em>«а верните как было»</em>.',
    'Слово <em>«ресайзни»</em> дизайнеры слышат чаще, чем <strong>своё имя</strong> — статистика не проверена, но звучит правдиво.'
  ];

  var loadingScreen = document.getElementById('loading-screen');
  var loadingFact = document.getElementById('loading-screen-fact');
  var reduceMotionForFact = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (loadingFact && loadingScreen) {
    if (reduceMotionForFact) {
      // Без анимации и без цикла — один факт, сразу целиком, как раньше.
      loadingFact.innerHTML = LOADING_FACTS[Math.floor(Math.random() * LOADING_FACTS.length)];
    } else {
      startFactTypewriter(loadingScreen, loadingFact, LOADING_FACTS);
    }
  }

  // Печатает html посимвольно (каждый символ — свой <span> с задержкой
  // анимации), сохраняя разметку (<strong>/<em>) — оборачиваем только
  // ТЕКСТОВЫЕ узлы через TreeWalker, теги не трогаем, поэтому жирный/
  // курсивный текст остаётся жирным/курсивным посимвольно, а не ломается
  // на середине тега. Зовёт onDone, когда напечатался последний символ.
  function typewriteInto(el, html, onDone) {
    el.innerHTML = html;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    var node;
    while ((node = walker.nextNode())) textNodes.push(node);

    var CHAR_STEP_MS = 22;
    var i = 0;
    textNodes.forEach(function (textNode) {
      var frag = document.createDocumentFragment();
      textNode.textContent.split('').forEach(function (ch) {
        var span = document.createElement('span');
        span.className = 'loading-screen__fact-char';
        span.style.animationDelay = i * CHAR_STEP_MS + 'ms';
        span.textContent = ch;
        frag.appendChild(span);
        i += 1;
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });

    var totalMs = i * CHAR_STEP_MS + 220; // + длительность анимации последнего символа
    return setTimeout(onDone, totalMs);
  }

  // Печатает по кругу факты из shuffled-очереди, пока жив #loading-screen
  // — если загрузка идёт долго, есть что почитать; MutationObserver
  // останавливает цикл сразу, как только экран спрятан (.is-hidden или
  // [hidden]), чтобы не тикать таймерами вникуда.
  function startFactTypewriter(screen, el, facts) {
    var order = facts.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }

    var idx = 0;
    var stopped = false;
    var pendingTimer = null;
    var HOLD_MS = 2600; // держим дочитанный факт на экране, прежде чем сменить

    function isScreenGone() {
      return screen.classList.contains('is-hidden') || screen.hidden;
    }

    function showNext() {
      if (stopped || isScreenGone()) return;
      var html = order[idx % order.length];
      idx += 1;
      typewriteInto(el, html, function () {
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
    // Экран загрузки ждёт больше, чем шелл — держит чашку, пока не
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
