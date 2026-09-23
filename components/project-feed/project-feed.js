/*
  Лента проектов Главной: переключатель платформы Все/Mobile/Web и сетка
  обложек. Теги под обложкой пока только подписи (не фильтр).
  Выбор платформы живёт в адресе — ?platform=web — поэтому подборкой можно
  поделиться, а «назад» в браузере возвращает прошлый выбор.
  Данные — pages/home/data/projects.js.
*/
(function () {
  'use strict';
  var feed = document.querySelector('[data-project-feed]');
  if (!feed || !window.portfolioProjects) return;

  var projects = window.portfolioProjects;
  var platforms = window.portfolioPlatforms || [];
  var tagById = {};
  (window.portfolioTags || []).forEach(function (tag) { tagById[tag.id] = tag; });
  var platformById = {};
  platforms.forEach(function (platform) { platformById[platform.id] = platform; });

  var segments = feed.querySelector('[data-feed-platforms]');
  var grid = feed.querySelector('.project-feed__grid');
  var status = feed.querySelector('.project-feed__status');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var platform = read();

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function read() {
    var value = new URLSearchParams(location.search).get('platform');
    return platformById[value] ? value : 'all';
  }

  function plural(count) {
    var mod10 = count % 10, mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'проект';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'проекта';
    return 'проектов';
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

  function update() {
    segments.querySelectorAll('[data-platform]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.platform === platform));
    });
    var list = projects.filter(function (project) {
      return platform === 'all' || project.platforms.indexOf(platform) !== -1;
    });
    grid.innerHTML = list.map(card).join('');
    status.textContent = 'Показано ' + list.length + ' ' + plural(list.length);
    if (window.chipScroller) window.chipScroller.init(feed);
  }

  segments.innerHTML = [{ id: 'all', label: 'Все' }].concat(platforms).map(function (item) {
    return '<button type="button" class="btn btn--fill-segment" data-platform="' + item.id + '" aria-pressed="false">' +
      escape(item.label) + '</button>';
  }).join('');

  segments.addEventListener('click', function (event) {
    var button = event.target.closest('[data-platform]');
    if (!button || button.dataset.platform === platform) return;
    platform = button.dataset.platform;
    history.pushState(null, '', location.pathname + (platform === 'all' ? '' : '?platform=' + platform) + '#works-gallery');
    update();
  });

  window.addEventListener('popstate', function () {
    platform = read();
    update();
  });

  update();
})();
