/*
  Лента проектов Главной: один проект — один ряд. Название и описание,
  кнопка кейса и своя бенто-сетка картинок; на кейс ведёт только кнопка.
  Данные — pages/home/data/projects.js.
*/
(function () {
  'use strict';
  var feed = document.querySelector('[data-project-feed]');
  if (!feed || !window.portfolioProjects) return;

  var grid = feed.querySelector('.project-feed__grid');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Клетка и зазор бенто при эталонной ширине сетки 1376px (12 колонок).
  var CELL = 100;
  var GAP = 16;

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function span(count) { return count * CELL + (count - 1) * GAP; }

  // Video tiles loop silently; the poster covers loading, unsupported codecs
  // and reduced motion (then the video never starts).
  function media(tile, width, height) {
    if (!tile.image) {
      // Заглушка: размер, в котором готовить картинку (2x от эталона).
      return '<span class="bento__placeholder text-body">' + width * 2 + ' × ' + height * 2 + '</span>';
    }
    var alt = escape(tile.alt || '');
    var poster = '<img src="' + escape(tile.image) + '" width="' + width * 2 + '" height="' + height * 2 +
      '" alt="' + alt + '" loading="lazy" decoding="async" />';
    if (!tile.video || reduced.matches) return poster;
    return '<video src="' + escape(tile.video) + '" poster="' + escape(tile.image) + '" width="' + width * 2 +
      '" height="' + height * 2 + '" muted loop playsinline autoplay preload="auto" aria-label="' + alt + '"></video>';
  }

  // Плитки — только картинки; на кейс ведёт кнопка.
  function tile(item) {
    var width = span(item.col[1]);
    var height = span(item.row[1]);
    return '<div class="bento__tile' + (item.mobile === 'half' ? ' bento__tile--half' : '') +
      '" style="--col:' + item.col[0] + ' / span ' + item.col[1] +
      ';--row:' + item.row[0] + ' / span ' + item.row[1] + ';--ratio:' + width + ' / ' + height + '">' +
      '<span class="bento__frame">' + media(item, width, height) + '</span></div>';
  }

  function card(project) {
    var bento = project.bento;
    // Order in the markup follows the phone: text, bento, then the button.
    return '<li class="project-feed__item"><article class="feed-card">' +
      '<div class="feed-card__text">' +
      '<h3 class="feed-card__title text-h3">' + escape(project.title) + '</h3>' +
      '<p class="feed-card__description text-body" data-subtitle>' + escape(project.description) + '</p>' +
      '</div>' +
      '<div class="bento" style="--bento-rows:' + bento.rows + ';--bento-ratio:' + span(12) + ' / ' + span(bento.rows) + '">' +
      bento.tiles.map(tile).join('') +
      '</div>' +
      '<a class="feed-card__action btn btn--fill-pink btn--icon-right" href="' + escape(project.href) +
      '" aria-label="Смотреть кейс «' + escape(project.title) + '»">Смотреть кейс' +
      '<span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a>' +
      '</article></li>';
  }

  grid.innerHTML = window.portfolioProjects.map(card).join('');
})();
