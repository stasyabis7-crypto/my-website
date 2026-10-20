/*
  Лента проектов Главной: каталог обложек сразу после баннера, без заголовка
  и фильтров. Под обложкой — только название. Данные и число заглушек —
  pages/home/data/projects.js.
*/
(function () {
  'use strict';
  var feed = document.querySelector('[data-project-feed]');
  if (!feed || !window.portfolioProjects) return;

  var projects = window.portfolioProjects;
  var grid = feed.querySelector('.project-feed__grid');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  // Video covers loop silently; the poster covers loading, unsupported codecs
  // and reduced motion (then the video never starts). The file is attached only
  // when the tile nears the viewport (see watchVideos): eleven clips loading at
  // once starved each other and none reached its first frame.
  function media(project) {
    // focus — какая часть горизонтальной обложки остаётся в вертикальной плитке.
    // feed — отдельная вертикальная обложка для плитки ленты; с ней кадр
    // страницы кейса (image/video) в ленте не используется.
    var source = project.feed || project;
    var focus = project.focus ? ' style="object-position:' + escape(project.focus) + '"' : '';
    var poster = '<img src="' + escape(source.image) + '" width="' + source.width + '" height="' + source.height +
      '" alt="' + escape(project.alt) + '" loading="lazy" decoding="async"' + focus + ' />';
    if (!source.video || reduced.matches) return poster;
    return '<video data-src="' + escape(source.video) + '" poster="' + escape(source.image) + '" width="' + source.width +
      '" height="' + source.height + '" muted loop playsinline preload="none" aria-label="' + escape(project.alt) + '"' + focus + '></video>';
  }

  // Plays the clips on screen (and half a screen ahead), pauses the rest.
  function watchVideos() {
    var videos = grid.querySelectorAll('video[data-src]');
    if (!videos.length) return;
    function play(video) {
      if (!video.src) {
        video.src = video.getAttribute('data-src');
        video.preload = 'auto';
      }
      video.muted = true;
      var started = video.play();
      if (started) started.catch(function () {});
    }
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(videos, play);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) play(entry.target);
        else if (entry.target.src) entry.target.pause();
      });
    }, { rootMargin: '50% 0px' });
    Array.prototype.forEach.call(videos, function (video) { observer.observe(video); });
  }

  /* Раскладка каталога: 4 колонки, две крупные обложки 2×2, остальные 1×1,
     часть ячеек пустует. Позиция — [колонка, строка], крупные помечены big.
     Набор повторяется вниз блоками по ROWS строк. На телефоне и планшете
     позиции не действуют: там обычный поток в две колонки. */
  var PATTERN = [
    { c: 1, r: 1, big: true }, { c: 3, r: 1 }, { c: 4, r: 1 },
    { c: 1, r: 3 }, { c: 3, r: 3 }, { c: 4, r: 3 },
    { c: 2, r: 4 }, { c: 4, r: 4 },
    { c: 1, r: 5 }, { c: 2, r: 5 }, { c: 3, r: 5, big: true }
  ];
  var ROWS = 6;

  function slot(index) {
    var cell = PATTERN[index % PATTERN.length];
    var row = cell.r + Math.floor(index / PATTERN.length) * ROWS;
    return ' style="--feed-col:' + cell.c + ';--feed-row:' + row + '"';
  }

  function item(index, inner, stubbed) {
    var big = PATTERN[index % PATTERN.length].big;
    return '<li class="project-feed__item' + (big ? ' project-feed__item--big' : '') +
      (stubbed ? ' project-feed__item--stub" aria-hidden="true' : '') + '"' + slot(index) + '>' + inner + '</li>';
  }

  // Обложка-ссылка, круглая кнопка со стрелкой в правом верхнем углу и
  // название обычным текстом. Подзаголовок и теги в ленте не показываются.
  // Проект без страницы (soon: true) — обложка без ссылки, вместо стрелки
  // подпись «Скоро появится».
  function card(project, index) {
    var title = '<h3 class="feed-card__title text-body">' + escape(project.title) + '</h3>';
    if (project.soon) {
      return item(index, '<article class="feed-card">' +
        '<div class="feed-card__media"><div class="feed-card__frame">' +
        '<div class="feed-card__cover">' + media(project) + '</div>' +
        '<span class="feed-card__badge">Скоро появится</span>' +
        '</div></div>' + title + '</article>');
    }
    return item(index, '<article class="feed-card">' +
      '<div class="feed-card__media" data-action-hover><div class="feed-card__frame">' +
      '<a class="feed-card__cover" href="' + escape(project.href) + '" aria-label="Открыть кейс «' + escape(project.title) + '»">' +
      media(project) + '</a>' +
      // Ведёт туда же, что и обложка, поэтому скрыта от клавиатуры и
      // скринридера (фокус — на обложке).
      '<a class="feed-card__action btn btn--fill-glass-round btn--icon-only btn--icon-diagonal-motion" href="' + escape(project.href) +
      '" tabindex="-1" aria-hidden="true"><span class="icon icon--arrow-diagonal"></span></a>' +
      '</div></div>' + title + '</article>');
  }

  // Заглушка проекта, который ещё не описан: пустая плитка без ссылки и текста.
  function stub(index) {
    return item(index, '<div class="feed-card"><div class="feed-card__cover"></div></div>', true);
  }

  var cards = projects.map(card);
  for (var i = 0; i < (window.portfolioFeedStubs || 0); i++) cards.push(stub(projects.length + i));
  grid.innerHTML = cards.join('');
  watchVideos();
})();
