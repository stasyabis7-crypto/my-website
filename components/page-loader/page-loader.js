(function () {
  var root = document.documentElement;
  var items = document.querySelectorAll('.works-grid__item');
  // Media reveal independently; page transitions never wait for gallery embeds.
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

    if (ready) {
      reveal(item);
    } else {
      media.addEventListener('load', function () { reveal(item); }, { once: true });
      media.addEventListener('error', function () { reveal(item); }, { once: true });
    }
  });

  var fontsReady = document.fonts && document.fonts.ready
    ? document.fonts.ready.catch(function () {})
    : Promise.resolve();

  var avatar = document.querySelector('.site-header__avatar img');
  var avatarReady = avatar && avatar.decode
    ? avatar.decode().catch(function () {})
    : Promise.resolve();

  // Release chrome skeletons independently of the decorative transition.
  var shellSafetyTimeout = new Promise(function (resolve) { setTimeout(resolve, 3000); });

  Promise.race([
    Promise.all([fontsReady, avatarReady]),
    shellSafetyTimeout
  ]).then(function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('is-page-loading'); });
    });
  });

})();
