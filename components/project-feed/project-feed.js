/*
  Лента проектов Главной: сетка обложек сразу после баннера, без заголовка
  и фильтров. Теги под обложкой — только подписи (не фильтр).
  Данные — pages/home/data/projects.js.
*/
(function () {
  'use strict';
  var feed = document.querySelector('[data-project-feed]');
  if (!feed || !window.portfolioProjects) return;

  var projects = window.portfolioProjects;
  var tagById = {};
  (window.portfolioTags || []).forEach(function (tag) { tagById[tag.id] = tag; });

  var grid = feed.querySelector('.project-feed__grid');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  // Video covers loop silently; the poster covers loading, unsupported codecs
  // and reduced motion (then the video never starts).
  function media(project) {
    var poster = '<img src="' + escape(project.image) + '" width="' + project.width + '" height="' + project.height +
      '" alt="' + escape(project.alt) + '" loading="lazy" decoding="async" />';
    if (!project.video || reduced.matches) return poster;
    return '<video src="' + escape(project.video) + '" poster="' + escape(project.image) + '" width="' + project.width +
      '" height="' + project.height + '" muted loop playsinline autoplay preload="auto" aria-label="' + escape(project.alt) + '"></video>';
  }

  function card(project) {
    var tags = project.tags.map(function (id) { return tagById[id]; }).filter(Boolean).map(function (tag) {
      return '<li class="feed-card__tag">' + escape(tag.label) + '</li>';
    }).join('');
    // Order: title and subtitle, then the cover, then the tags.
    return '<li class="project-feed__item"><article class="feed-card">' +
      '<div class="feed-card__text">' +
      '<h3 class="feed-card__title text-h3">' + escape(project.title) + '</h3>' +
      '<p class="feed-card__description text-body" data-subtitle>' + escape(project.description) + '</p>' +
      '</div>' +
      '<div class="feed-card__media">' +
      '<a class="feed-card__cover" href="' + escape(project.href) + '" aria-label="Открыть кейс «' + escape(project.title) + '»">' +
      media(project) + '</a></div>' +
      '<div class="chip-scroller" data-chip-scroller>' +
      '<button type="button" class="btn btn--fill-bare btn--icon-only chip-scroller__arrow chip-scroller__arrow--prev" aria-label="Прокрутить теги назад" hidden><span class="icon icon--arrow-left" aria-hidden="true"></span></button>' +
      '<ul class="chip-scroller__track feed-card__tags" aria-label="Теги">' + tags + '</ul>' +
      '<button type="button" class="btn btn--fill-bare btn--icon-only chip-scroller__arrow chip-scroller__arrow--next" aria-label="Прокрутить теги вперёд" hidden><span class="icon icon--arrow-right" aria-hidden="true"></span></button>' +
      '</div></article></li>';
  }

  grid.innerHTML = projects.map(card).join('');
  if (window.chipScroller) window.chipScroller.init(feed);
})();
