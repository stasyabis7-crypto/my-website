/*
  Мобилка (<=640px): анимированные плитки галереи (iframe-проекты и
  видео) по умолчанию не крутятся сами — стоп-кадр + кнопка "плей",
  запуск только по тапу на саму плитку.

  Это не косметика поверх works-anim-gate.js, а другой уровень защиты
  памяти: тот файл паузит/выгружает iframe уже ПОСЛЕ того, как он
  загрузился (DOM+canvas всё равно был выделен хотя бы на момент
  загрузки). Здесь же iframe вообще не получает src, пока плитку не
  тапнули — на телефоне живым остаётся максимум один iframe за раз (тот,
  что тапнули), а не пачка вокруг области просмотра. Видео так не
  выгружаем (отдельного документа не создаёт, см. works-anim-gate.js) —
  только паузим и накрываем постером через нативный <video poster>.

  ВАЖНО: подключать ДО works-anim-gate.js — тот на бутстрапе читает
  dataset.src, отдавая приоритет уже выставленному здесь значению
  (см. комментарий в works-anim-gate.js), иначе для запертых плиток
  дальше некуда будет восстанавливать src после тапа.
*/
(function () {
  if (!window.matchMedia || !window.matchMedia('(max-width: 640px)').matches) return;

  var root = document.documentElement;

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  var activeCover = null;

  function lock(cover) {
    var item = cover.closest('.works-grid__item');
    item.classList.add('is-tap-locked');
    cover.classList.remove('is-hidden');

    var frame = item.querySelector('.works-grid__embed-frame');
    if (frame) {
      if (!frame.dataset.src) frame.dataset.src = frame.getAttribute('src') || '';
      frame.removeAttribute('src');
    }
    var video = item.querySelector('.works-grid__video');
    if (video) {
      video.pause();
      try { video.currentTime = 0; } catch (_) {}
    }
  }

  function unlock(cover) {
    var item = cover.closest('.works-grid__item');
    item.classList.remove('is-tap-locked');
    cover.classList.add('is-hidden');

    var frame = item.querySelector('.works-grid__embed-frame');
    if (frame && frame.dataset.src) frame.src = frame.dataset.src;
    var video = item.querySelector('.works-grid__video');
    if (video) video.play().catch(function () {});
  }

  function activate(cover) {
    if (activeCover === cover) return;
    if (activeCover) lock(activeCover);
    activeCover = cover;
    unlock(cover);
  }

  function buildCover(item, posterSrc, fit) {
    var cover = document.createElement('button');
    cover.type = 'button';
    cover.className = 'works-tap-cover';
    var title = item.getAttribute('data-title');
    cover.setAttribute('aria-label', title ? 'Запустить анимацию: ' + title : 'Запустить анимацию');
    if (fit) cover.setAttribute('data-fit', fit);

    if (posterSrc) {
      var img = document.createElement('img');
      img.className = 'works-tap-cover__poster';
      img.src = posterSrc;
      img.alt = '';
      img.loading = 'lazy';
      cover.appendChild(img);
    }

    var playBtn = document.createElement('span');
    playBtn.className = 'works-tap-cover__play';
    var icon = document.createElement('span');
    icon.className = 'icon icon--play';
    playBtn.appendChild(icon);
    cover.appendChild(playBtn);

    cover.addEventListener('click', function () { activate(cover); });
    item.appendChild(cover);
    return cover;
  }

  document.querySelectorAll('.works-grid__embed-frame').forEach(function (frame) {
    var item = frame.closest('.works-grid__item');
    if (!item) return;
    var posterLight = frame.dataset.posterLight;
    var posterDark = frame.dataset.posterDark;
    var poster = frame.dataset.poster || (currentTheme() === 'light' ? posterLight : posterDark) || posterLight || posterDark;
    var cover = buildCover(item, poster, frame.getAttribute('data-fit'));
    if (posterLight && posterDark) {
      cover.dataset.posterLight = posterLight;
      cover.dataset.posterDark = posterDark;
    }
    lock(cover);
  });

  document.querySelectorAll('.works-grid__video').forEach(function (video) {
    var item = video.closest('.works-grid__item');
    if (!item) return;
    var cover = buildCover(item, null, null);
    lock(cover);
  });

  // Тема может переключиться уже после того, как обложки построены —
  // досинкать постеры iframe-плиток (у видео своя тема идёт через
  // theme.js/data-poster-light/dark прямо на <video>, см. theme.js).
  var themedCovers = document.querySelectorAll('.works-tap-cover[data-poster-light]');
  if (themedCovers.length) {
    new MutationObserver(function () {
      var theme = currentTheme();
      themedCovers.forEach(function (cover) {
        var img = cover.querySelector('.works-tap-cover__poster');
        var next = theme === 'light' ? cover.dataset.posterLight : cover.dataset.posterDark;
        if (img && next && img.getAttribute('src') !== next) img.src = next;
      });
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
})();
