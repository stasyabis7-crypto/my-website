/*
  Лента проектов Главной: фильтр по платформе (Все/Mobile/Web) и тегам.
  Выбранные теги сужают выдачу (проект должен иметь их все). Состояние
  живёт в адресе — ?platform=web&tags=ozon,b2b — поэтому подборкой можно
  поделиться, а «назад» в браузере возвращает прошлый фильтр.
  Данные — pages/home/data/projects.js.
*/
(function () {
  'use strict';
  var feed = document.querySelector('[data-project-feed]');
  if (!feed || !window.portfolioProjects) return;

  var projects = window.portfolioProjects;
  var platforms = window.portfolioPlatforms || [];
  var tags = (window.portfolioTags || []).filter(function (tag) {
    return projects.some(function (project) { return project.tags.indexOf(tag.id) !== -1; });
  });
  var tagById = {};
  tags.forEach(function (tag) { tagById[tag.id] = tag; });
  var platformById = {};
  platforms.forEach(function (platform) { platformById[platform.id] = platform; });

  var crumbs = feed.querySelector('.breadcrumbs__list');
  var segments = feed.querySelector('[data-feed-platforms]');
  var chipRow = feed.querySelector('[data-feed-tags]');
  var grid = feed.querySelector('.project-feed__grid');
  var empty = feed.querySelector('.project-feed__empty');
  var status = feed.querySelector('.project-feed__status');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var state = read();

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function read() {
    var params = new URLSearchParams(location.search);
    var platform = params.get('platform');
    var selected = (params.get('tags') || '').split(',').filter(function (id) { return tagById[id]; });
    return { platform: platformById[platform] ? platform : 'all', tags: selected };
  }

  function query(next) {
    var params = new URLSearchParams();
    if (next.platform !== 'all') params.set('platform', next.platform);
    if (next.tags.length) params.set('tags', next.tags.join(','));
    var search = params.toString();
    return location.pathname + (search ? '?' + search : '') + '#works-gallery';
  }

  function matches(project, filter) {
    if (filter.platform !== 'all' && project.platforms.indexOf(filter.platform) === -1) return false;
    return filter.tags.every(function (id) { return project.tags.indexOf(id) !== -1; });
  }

  function visible(filter) {
    return projects.filter(function (project) { return matches(project, filter); });
  }

  function plural(count) {
    var mod10 = count % 10, mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'проект';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'проекта';
    return 'проектов';
  }

  function chip(tag, pressed, extraClass) {
    return '<button type="button" class="btn btn--fill-chip ' + extraClass + '" data-tag="' + tag.id +
      '" aria-pressed="' + pressed + '">' + escape(tag.label) + '</button>';
  }

  function scroller(inner, label) {
    return '<div class="chip-scroller" data-chip-scroller>' +
      '<button type="button" class="btn btn--fill-bare btn--icon-only chip-scroller__arrow chip-scroller__arrow--prev" aria-label="Прокрутить теги назад" hidden><span class="icon icon--arrow-left" aria-hidden="true"></span></button>' +
      '<div class="chip-scroller__track" role="group" aria-label="' + label + '">' + inner + '</div>' +
      '<button type="button" class="btn btn--fill-bare btn--icon-only chip-scroller__arrow chip-scroller__arrow--next" aria-label="Прокрутить теги вперёд" hidden><span class="icon icon--arrow-right" aria-hidden="true"></span></button>' +
      '</div>';
  }

  function renderControls() {
    segments.innerHTML = [{ id: 'all', label: 'Все' }].concat(platforms).map(function (platform) {
      return '<button type="button" class="btn btn--fill-segment" data-platform="' + platform.id + '" aria-pressed="false">' +
        escape(platform.label) + '</button>';
    }).join('');
    chipRow.innerHTML = scroller(tags.map(function (tag) { return chip(tag, false, 'project-feed__tag'); }).join(''), 'Теги');
  }

  function card(project) {
    var cardTags = project.tags.map(function (id) { return tagById[id]; }).filter(Boolean);
    return '<li class="project-feed__item"><article class="feed-card">' +
      '<a class="feed-card__cover" href="' + escape(project.href) + '" tabindex="-1" aria-hidden="true">' +
      '<img src="' + escape(project.image) + '" width="' + project.width + '" height="' + project.height +
      '" alt="' + escape(project.alt) + '" loading="lazy" decoding="async" /></a>' +
      scroller(cardTags.map(function (tag) {
        return chip(tag, state.tags.indexOf(tag.id) !== -1, 'feed-card__tag');
      }).join(''), 'Теги проекта «' + escape(project.title) + '»') +
      '<div class="feed-card__text">' +
      '<h3 class="feed-card__title text-h3"><a class="feed-card__title-link" href="' + escape(project.href) + '">' + escape(project.title) + '</a></h3>' +
      '<p class="feed-card__description text-body" data-subtitle>' + escape(project.description) + '</p>' +
      '</div></article></li>';
  }

  function crumb(label, href) {
    return '<li class="breadcrumbs__item">' + (href
      ? '<a class="breadcrumbs__link" href="' + escape(href) + '">' + escape(label) + '</a>'
      : '<span class="breadcrumbs__current" aria-current="page">' + escape(label) + '</span>') + '</li>';
  }

  function renderCrumbs() {
    var items = [];
    var hasPlatform = state.platform !== 'all';
    var hasTags = state.tags.length > 0;
    items.push(crumb('Проекты', hasPlatform || hasTags ? query({ platform: 'all', tags: [] }) : null));
    if (hasPlatform) {
      items.push(crumb(platformById[state.platform].label, hasTags ? query({ platform: state.platform, tags: [] }) : null));
    }
    if (hasTags) {
      items.push(crumb(state.tags.map(function (id) { return tagById[id].label; }).join(', '), null));
    }
    crumbs.innerHTML = items.join('');
  }

  function update() {
    segments.querySelectorAll('[data-platform]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.platform === state.platform));
    });
    chipRow.querySelectorAll('[data-tag]').forEach(function (button) {
      var id = button.dataset.tag;
      var selected = state.tags.indexOf(id) !== -1;
      button.setAttribute('aria-pressed', String(selected));
      // A chip that would empty the list is unavailable, like on Mobbin.
      button.disabled = !selected && !visible({ platform: state.platform, tags: state.tags.concat(id) }).length;
    });
    var list = visible(state);
    grid.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
    status.textContent = list.length ? 'Показано ' + list.length + ' ' + plural(list.length) : 'Нет проектов с такими фильтрами';
    renderCrumbs();
    if (window.chipScroller) window.chipScroller.init(feed);
  }

  function commit(next, reveal) {
    state = next;
    history.pushState(null, '', query(state));
    update();
    if (reveal) feed.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
  }

  feed.addEventListener('click', function (event) {
    var target = event.target.closest('button, a');
    if (!target || !feed.contains(target)) return;
    if (target.dataset.platform) {
      commit({ platform: target.dataset.platform, tags: state.tags.filter(function (id) {
        return visible({ platform: target.dataset.platform, tags: [id] }).length;
      }) });
    } else if (target.classList.contains('project-feed__tag')) {
      var id = target.dataset.tag;
      var selected = state.tags.indexOf(id) !== -1;
      commit({ platform: state.platform, tags: selected
        ? state.tags.filter(function (tag) { return tag !== id; })
        : state.tags.concat(id) });
    } else if (target.classList.contains('feed-card__tag')) {
      // A tag under a cover opens that tag's selection, as on Mobbin.
      commit({ platform: state.platform, tags: [target.dataset.tag] }, true);
    } else if (target.hasAttribute('data-feed-reset')) {
      commit({ platform: 'all', tags: [] });
    } else if (target.classList.contains('breadcrumbs__link')) {
      event.preventDefault();
      var url = new URL(target.href);
      history.pushState(null, '', url.pathname + url.search + url.hash);
      state = read();
      update();
    }
  });

  window.addEventListener('popstate', function () {
    state = read();
    update();
  });

  renderControls();
  update();
})();
