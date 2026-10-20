/*
  Админка сайта (npm run admin). Четыре раздела:
  · Главная — сетка ленты: место и размер обложек, новые проекты, обложки;
  · Страницы — визуальный редактор страниц кейсов (dev/admin/editor.js внутри);
  · Ссылки и файлы — резюме, контакты, пункты меню;
  · Публикация — проверки сайта, коммит и push.
  Все изменения сразу пишутся в файлы репозитория; «Отменить» откатывает их.
*/
(function () {
  'use strict';

  /* ─── Утилиты ─────────────────────────────────────────────────────── */

  function h(tag, props) {
    var element = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === undefined || value === null || value === false) return;
      if (key === 'class') element.className = value;
      else if (key === 'text') element.textContent = value;
      else if (key === 'html') element.innerHTML = value;
      else if (key === 'style') element.setAttribute('style', value);
      else if (key.slice(0, 2) === 'on') element.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in element && typeof value !== 'string') element[key] = value;
      else element.setAttribute(key, value === true ? '' : value);
    });
    for (var i = 2; i < arguments.length; i++) append(element, arguments[i]);
    return element;
  }
  function append(parent, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (item) { append(parent, item); }); return; }
    parent.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  function clear(element) { while (element.firstChild) element.removeChild(element.firstChild); return element; }

  function api(url, options) {
    options = options || {};
    options.headers = Object.assign({ 'X-Admin': '1' }, options.headers || {});
    if (options.json !== undefined) {
      options.body = JSON.stringify(options.json);
      options.headers['Content-Type'] = 'application/json';
      options.method = options.method || 'POST';
    }
    return fetch(url, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) { var error = Error(data.error || response.statusText); error.status = response.status; throw error; }
        if (data.undo !== undefined) setUndo(data.undo);
        return data;
      });
    });
  }

  function toast(message, kind) {
    var item = h('div', { class: 'toast' + (kind ? ' toast--' + kind : ''), text: message });
    document.getElementById('toasts').appendChild(item);
    setTimeout(function () { item.classList.add('toast--out'); }, kind === 'error' ? 6000 : 2600);
    setTimeout(function () { item.remove(); }, kind === 'error' ? 6400 : 3000);
  }
  var fail = function (error) { toast(error.message, 'error'); };

  function debounce(fn, wait) {
    var timer;
    return function () { var args = arguments; clearTimeout(timer); timer = setTimeout(function () { fn.apply(null, args); }, wait); };
  }

  // Размер картинки или видео — до загрузки, чтобы имя файла и подсказки знали пропорции.
  function measure(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var done = function (width, height) { URL.revokeObjectURL(url); resolve({ width: width || 0, height: height || 0 }); };
      if (/^video\//.test(file.type)) {
        var video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function () { done(video.videoWidth, video.videoHeight); };
        video.onerror = function () { done(0, 0); };
        video.src = url;
      } else if (/^image\//.test(file.type)) {
        var image = new Image();
        image.onload = function () { done(image.naturalWidth, image.naturalHeight); };
        image.onerror = function () { done(0, 0); };
        image.src = url;
      } else done(0, 0);
    });
  }

  function upload(file, options) {
    return measure(file).then(function (size) {
      var query = new URLSearchParams({ dir: options.dir, name: file.name, base: options.base || file.name, w: size.width || '', h: size.height || '', page: options.page || '' });
      toast('Загружаю ' + file.name + '…');
      return api('/api/upload?' + query, { method: 'POST', body: file }).then(function (result) {
        return Object.assign(result, size, { video: /^video\//.test(file.type) });
      });
    });
  }

  function pickFile(accept) {
    return new Promise(function (resolve) {
      var input = h('input', { type: 'file', accept: accept });
      input.addEventListener('change', function () { if (input.files[0]) resolve(input.files[0]); });
      input.click();
    });
  }

  var ratioText = function (w, h) {
    if (!w || !h) return '';
    var gcd = function (a, b) { return b ? gcd(b, a % b) : a; };
    var d = gcd(w, h);
    return (w / d > 50 ? (w / h).toFixed(2) + ':1' : w / d + ':' + h / d);
  };
  var dirOf = function (file) { return file.replace(/\/[^/]*$/, ''); };

  function modal(title, body, actions) {
    var dialog = h('dialog', { class: 'modal' },
      h('form', { method: 'dialog', class: 'modal__inner' },
        h('div', { class: 'modal__head' }, h('h2', { text: title }), h('button', { class: 'ui-icon', value: 'close', 'aria-label': 'Закрыть', text: '✕' })),
        h('div', { class: 'modal__body' }, body),
        actions ? h('div', { class: 'modal__foot' }, actions) : null));
    dialog.addEventListener('close', function () { dialog.remove(); });
    document.body.appendChild(dialog);
    dialog.showModal();
    return dialog;
  }

  /* ─── Состояние и разделы ─────────────────────────────────────────── */

  var state = { tab: null, data: null, selected: null, page: null };
  var view = document.getElementById('view');

  function setUndo(count) {
    var button = document.getElementById('undo');
    button.disabled = !count;
    button.title = count ? 'Отменить последнее действие (⌘Z) · в истории ' + count : 'Отменять пока нечего';
  }

  function load() {
    return api('/api/state').then(function (data) {
      state.data = data;
      setUndo(data.undo);
      return data;
    });
  }

  function dirty() {
    api('/api/publish').then(function (data) {
      var count = document.getElementById('dirty-count');
      count.hidden = !data.status.length;
      count.textContent = data.status.length;
    }).catch(function () {});
  }

  function go(tab, options) {
    state.tab = tab;
    document.querySelectorAll('[data-tab]').forEach(function (button) { button.setAttribute('aria-current', button.dataset.tab === tab ? 'page' : 'false'); });
    try { localStorage.setItem('admin-tab', tab); } catch (error) { /* без памяти */ }
    clear(view);
    view.className = 'view view--' + tab;
    ({ home: renderHome, pages: renderPages, links: renderLinks, publish: renderPublish })[tab](options || {});
  }

  document.querySelectorAll('[data-tab]').forEach(function (button) {
    button.addEventListener('click', function () { go(button.dataset.tab); });
  });

  function undo() {
    api('/api/undo', { method: 'POST' }).then(function (result) {
      toast('Отменено: ' + result.changed.join(', '));
      return load();
    }).then(function () {
      if (state.tab === 'pages' && state.page) reloadPage();
      else go(state.tab, { keep: true });
      dirty();
    }).catch(fail);
  }
  document.getElementById('undo').addEventListener('click', undo);
  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      event.preventDefault();
      if (!document.getElementById('undo').disabled) undo();
    }
  });

  /* ═══ Главная: сетка ленты ═══════════════════════════════════════════ */

  var SIZES = {
    big: { label: 'Крупная 2×2', ratio: 3 / 4, ratioText: '3:4', file: '1800 × 2400' },
    normal: { label: 'Обычная', ratio: 5 / 6, ratioText: '5:6', file: '1500 × 1800' }
  };

  function withPlaces(projects) {
    var feed = state.data.feed;
    return projects.map(function (project, index) {
      if (project.place) return project;
      var preset = feed.pattern[index % feed.pattern.length];
      var place = { c: preset.c, r: preset.r + Math.floor(index / feed.pattern.length) * feed.rows };
      if (preset.big) place.big = true;
      return Object.assign({}, project, { place: place });
    });
  }

  function cellsOf(place) {
    var size = place.big ? 2 : 1, cells = [];
    for (var c = place.c; c < place.c + size; c++) for (var r = place.r; r < place.r + size; r++) cells.push(c + ':' + r);
    return cells;
  }

  function occupied(projects, except) {
    var map = {};
    projects.forEach(function (project) {
      if (project === except) return;
      cellsOf(project.place).forEach(function (cell) { map[cell] = project; });
    });
    return map;
  }

  function fits(projects, project, place) {
    if (place.c < 1 || place.r < 1 || place.c + (place.big ? 1 : 0) > 4) return false;
    var map = occupied(projects, project);
    return cellsOf(place).every(function (cell) { return !map[cell]; });
  }

  function firstFree(projects, big) {
    for (var r = 1; r < 200; r++) for (var c = 1; c <= 4; c++) {
      var place = { c: c, r: r };
      if (big) place.big = true;
      if (fits(projects, null, place)) return place;
    }
    return { c: 1, r: 1 };
  }

  var saveFeed = function () {
    return api('/api/feed', { json: { projects: state.data.feed.projects } }).then(function () {
      return load();
    }).then(function () { dirty(); if (state.tab === 'home') renderBoard(); }).catch(function (error) {
      fail(error);
      return load().then(function () { if (state.tab === 'home') go('home', { keep: true }); });
    });
  };
  var saveFeedSoon = debounce(saveFeed, 700);

  function renderHome() {
    state.data.feed.projects = withPlaces(state.data.feed.projects);
    var board = h('div', { class: 'board', id: 'board' });
    var preview = h('div', { class: 'home-preview', hidden: true });
    var inspector = h('aside', { class: 'inspector', id: 'feed-inspector' });
    var mode = 'board';
    function setMode(next) {
      mode = next;
      board.parentNode.hidden = next !== 'board';
      preview.hidden = next === 'board';
      if (next !== 'board') showPreview(preview, next);
      document.querySelectorAll('[data-home-mode]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.homeMode === next)); });
    }
    append(view, [
      h('section', { class: 'workspace' },
        h('div', { class: 'toolbar' },
          h('button', { type: 'button', class: 'ui-btn ui-btn--primary', onclick: newProject, text: '+ Новый проект' }),
          h('div', { class: 'segmented', role: 'group', 'aria-label': 'Вид' },
            h('button', { type: 'button', 'data-home-mode': 'board', 'aria-pressed': 'true', onclick: function () { setMode('board'); }, text: 'Сетка' }),
            h('button', { type: 'button', 'data-home-mode': 'desktop', onclick: function () { setMode('desktop'); }, text: 'Как на сайте' }),
            h('button', { type: 'button', 'data-home-mode': 'phone', onclick: function () { setMode('phone'); }, text: 'Телефон' }))),
        h('div', { class: 'board-wrap' },
          h('p', { class: 'hint' },
            'Перетащите обложку в свободную клетку или на другую такую же — они поменяются местами. ',
            'Обычная плитка — 5:6 (файл 1500 × 1800), крупная занимает 2×2 — 3:4 (файл 1800 × 2400). ',
            'На телефоне плитки идут по порядку слева направо, сверху вниз: крупные и каждая пятая — во всю ширину.'),
          board),
        preview),
      inspector
    ]);
    renderBoard();
    renderFeedInspector();
  }

  function showPreview(container, device) {
    clear(container);
    var frame = h('iframe', { class: 'device-frame', src: '/index.html?admin-preview=' + Date.now() + '#works-gallery', title: 'Главная' });
    var holder = h('div', { class: 'device device--' + device }, frame);
    append(container, holder);
    fitDevice(holder, frame, device === 'phone' ? 390 : 1440);
  }

  function fitDevice(holder, frame, width) {
    function fit() {
      var available = holder.clientWidth;
      var scale = Math.min(1, available / width);
      frame.style.width = width + 'px';
      frame.style.height = (holder.clientHeight / scale) + 'px';
      frame.style.transform = 'scale(' + scale + ')';
    }
    fit();
    new ResizeObserver(fit).observe(holder);
  }

  function renderBoard() {
    var board = document.getElementById('board');
    if (!board) return;
    clear(board);
    var projects = state.data.feed.projects;
    var rows = projects.reduce(function (max, project) { return Math.max(max, project.place.r + (project.place.big ? 1 : 0)); }, 0) + 2;
    var map = occupied(projects, null);
    for (var r = 1; r <= rows; r++) {
      for (var c = 1; c <= 4; c++) {
        if (map[c + ':' + r]) continue;
        board.appendChild(emptyCell(c, r));
      }
    }
    projects.forEach(function (project, index) { board.appendChild(tile(project, index)); });
    var resize = function () {
      var col = (board.clientWidth - 3 * 12) / 4;
      board.style.setProperty('--row', Math.round(col * 6 / 5 + 34) + 'px');
    };
    resize();
    if (!board.__observed) { new ResizeObserver(resize).observe(board); board.__observed = true; }
  }

  function emptyCell(c, r) {
    var cell = h('div', { class: 'board__cell', style: 'grid-column:' + c + ';grid-row:' + r, title: 'Свободная клетка ' + c + ' × ' + r },
      h('span', { text: '+' }));
    cell.addEventListener('dragover', function (event) { event.preventDefault(); cell.classList.add('is-over'); });
    cell.addEventListener('dragleave', function () { cell.classList.remove('is-over'); });
    cell.addEventListener('drop', function (event) {
      event.preventDefault();
      cell.classList.remove('is-over');
      moveTo(event.dataTransfer.getData('text/project'), c, r);
    });
    cell.addEventListener('dblclick', function () { newProject({ c: c, r: r }); });
    return cell;
  }

  function coverOf(project) { return project.feed || { image: project.image, width: project.width, height: project.height }; }

  function tile(project, index) {
    var place = project.place;
    var cover = coverOf(project);
    var big = !!place.big;
    var expected = big ? SIZES.big.ratio : SIZES.normal.ratio;
    var mismatch = cover.width && cover.height && Math.abs(cover.width / cover.height - expected) > 0.02;
    var element = h('div', {
      class: 'tile' + (big ? ' tile--big' : '') + (state.selected === project.id ? ' is-selected' : ''),
      style: 'grid-column:' + place.c + (big ? ' / span 2' : '') + ';grid-row:' + place.r + (big ? ' / span 2' : ''),
      draggable: 'true', tabindex: '0'
    },
      h('div', { class: 'tile__cover' },
        h('img', { src: cover.image, alt: '', loading: 'lazy' }),
        cover.video ? h('span', { class: 'tile__chip', text: '▶ видео' }) : null,
        project.soon ? h('span', { class: 'tile__chip tile__chip--soon', text: 'Скоро появится' }) : null,
        mismatch ? h('span', { class: 'tile__chip tile__chip--warn', title: 'Пропорции обложки не совпадают с плиткой', text: '⚠ ' + ratioText(cover.width, cover.height) + ' вместо ' + (big ? '3:4' : '5:6') }) : null),
      h('div', { class: 'tile__title' }, h('span', { class: 'tile__index', text: index + 1 }), project.title));
    element.addEventListener('click', function () { state.selected = project.id; renderBoard(); renderFeedInspector(); });
    element.addEventListener('dragstart', function (event) { event.dataTransfer.setData('text/project', project.id); element.classList.add('is-dragging'); });
    element.addEventListener('dragend', function () { element.classList.remove('is-dragging'); });
    element.addEventListener('dragover', function (event) { event.preventDefault(); element.classList.add('is-over'); });
    element.addEventListener('dragleave', function () { element.classList.remove('is-over'); });
    element.addEventListener('drop', function (event) {
      event.preventDefault();
      element.classList.remove('is-over');
      swap(event.dataTransfer.getData('text/project'), project.id);
    });
    return element;
  }

  function projectById(id) { return state.data.feed.projects.find(function (project) { return project.id === id; }); }

  function moveTo(id, c, r) {
    var projects = state.data.feed.projects, project = projectById(id);
    if (!project) return;
    var place = { c: Math.min(c, project.place.big ? 3 : 4), r: r };
    if (project.place.big) place.big = true;
    if (!fits(projects, project, place)) { toast('Сюда не помещается: крупной плитке нужно 2×2 свободных клетки', 'error'); return; }
    project.place = place;
    state.selected = id;
    renderBoard();
    saveFeed();
  }

  function swap(fromId, toId) {
    if (fromId === toId) return;
    var from = projectById(fromId), to = projectById(toId);
    if (!from || !to) return;
    if (!!from.place.big !== !!to.place.big) { toast('Меняются местами только плитки одного размера — сначала поменяйте размер', 'error'); return; }
    var place = from.place;
    from.place = to.place;
    to.place = place;
    state.selected = fromId;
    renderBoard();
    saveFeed();
  }

  function setSize(project, big) {
    var projects = state.data.feed.projects;
    var candidates = big ? [project.place.c, project.place.c - 1].map(function (c) { return { c: c, r: project.place.r, big: true }; }) : [{ c: project.place.c, r: project.place.r }];
    var place = candidates.find(function (candidate) { return fits(projects, project, candidate); });
    if (!place) { toast('Рядом нет места для крупной плитки — освободите соседние клетки справа и снизу', 'error'); return; }
    project.place = place;
    renderBoard();
    renderFeedInspector();
    saveFeed();
  }

  function field(label, input, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'field__label', text: label }), input, hint ? h('span', { class: 'field__hint', text: hint }) : null);
  }

  function coverFolder(project) {
    var cover = coverOf(project).image || '';
    var match = cover.match(/^\/(projects\/.+?)\/covers\//);
    if (match) return match[1] + '/covers';
    if (project.href) return project.href.replace(/^\/|\/$/g, '') + '/covers';
    return 'projects/' + project.id + '/covers';
  }

  function renderFeedInspector() {
    var panel = document.getElementById('feed-inspector');
    if (!panel) return;
    clear(panel);
    var project = state.selected && projectById(state.selected);
    if (!project) {
      append(panel, [
        h('h2', { text: 'Лента Главной' }),
        h('p', { class: 'muted', text: 'Выберите обложку, чтобы поменять картинку, название, размер или статус. Двойной клик по свободной клетке — новый проект на это место.' }),
        h('div', { class: 'callout' },
          h('strong', { text: 'Какие файлы нужны' }),
          h('ul', {},
            h('li', { text: 'Обычная плитка: 5:6, картинка 1500 × 1800.' }),
            h('li', { text: 'Крупная плитка 2×2: 3:4, картинка 1800 × 2400.' }),
            h('li', { text: 'Видео-обложка (необязательно): mp4 без звука, зацикленное, тех же пропорций, лучше до 6–8 МБ. Картинка тогда — его первый кадр.' }),
            h('li', { text: 'PNG сам превратится в WebP без потерь.' })))
      ]);
      return;
    }
    var size = project.place.big ? SIZES.big : SIZES.normal;
    var cover = coverOf(project);
    var update = function (key, value) { project[key] = value; saveFeedSoon(); renderBoardSoon(); };
    var title = h('input', { type: 'text', value: project.title, oninput: function () { update('title', title.value); } });
    var alt = h('textarea', { rows: 3, oninput: function () { update('alt', alt.value); } });
    alt.value = project.alt || '';
    var mismatch = cover.width && Math.abs(cover.width / cover.height - size.ratio) > 0.02;

    function replaceCover(kind) {
      pickFile(kind === 'video' ? 'video/mp4,video/webm' : 'image/png,image/webp,image/jpeg,image/avif').then(function (file) {
        return upload(file, { dir: coverFolder(project), base: feedName(file) });
      }).then(function (result) {
        var feed = Object.assign({}, project.feed || {});
        if (kind === 'video') feed.video = result.url;
        else feed.image = result.url;
        if (result.width) { feed.width = result.width; feed.height = result.height; }
        if (!feed.image) feed.image = coverOf(project).image;
        project.feed = feed;
        if (result.width && Math.abs(result.width / result.height - size.ratio) > 0.02) toast('Пропорции файла ' + ratioText(result.width, result.height) + ', а плитке нужно ' + size.ratioText + ' — обложка будет обрезана или с полями', 'error');
        else toast('Обложка заменена');
        return saveFeed().then(renderFeedInspector);
      }).catch(fail);
    }

    append(panel, [
      h('div', { class: 'inspector__head' },
        h('h2', { text: project.title }),
        h('button', { type: 'button', class: 'ui-icon', 'aria-label': 'Закрыть', text: '✕', onclick: function () { state.selected = null; renderBoard(); renderFeedInspector(); } })),
      h('div', { class: 'cover-preview cover-preview--' + (project.place.big ? 'big' : 'normal') },
        cover.video ? h('video', { src: cover.video, poster: cover.image, muted: true, loop: true, autoplay: true, playsInline: true }) : h('img', { src: cover.image, alt: '' })),
      h('p', { class: mismatch ? 'warn' : 'muted' },
        'Сейчас: ' + (cover.width ? cover.width + ' × ' + cover.height + ' (' + ratioText(cover.width, cover.height) + ')' : 'размер неизвестен') +
        ' · нужно ' + size.ratioText + ', файл ' + size.file),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'ui-btn', text: 'Заменить картинку', onclick: function () { replaceCover('image'); } }),
        h('button', { type: 'button', class: 'ui-btn', text: cover.video ? 'Заменить видео' : 'Добавить видео', onclick: function () { replaceCover('video'); } }),
        cover.video ? h('button', { type: 'button', class: 'ui-btn ui-btn--ghost', text: 'Убрать видео', onclick: function () {
          var feed = Object.assign({}, project.feed); delete feed.video; project.feed = feed; saveFeed().then(renderFeedInspector);
        } }) : null),
      h('div', { class: 'segmented segmented--wide', role: 'group', 'aria-label': 'Размер плитки' },
        h('button', { type: 'button', 'aria-pressed': String(!project.place.big), text: 'Обычная 5:6', onclick: function () { if (project.place.big) setSize(project, false); } }),
        h('button', { type: 'button', 'aria-pressed': String(!!project.place.big), text: 'Крупная 2×2 · 3:4', onclick: function () { if (!project.place.big) setSize(project, true); } })),
      field('Название под обложкой', title),
      field('Описание картинки (alt)', alt, 'Что видно на обложке — для скринридеров и поиска.'),
      pageSection(project),
      h('hr'),
      h('button', { type: 'button', class: 'ui-btn ui-btn--danger', text: 'Убрать из ленты', onclick: function () {
        if (!confirm('Убрать «' + project.title + '» из ленты? Файлы и страница останутся.')) return;
        state.data.feed.projects = state.data.feed.projects.filter(function (item) { return item !== project; });
        state.selected = null;
        saveFeed().then(renderFeedInspector);
      } })
    ]);
  }
  var renderBoardSoon = debounce(function () { renderBoard(); }, 300);

  function pageSection(project) {
    var box = h('div', { class: 'callout' });
    if (!project.href) {
      append(box, [
        h('strong', { text: 'Страницы нет' }),
        h('p', { class: 'muted', text: 'В ленте стоит подпись «Скоро появится», обложка не кликается.' }),
        h('button', { type: 'button', class: 'ui-btn', text: 'Создать страницу кейса', onclick: function () {
          api('/api/project/page', { json: { id: project.id } }).then(function (result) {
            toast('Страница создана: ' + result.file);
            return load().then(function () { openPage(result.file); });
          }).catch(fail);
        } })
      ]);
      return box;
    }
    var page = state.data.pages.find(function (item) { return '/' + item.file.replace(/index\.html$/, '') === project.href; });
    var soon = h('input', { type: 'checkbox', checked: !!project.soon, onchange: function () {
      project.soon = soon.checked;
      saveFeed().then(renderFeedInspector);
    } });
    append(box, [
      h('strong', { text: 'Страница кейса' }),
      h('p', { class: 'muted' }, h('code', { text: project.href })),
      h('label', { class: 'check' }, soon, ' «Скоро появится» — страница ещё не открыта в ленте'),
      page && page.redirected ? h('p', { class: 'warn', text: 'На живом сайте этот адрес пока перенаправляется на Главную (.htaccess). Исправить можно в «Публикации».' }) : null,
      h('button', { type: 'button', class: 'ui-btn', text: 'Редактировать страницу →', onclick: function () { openPage((project.href.replace(/^\//, '') + 'index.html')); } })
    ]);
    return box;
  }

  function newProject(place) {
    var groups = state.data.groups.filter(function (name) { return !/^(articles|posts|playground|concepts)$/.test(name); });
    var title = h('input', { type: 'text', required: true, placeholder: 'Например: Карта переработки вещей' });
    var slug = h('input', { type: 'text', placeholder: 'заполнится по названию' });
    var group = h('select', {}, h('option', { value: '', text: '— без раздела —' }), groups.map(function (name) { return h('option', { value: name, text: name }); }));
    var big = h('select', {}, h('option', { value: '', text: 'Обычная 5:6 · файл 1500 × 1800' }), h('option', { value: 'big', text: 'Крупная 2×2 · 3:4 · файл 1800 × 2400' }));
    var page = h('input', { type: 'checkbox', checked: true });
    var image = h('input', { type: 'file', accept: 'image/png,image/webp,image/jpeg,image/avif', required: true });
    var video = h('input', { type: 'file', accept: 'video/mp4,video/webm' });
    var alt = h('textarea', { rows: 2, placeholder: 'Что видно на обложке' });
    var slugTouched = false;
    slug.addEventListener('input', function () { slugTouched = true; });
    title.addEventListener('input', function () { if (!slugTouched) slug.value = translit(title.value); });
    var submit = h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Создать' });
    var dialog = modal('Новый проект', [
      field('Название', title),
      field('Адрес страницы', slug, 'Латиницей через дефис: станет частью адреса /projects/…/'),
      field('Раздел (папка)', group),
      field('Размер плитки', big),
      field('Обложка ленты', image, 'Картинка в пропорциях плитки. PNG станет WebP без потерь.'),
      field('Видео-обложка (необязательно)', video, 'mp4 без звука, зацикленное, тех же пропорций. Картинка выше — его первый кадр.'),
      field('Описание обложки (alt)', alt),
      h('label', { class: 'check' }, page, ' Сразу создать страницу кейса (появится в «Страницах», в ленте пока «Скоро появится»)')
    ], [h('button', { class: 'ui-btn ui-btn--ghost', value: 'cancel', text: 'Отмена' }), submit]);

    submit.addEventListener('click', function () {
      if (!title.value.trim() || !image.files[0]) { toast('Нужны название и обложка', 'error'); return; }
      var id = slug.value.trim() || translit(title.value);
      var dir = ['projects', group.value, id].filter(Boolean).join('/') + '/covers';
      submit.disabled = true;
      var projects = state.data.feed.projects;
      var spot = place && fits(projects, null, Object.assign({}, place, big.value ? { big: true } : {})) ? Object.assign({}, place, big.value ? { big: true } : {}) : firstFree(projects, !!big.value);
      var feedCover = {};
      upload(image.files[0], { dir: dir, base: feedName(image.files[0]) }).then(function (result) {
        feedCover.image = result.url;
        feedCover.width = result.width;
        feedCover.height = result.height;
        if (!video.files[0]) return null;
        return upload(video.files[0], { dir: dir, base: feedName(video.files[0]) }).then(function (clip) {
          feedCover = { image: feedCover.image, video: clip.url, width: clip.width || feedCover.width, height: clip.height || feedCover.height };
        });
      }).then(function () {
        return api('/api/project', { json: { title: title.value.trim(), slug: id, group: group.value, page: page.checked, feed: feedCover, alt: alt.value.trim() || title.value.trim(), place: spot } });
      }).then(function (result) {
        dialog.close();
        toast('Проект добавлен в ленту');
        state.selected = result.project.id;
        return load().then(function () { dirty(); go('home'); });
      }).catch(function (error) { submit.disabled = false; fail(error); });
    });
  }

  // Обложки ленты называются feed-cover-*, как остальные в covers/.
  function feedName(file) { return /^feed-cover/i.test(file.name) ? file.name : 'feed-cover-' + file.name; }

  function translit(value) {
    var map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
    return value.toLowerCase().split('').map(function (char) { return map[char] !== undefined ? map[char] : char; }).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  }

  /* ═══ Страницы: визуальный редактор ══════════════════════════════════ */

  var DEVICES = { desktop: { width: 1440, label: 'Десктоп' }, tablet: { width: 820, label: 'Планшет' }, phone: { width: 390, label: 'Телефон' } };
  var STATUS = { case: 'кейс', stub: 'заготовка', page: 'раздел' };

  function openPage(file) {
    state.page = { file: file, device: (state.page && state.page.device) || 'desktop' };
    go('pages');
  }

  function renderPages() {
    var list = h('nav', { class: 'page-list', 'aria-label': 'Страницы' });
    var pages = state.data.pages;
    var groups = [
      ['Кейсы в ленте', pages.filter(function (page) { return page.project; })],
      ['Заготовки и черновики', pages.filter(function (page) { return !page.project && page.status !== 'page'; })],
      ['Разделы сайта', pages.filter(function (page) { return !page.project && page.status === 'page'; })]
    ];
    groups.forEach(function (group) {
      if (!group[1].length) return;
      append(list, h('h3', { text: group[0] }));
      group[1].forEach(function (page) {
        var chips = [h('span', { class: 'chip', text: STATUS[page.status] })];
        if (page.project && page.soon) chips.push(h('span', { class: 'chip chip--soon', text: 'скоро' }));
        if (page.redirected && page.project && !page.soon) chips.push(h('span', { class: 'chip chip--warn', text: 'редирект' }));
        append(list, h('button', {
          type: 'button', class: 'page-link', 'aria-current': state.page && state.page.file === page.file ? 'page' : 'false',
          onclick: function () { openPage(page.file); }
        }, h('span', { class: 'page-link__title', text: page.title }), h('span', { class: 'page-link__meta' }, page.file.replace(/^projects\/|\/index\.html$/g, ''), chips)));
      });
    });

    var stage = h('section', { class: 'stage' });
    var inspector = h('aside', { class: 'inspector', id: 'page-inspector' });
    append(view, [list, stage, inspector]);
    if (!state.page) {
      append(stage, h('div', { class: 'empty' }, h('h2', { text: 'Выберите страницу слева' }),
        h('p', { class: 'muted', text: 'Клик по тексту или картинке выбирает её, двойной клик по тексту — правка прямо на странице, файл можно перетащить на картинку из Finder.' })));
      return;
    }
    renderStage(stage);
    refreshPage();
  }

  function renderStage(stage) {
    var page = state.page;
    var info = state.data.pages.find(function (item) { return item.file === page.file; }) || { url: '/' + page.file };
    var holder = h('div', { class: 'device device--' + page.device });
    var frame = h('iframe', { class: 'device-frame', title: 'Редактор страницы', src: '/' + page.file + '?admin-edit=1' });
    page.frame = frame;
    append(holder, frame);
    append(stage, [
      h('div', { class: 'toolbar' },
        h('div', { class: 'segmented', role: 'group', 'aria-label': 'Ширина экрана' }, Object.keys(DEVICES).map(function (key) {
          return h('button', { type: 'button', 'aria-pressed': String(page.device === key), text: DEVICES[key].label + ' ' + DEVICES[key].width, onclick: function () {
            page.device = key; go('pages');
          } });
        })),
        h('span', { class: 'toolbar__hint muted small', text: 'Клик — выбрать · двойной клик по тексту — править · ⌥ клик — блок целиком · файл можно перетащить на картинку' }),
        h('a', { class: 'ui-btn', href: info.url, target: '_blank', rel: 'noopener', text: 'Открыть ↗' })),
      holder
    ]);
    fitDevice(holder, frame, DEVICES[page.device].width);
  }

  function refreshPage() {
    return api('/api/page?file=' + encodeURIComponent(state.page.file)).then(function (info) {
      state.page.info = info;
      if (!state.page.selection) renderPageInspector();
      return info;
    }).catch(fail);
  }

  function reloadPage(reselect) {
    state.page.reselect = reselect === undefined ? null : reselect;
    state.page.selection = null;
    return refreshPage().then(function () {
      var frame = state.page.frame;
      if (!frame || !frame.contentWindow) return;
      tell({ type: 'remember' });
      frame.contentWindow.location.reload();
      dirty();
    });
  }

  function tell(message) {
    var frame = state.page && state.page.frame;
    if (frame && frame.contentWindow) frame.contentWindow.postMessage(Object.assign({ target: 'admin-editor' }, message), location.origin);
  }

  function op(operation, reselect) {
    return api('/api/edit', { json: { file: state.page.file, version: state.page.info.version, op: operation } }).then(function (result) {
      if (result.changed && result.changed.length > 1) toast('Обновлено также: ' + result.changed.slice(1).join(', '));
      state.page.revealSelector = result.inserted ? '#' + result.inserted : null;
      return reloadPage(reselect);
    }).catch(function (error) {
      fail(error);
      if (error.status === 409) reloadPage();
    });
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || !event.data || event.data.source !== 'admin-editor' || !state.page) return;
    var data = event.data;
    if (data.type === 'ready') {
      if (state.page.info) state.page.info.version = data.version;
      if (state.page.revealSelector) {
        tell({ type: 'revealSelector', selector: state.page.revealSelector });
        state.page.revealSelector = null;
      } else if (state.page.reselect !== null && state.page.reselect !== undefined) {
        tell({ type: 'select', id: state.page.reselect });
        state.page.reselect = null;
      }
    } else if (data.type === 'select') {
      select(data.id, data.metrics);
    } else if (data.type === 'changed') {
      reloadPage(data.reselect);
    } else if (data.type === 'error') {
      fail(Error(data.message));
    } else if (data.type === 'dropFile') {
      describe(data.id).then(function (node) {
        state.page.selection = node;
        state.page.metrics = data.metrics;
        renderPageInspector();
        if (node.stub) return fillStub(node, data.file);
        var target = node.media.find(function (item) { return item.id === node.id; }) || node.media[node.media.length - 1];
        if (target) return replaceMedia(node, target, data.file);
      }).catch(fail);
    }
  });

  function describe(id) {
    return api('/api/node?file=' + encodeURIComponent(state.page.file) + '&id=' + id + '&version=' + state.page.info.version);
  }

  function select(id, metrics) {
    if (id === null || id === undefined) { state.page.selection = null; renderPageInspector(); return; }
    describe(id).then(function (node) {
      state.page.selection = node;
      state.page.metrics = metrics || state.page.metrics;
      renderPageInspector();
    }).catch(function (error) {
      if (error.status === 409) reloadPage(); else fail(error);
    });
  }

  function blockOf(node) {
    return node.chain.find(function (link) { return link.kind === 'block'; });
  }
  function mediaDir(node) {
    var block = blockOf(node);
    var base = dirOf(state.page.file);
    if (block && block.htmlId === 'summary') return base + '/covers';
    return base + '/media/' + (block && block.htmlId ? block.htmlId : 'gallery');
  }

  function replaceMedia(node, target, file) {
    var isVideo = /^video\//.test(file.type);
    return upload(file, { dir: mediaDir(node), page: state.page.file }).then(function (result) {
      var url = result.relative || result.url;
      var current = target.tag === 'video' || (target.tag === 'source' && /\.(mp4|webm)/.test(target.attrs.src || ''));
      if (target.tag !== 'source' && current !== isVideo) {
        return op({ type: 'swapMedia', id: target.id, url: url, width: result.width, height: result.height }, null);
      }
      var attribute = target.tag === 'source' && target.attrs.srcset !== undefined ? 'srcset' : 'src';
      return op({ type: 'setMedia', id: target.id, attr: attribute, url: url, width: result.width, height: result.height }, node.id);
    }).then(function () { toast('Файл заменён'); });
  }

  function fillStub(node, file) {
    return upload(file, { dir: mediaDir(node), page: state.page.file }).then(function (result) {
      return op({ type: 'fillStub', id: node.id, url: result.relative || result.url, width: result.width, height: result.height });
    }).then(function () { toast('Кадр вставлен'); });
  }

  function mediaLabel(item, node) {
    if (item.tag === 'source' && item.attrs.media) return /max-width/.test(item.attrs.media) ? 'Телефон (' + item.attrs.media.replace(/[()]/g, '') + ')' : 'Вариант ' + item.attrs.media;
    if (item.tag === 'img' && node.media.some(function (other) { return other.tag === 'source' && other.attrs.media; })) return 'Десктоп';
    if (item.tag === 'video') return 'Видео';
    if (item.tag === 'source') return 'Источник видео';
    return 'Картинка';
  }

  function placementHints(node) {
    var classes = node.chain.reduce(function (all, link) { return all.concat(link.classes); }, node.classes);
    var has = function (name) { return classes.indexOf(name) >= 0; };
    var hints = [];
    var block = blockOf(node);
    if (block && block.htmlId === 'summary') hints.push('Первый кадр кейса. Он же обложка страницы в данных Главной — обновится сам. Лучше 2880 × 1800 (16:10).');
    if (has('cg-photo')) hints.push('Кадр с фразой поверх: нужны две версии — десктоп около 21:9 (3840 × 1680) и телефон 4:5 (1200 × 1500). Слева внизу (на телефоне — внизу) оставьте светлое свободное поле под фразу.');
    else if (has('cg-gallery__tile--big')) hints.push('Крупная плитка галереи: две колонки и обе строки, лучше 5:6 (1400 × 1680).');
    else if (has('cg-gallery__tile')) hints.push('Плитка галереи: пропорции любые, без подписей. Ширина — одна или две колонки (--g-span).');
    else if (has('cg-bleed')) hints.push('Кадр стоит в ряду один и идёт до краёв экрана. Пропорции любые — берутся из файла.');
    else if (has('cg-l') || has('cg-r')) hints.push('Половина ширины. Парные кадры («До/После») делайте одного размера.');
    else if (has('cg-stage')) hints.push('Скриншот без своего фона, стоит по центру серой сцены.');
    else if (has('cg-t1') || has('cg-t2') || has('cg-t3')) hints.push('Треть ширины.');
    return hints;
  }

  function metricsHint(node) {
    var m = state.page.metrics;
    if (!m) return null;
    var natural = m.natural;
    var enough = natural && natural[0] >= m.recommended * 0.95;
    return h('div', { class: 'callout' },
      h('strong', { text: 'Размер файла' }),
      h('p', { text: 'Место на экране: ' + m.width + ' × ' + m.height + ' px при окне ' + m.viewport + ' px.' }),
      h('p', { text: 'Для чёткости (×' + m.density + ') нужен файл от ' + m.recommended + ' px по ширине.' }),
      m.stubRatio ? h('p', { text: 'Пропорции места: ' + m.stubRatio.replace(/\s/g, '') + ' — файл в тех же пропорциях встанет без пустот.' }) : null,
      natural ? h('p', { class: enough ? 'ok' : 'warn', text: 'Сейчас: ' + natural[0] + ' × ' + natural[1] + ' (' + ratioText(natural[0], natural[1]) + ') — ' + (enough ? 'хватает' : 'мелковат, будет мыльным') }) : null,
      placementHints(node).map(function (hint) { return h('p', { class: 'muted', text: hint }); }),
      state.page.device !== 'phone' ? h('p', { class: 'muted small', text: 'Переключите «Телефон», чтобы увидеть размер места на мобильном.' }) : null);
  }

  function renderPageInspector() {
    var panel = document.getElementById('page-inspector');
    if (!panel || !state.page || !state.page.info) return;
    clear(panel);
    var node = state.page.selection;
    if (!node) { renderPagePanel(panel); return; }

    append(panel, h('div', { class: 'inspector__head' },
      h('div', { class: 'crumbs' }, node.chain.slice().reverse().map(function (link, index, all) {
        var name = link.kind === 'block' ? 'Блок' : link.kind === 'item' ? 'Элемент' : link.kind === 'text' ? 'Текст' : link.tag;
        return h('button', { type: 'button', class: 'crumb' + (index === all.length - 1 ? ' is-current' : ''), text: name + (link.htmlId ? ' #' + link.htmlId : ''), onclick: function () {
          tell({ type: 'select', id: link.id });
        } });
      })),
      h('button', { type: 'button', class: 'ui-icon', 'aria-label': 'Снять выбор', text: '✕', onclick: function () { tell({ type: 'select', id: null }); } })));

    // Текст
    if (node.chain[0] && node.chain[0].kind === 'text' && node.chain[0].id === node.id) {
      append(panel, h('section', { class: 'panel' },
        h('h3', { text: 'Текст' }),
        h('blockquote', { class: 'quote', text: node.text }),
        h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Править на странице', onclick: function () { tell({ type: 'editText', id: node.id }); } }),
        h('p', { class: 'muted small', text: 'Или двойной клик по тексту. Enter — сохранить, Shift+Enter — перенос строки, Esc — отмена, ⌘B — жирный.' })));
    }

    // Пустое место под кадр
    if (node.stub) {
      append(panel, h('section', { class: 'panel' },
        h('h3', { text: 'Место под кадр' }),
        h('p', { text: node.text ? 'Подпись внутри: ' + node.text : '' }),
        h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Загрузить картинку или видео', onclick: function () {
          pickFile('image/*,video/mp4,video/webm').then(function (file) { return fillStub(node, file); }).catch(fail);
        } }),
        h('p', { class: 'muted small', text: 'Можно просто перетащить файл на серое поле на странице.' }),
        metricsHint(node)));
    }

    // Медиа
    if (!node.stub && node.media.length) {
      var picture = node.chain.some(function (link) { return link.tag === 'picture'; }) || node.media.some(function (item) { return item.tag === 'source' && item.attrs.media; });
      var pictureId = (node.chain.find(function (link) { return link.tag === 'picture'; }) || {}).id;
      append(panel, h('section', { class: 'panel' },
        h('h3', { text: 'Картинка и видео' }),
        node.media.map(function (item) {
          var src = item.attrs.src || item.attrs.srcset || '';
          var preview = /\.(mp4|webm)/.test(src) ? h('video', { src: src.charAt(0) === '/' ? src : '/' + dirOf(state.page.file) + '/' + src, muted: true }) : h('img', { src: src.charAt(0) === '/' ? src : '/' + dirOf(state.page.file) + '/' + src, alt: '' });
          var altInput = item.tag === 'img' || item.tag === 'video' ? h('textarea', { rows: 2 }) : null;
          var altName = item.tag === 'video' ? 'aria-label' : 'alt';
          if (altInput) {
            altInput.value = item.attrs[altName] || '';
            altInput.addEventListener('change', function () { var attrs = {}; attrs[altName] = altInput.value; op({ type: 'setAttrs', id: item.id, attrs: attrs }, node.id); });
          }
          return h('div', { class: 'media-row' },
            h('div', { class: 'media-row__thumb' }, preview),
            h('div', { class: 'media-row__body' },
              h('strong', { text: mediaLabel(item, node) }),
              h('code', { class: 'small', text: src }),
              item.attrs.width ? h('span', { class: 'muted small', text: item.attrs.width + ' × ' + item.attrs.height + ' · ' + ratioText(+item.attrs.width, +item.attrs.height) }) : null,
              h('div', { class: 'row' },
                h('button', { type: 'button', class: 'ui-btn', text: 'Заменить…', onclick: function () {
                  pickFile(item.tag === 'source' ? 'image/*' : 'image/*,video/mp4,video/webm').then(function (file) { return replaceMedia(node, item, file); }).catch(fail);
                } }),
                item.tag === 'video' ? h('button', { type: 'button', class: 'ui-btn ui-btn--ghost', text: item.attrs.poster ? 'Заменить постер' : 'Добавить постер', onclick: function () {
                  pickFile('image/*').then(function (file) { return upload(file, { dir: mediaDir(node), page: state.page.file }); }).then(function (result) {
                    return op({ type: 'setMedia', id: item.id, attr: 'poster', url: result.relative || result.url }, node.id);
                  }).catch(fail);
                } }) : null),
              altInput ? field(item.tag === 'video' ? 'Что показывает видео (aria-label)' : 'Описание картинки (alt)', altInput, item.tag === 'img' && !item.attrs.alt ? 'Пустой alt — для декоративных кадров.' : null) : null));
        }),
        picture && pictureId !== undefined && !node.media.some(function (item) { return item.tag === 'source' && item.attrs.media; }) ? h('button', { type: 'button', class: 'ui-btn', text: '+ Отдельная версия для телефона', onclick: function () {
          pickFile('image/*').then(function (file) { return upload(file, { dir: mediaDir(node), page: state.page.file }); }).then(function (result) {
            var html = '<source media="(max-width: 699px)" srcset="' + (result.relative || result.url) + '" width="' + result.width + '" height="' + result.height + '" />';
            return op({ type: 'insert', id: pictureId, where: 'prepend', html: html }, null);
          }).catch(fail);
        } }) : null,
        h('p', { class: 'muted small', text: 'Файл можно перетащить прямо на картинку на странице. PNG станет WebP без потерь; размеры в разметке обновятся.' }),
        metricsHint(node)));
    }

    // Ссылка
    if (node.link) {
      var href = h('input', { type: 'text', value: node.link.href });
      var blank = h('input', { type: 'checkbox', checked: node.link.target === '_blank' });
      var saveLink = function () {
        op({ type: 'setAttrs', id: node.link.id, attrs: { href: href.value.trim(), target: blank.checked ? '_blank' : null, rel: blank.checked ? 'noopener noreferrer' : null } }, node.id);
      };
      href.addEventListener('change', saveLink);
      blank.addEventListener('change', saveLink);
      append(panel, h('section', { class: 'panel' },
        h('h3', { text: 'Ссылка' }),
        field('Адрес', href, 'https://… — внешний сайт, #id — раздел этой страницы, /projects/… — другая страница.'),
        h('label', { class: 'check' }, blank, ' Открывать в новой вкладке')));
    }

    // Действия с элементами и блоками по цепочке
    node.chain.filter(function (link) { return link.kind === 'item' || link.kind === 'block'; }).forEach(function (link) {
      var isBlock = link.kind === 'block';
      var outlineItem = isBlock ? state.page.info.outline.find(function (item) { return item.id === link.id; }) : null;
      var panelBody = [
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'ui-btn', title: 'Выше', text: '↑ Выше', onclick: function () { op({ type: 'moveUp', id: link.id }); } }),
          h('button', { type: 'button', class: 'ui-btn', title: 'Ниже', text: '↓ Ниже', onclick: function () { op({ type: 'moveDown', id: link.id }); } }),
          h('button', { type: 'button', class: 'ui-btn', text: 'Дублировать', onclick: function () { op({ type: 'duplicate', id: link.id }); } }),
          h('button', { type: 'button', class: 'ui-btn ui-btn--danger', text: 'Удалить', onclick: function () {
            if (confirm(isBlock ? 'Удалить блок целиком?' : 'Удалить этот элемент?')) op({ type: 'remove', id: link.id });
          } }))
      ];
      if (!isBlock) panelBody.push(h('p', { class: 'muted small', text: classHint(link.classes) }));
      if (isBlock) {
        if (state.page.info.hasToc && link.htmlId && link.tag === 'section') {
          var toc = h('input', { type: 'text', value: outlineItem ? outlineItem.tocLabel : '' });
          toc.addEventListener('change', function () { op({ type: 'setTocLabel', htmlId: link.htmlId, label: toc.value.trim() }, link.id); });
          panelBody.push(field('Название в оглавлении', toc));
        }
        panelBody.push(h('div', { class: 'row' },
          link.tag === 'section' ? h('button', { type: 'button', class: 'ui-btn', text: '+ Добавить внутрь блока', onclick: function () { library('section', link.id); } }) : null,
          h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: '+ Новый блок ниже', onclick: function () { library('page', link.id); } })));
      }
      append(panel, h('section', { class: 'panel' }, h('h3', { text: isBlock ? 'Блок' + (outlineItem ? ' · ' + outlineItem.label : '') : 'Элемент · ' + describeClasses(link) }), panelBody));
    });
  }

  function describeClasses(link) {
    var names = { 'cg-figure': 'кадр с подписью', 'cg-item': 'пункт', 'cg-text': 'абзацы', 'cg-intro': 'шапка раздела', 'cg-meta': 'поля проекта', 'cg-photo': 'кадр с фразой', 'cg-gallery__tile': 'плитка галереи', 'cg-stub': 'место под кадр', 'case-cover__media': 'кадр' };
    for (var key in names) if (link.classes.indexOf(key) >= 0) return names[key];
    return { p: 'абзац', div: 'контейнер', figure: 'кадр', li: 'пункт списка', h2: 'заголовок' }[link.tag] || link.tag;
  }

  function classHint(classes) {
    var map = { 'cg-l': 'левая половина', 'cg-r': 'правая половина', 'cg-t1': 'первая треть', 'cg-t2': 'вторая треть', 'cg-t3': 'третья треть', 'cg-t23': 'две правые трети', 'cg-q1': 'первая четверть', 'cg-q234': 'три правые четверти', 'cg-bleed': 'до краёв экрана', 'cg-m-l': 'на телефоне — левая половина', 'cg-m-r': 'на телефоне — правая половина' };
    var found = classes.filter(function (name) { return map[name]; }).map(function (name) { return map[name]; });
    return found.length ? 'Место в сетке: ' + found.join(', ') + '.' : 'Занимает всю ширину раздела.';
  }

  function renderPagePanel(panel) {
    var info = state.page.info;
    var title = h('input', { type: 'text', value: info.title });
    var description = h('textarea', { rows: 3 });
    description.value = info.description;
    var saveMeta = function () { op({ type: 'setMeta', title: title.value.trim(), description: description.value.trim() }); };
    title.addEventListener('change', saveMeta);
    description.addEventListener('change', saveMeta);

    var outline = h('ol', { class: 'outline' });
    info.outline.forEach(function (block) {
      var row = h('li', { class: 'outline__row', draggable: 'true' },
        h('span', { class: 'outline__grip', 'aria-hidden': 'true', text: '⋮⋮' }),
        h('button', { type: 'button', class: 'outline__label', text: block.label, title: block.htmlId ? '#' + block.htmlId : '', onclick: function () { tell({ type: 'reveal', id: block.id }); } }),
        h('span', { class: 'outline__kind', text: { summary: 'обложка', gallery: 'галерея', section: '', other: '' }[block.kind] }),
        h('button', { type: 'button', class: 'ui-icon', 'aria-label': 'Выше', text: '↑', onclick: function () { op({ type: 'moveUp', id: block.id }); } }),
        h('button', { type: 'button', class: 'ui-icon', 'aria-label': 'Ниже', text: '↓', onclick: function () { op({ type: 'moveDown', id: block.id }); } }));
      row.addEventListener('mouseenter', function () { tell({ type: 'highlight', id: block.id }); });
      row.addEventListener('mouseleave', function () { tell({ type: 'highlight', id: null }); });
      row.addEventListener('dragstart', function (event) { event.dataTransfer.setData('text/block', String(block.id)); row.classList.add('is-dragging'); });
      row.addEventListener('dragend', function () { row.classList.remove('is-dragging'); });
      row.addEventListener('dragover', function (event) {
        event.preventDefault();
        var below = event.offsetY > row.clientHeight / 2;
        row.classList.toggle('is-over-top', !below);
        row.classList.toggle('is-over-bottom', below);
      });
      row.addEventListener('dragleave', function () { row.classList.remove('is-over-top', 'is-over-bottom'); });
      row.addEventListener('drop', function (event) {
        event.preventDefault();
        var below = row.classList.contains('is-over-bottom');
        row.classList.remove('is-over-top', 'is-over-bottom');
        var id = Number(event.dataTransfer.getData('text/block'));
        if (id !== block.id) op({ type: 'move', id: id, target: block.id, where: below ? 'after' : 'before' });
      });
      append(outline, row);
    });

    append(panel, [
      h('h2', { text: info.title || state.page.file }),
      info.stubs ? h('p', { class: 'warn', text: 'Пустых мест под кадры: ' + info.stubs + ' — кликните серое поле, чтобы загрузить файл.' }) : null,
      h('section', { class: 'panel' },
        h('h3', { text: 'Структура страницы' }),
        info.canBlocks ? [outline, h('p', { class: 'muted small', text: 'Перетаскивайте блоки, чтобы поменять порядок. Оглавление кейса обновится само.' }),
          h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: '+ Добавить блок в конец', onclick: function () { library('page', null); } })]
          : h('p', { class: 'muted', text: 'На этой странице нет сетки кейса — блоки не переставляются, но тексты, картинки и ссылки править можно.' })),
      h('section', { class: 'panel' },
        h('h3', { text: 'Название и описание' }),
        field('Заголовок вкладки', title),
        field('Описание для поиска и ссылок', description)),
      info.isGrid && info.hasPalette ? palettePanel(info) : null,
      info.isGrid ? h('details', { class: 'panel' },
        h('summary', { text: 'Правила раскладки кейса' }),
        h('ul', { class: 'rules' },
          h('li', { text: 'Картинки главнее текста: текст вспомогательный, не шире половины, одна мысль — одна колонка.' }),
          h('li', { text: 'Равные по смыслу вещи — равного размера: «До/После» — половины, три пункта — трети, четыре — четверти.' }),
          h('li', { text: 'Кадр, который стоит в ряду один, идёт до краёв экрана; скриншот без своего фона — на серой сцене.' }),
          h('li', { text: 'Пропорции медиа берутся из файла — ничего не обрезается.' }),
          h('li', { text: 'Весь текст одного цвета; серые только подписи. Без скруглений, плашек и цветных подложек.' }),
          h('li', { text: 'Кнопки — только из дизайн-системы (вставляются из библиотеки блоков).' }))) : null
    ]);
  }

  var PALETTE_LABELS = {
    '--case-surface': 'Фон цветных секций', '--case-accent': 'Акцент', '--case-accent-text': 'Текст на акценте',
    '--case-icon': 'Иконка', '--case-icon-ink': 'Знак на иконке', '--case-icon-2': 'Вторая иконка', '--case-icon-2-ink': 'Знак на второй иконке'
  };
  function palettePanel(info) {
    var inputs = {};
    var rows = Object.keys(PALETTE_LABELS).map(function (token) {
      var value = info.palette[token] || '';
      var color = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff' });
      var text = h('input', { type: 'text', value: value, placeholder: 'нейтральный', class: 'mono' });
      color.addEventListener('input', function () { text.value = color.value.toUpperCase(); });
      inputs[token] = text;
      return h('label', { class: 'swatch' }, color, h('span', { text: PALETTE_LABELS[token] }), text);
    });
    return h('details', { class: 'panel' },
      h('summary', { text: 'Палитра кейса' }),
      h('p', { class: 'muted small', text: 'Цвета под вайб проекта. Пустое поле — нейтральная гамма сайта. Кнопки палитру не берут.' }),
      rows,
      h('button', { type: 'button', class: 'ui-btn', text: 'Применить палитру', onclick: function () {
        var palette = {};
        Object.keys(inputs).forEach(function (token) { palette[token] = inputs[token].value.trim(); });
        op({ type: 'setPalette', palette: palette });
      } }));
  }

  function scheme(rects) {
    var svg = '<svg viewBox="0 0 120 100" aria-hidden="true"><rect width="120" height="100" fill="var(--scheme-bg)"/>';
    rects.forEach(function (r) {
      var fill = { h: 'var(--scheme-ink)', t: 'var(--scheme-text)', m: 'var(--scheme-media)', s: 'var(--scheme-stage)', b: 'var(--scheme-accent)' }[r[4]];
      var height = r[4] === 't' ? Math.max(4, r[3] * 10 - 6) : r[3] * 10 - 2;
      svg += '<rect x="' + (r[0] * 10 + 1) + '" y="' + (r[1] * 10 + 4) + '" width="' + (r[2] * 10 - 2) + '" height="' + height + '" rx="' + (r[4] === 'b' ? 4 : 0) + '" fill="' + fill + '"/>';
    });
    return svg + '</svg>';
  }

  function library(scope, targetId) {
    var items = window.adminBlocks.filter(function (block) { return block.scope === scope; });
    var dialog = modal(scope === 'page' ? 'Новый блок страницы' : 'Добавить внутрь блока', [
      h('p', { class: 'muted', text: scope === 'page'
        ? 'Блок встанет ' + (targetId === null ? 'в конец страницы' : 'сразу под выбранным') + '. Серые поля — места под картинки: размер подписан внутри, файл загружается кликом. Текст со знаком ✎ — заготовка.'
        : 'Элемент добавится в конец выбранного блока. Потом его можно переставить стрелками.' }),
      h('div', { class: 'library' }, items.map(function (block) {
        return h('button', { type: 'button', class: 'library__card', onclick: function () {
          dialog.close();
          op({ type: 'insert', id: targetId, where: scope === 'page' ? 'after' : 'append', html: block.html });
        } },
          h('span', { class: 'library__scheme', html: scheme(block.scheme) }),
          h('strong', { text: block.name }),
          h('span', { class: 'small', text: block.hint }),
          h('span', { class: 'small library__needs', text: block.needs }));
      }))
    ]);
  }

  /* ═══ Ссылки и файлы ═════════════════════════════════════════════════ */

  function renderLinks() {
    append(view, h('div', { class: 'loading', text: 'Загружаю…' }));
    api('/api/links').then(function (data) {
      clear(view);
      var email = h('input', { type: 'email', value: data.email });

      function listEditor(items, icons) {
        var body = h('div', { class: 'list-editor' });
        function draw() {
          clear(body);
          items.forEach(function (item, index) {
            var label = h('input', { type: 'text', value: item.label, oninput: function () { item.label = label.value; } });
            var names = icons.indexOf(item.icon) < 0 ? [item.icon].concat(icons) : icons;
            var icon = h('select', { onchange: function () { item.icon = icon.value; } }, names.map(function (name) { return h('option', { value: name, text: name, selected: name === item.icon }); }));
            var href = item.copy !== undefined
              ? h('span', { class: 'muted small', text: 'копирует адрес почты' })
              : h('input', { type: 'text', value: item.href || '', placeholder: 'https://…', oninput: function () { item.href = href.value; } });
            append(body, h('div', { class: 'list-editor__row' },
              h('span', { class: 'icon-preview' }, h('span', { class: 'muted small', text: '#' + (index + 1) })),
              label, icon, href,
              h('button', { type: 'button', class: 'ui-icon', 'aria-label': 'Выше', text: '↑', disabled: index === 0, onclick: function () { items.splice(index - 1, 0, items.splice(index, 1)[0]); draw(); } }),
              h('button', { type: 'button', class: 'ui-icon', 'aria-label': 'Удалить', text: '✕', onclick: function () { items.splice(index, 1); draw(); } })));
          });
          append(body, h('button', { type: 'button', class: 'ui-btn', text: '+ Добавить пункт', onclick: function () { items.push({ label: 'Новый пункт', icon: icons[0], href: 'https://' }); draw(); } }));
        }
        draw();
        return body;
      }

      var save = function () {
        api('/api/links', { json: { email: email.value.trim(), items: data.items, sections: data.sections } }).then(function () { toast('Сохранено'); dirty(); }).catch(fail);
      };

      append(view, h('div', { class: 'columns' },
        h('section', { class: 'card' },
          h('h2', { text: 'Резюме PDF' }),
          h('p', { class: 'muted', text: 'Кнопка «Резюме PDF» в шапке всех страниц ведёт на /cv.pdf. Новый файл заменит старый, а версия в ссылках (?v=' + data.resume + ') увеличится, чтобы CDN не отдавал старый.' }),
          h('div', { class: 'row' },
            h('a', { class: 'ui-btn', href: '/cv.pdf?v=' + data.resume, target: '_blank', rel: 'noopener', text: 'Открыть текущее ↗' }),
            h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Загрузить новый PDF', onclick: function () {
              pickFile('application/pdf').then(function (file) {
                return api('/api/resume', { method: 'POST', body: file });
              }).then(function (result) { toast('Резюме заменено, ссылки обновлены в ' + result.changed.length + ' файлах'); dirty(); go('links'); }).catch(fail);
            } }))),
        h('section', { class: 'card' },
          h('h2', { text: 'Связаться' }),
          h('p', { class: 'muted', text: 'Пункты окна «Связаться» на всех страницах. Иконки — из components/icons.' }),
          field('Почта (кнопка «Скопировать адрес почты»)', email),
          listEditor(data.items, data.icons.social),
          h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Сохранить контакты', onclick: save })),
        h('section', { class: 'card' },
          h('h2', { text: 'Пункты меню' }),
          h('p', { class: 'muted', text: 'Разделы в шапке и в меню на телефоне.' }),
          listEditor(data.sections, data.icons.plain),
          h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Сохранить меню', onclick: save }))));
    }).catch(fail);
  }

  /* ═══ Публикация ═════════════════════════════════════════════════════ */

  function renderPublish() {
    append(view, h('div', { class: 'loading', text: 'Смотрю изменения…' }));
    api('/api/publish').then(function (data) {
      clear(view);
      var message = h('input', { type: 'text', value: 'Обновление сайта из админки' });
      var log = h('pre', { class: 'log', hidden: true });
      var orphanChecks = data.orphans.map(function (item) {
        return { item: item, input: h('input', { type: 'checkbox', checked: !item.tracked }) };
      });
      var button = h('button', { type: 'button', class: 'ui-btn ui-btn--primary', text: 'Проверить и опубликовать', disabled: !data.status.length && !orphanChecks.length });
      button.addEventListener('click', function () {
        if (data.branch !== 'main' && !confirm('Сейчас ветка «' + data.branch + '», а сайт деплоится из main. Всё равно отправить?')) return;
        button.disabled = true;
        button.textContent = 'Проверяю и отправляю…';
        log.hidden = false;
        log.textContent = 'Запускаю проверки — это займёт до минуты…';
        api('/api/publish', { json: { message: message.value.trim(), removeOrphans: orphanChecks.filter(function (check) { return check.input.checked; }).map(function (check) { return check.item.file; }) } }).then(function (result) {
          log.textContent = result.log;
          log.classList.toggle('log--fail', !result.ok);
          toast(result.ok ? 'Опубликовано' : 'Не опубликовано — см. журнал', result.ok ? null : 'error');
          button.textContent = 'Проверить и опубликовать';
          button.disabled = false;
          dirty();
          load();
        }).catch(function (error) { fail(error); button.disabled = false; });
      });
      var codes = { M: 'изменён', A: 'добавлен', D: 'удалён', '??': 'новый', R: 'переименован' };
      append(view, h('div', { class: 'columns columns--publish' },
        h('section', { class: 'card' },
          h('h2', { text: 'Что изменилось' }),
          data.status.length ? h('ul', { class: 'changes' }, data.status.map(function (item) {
            return h('li', {}, h('span', { class: 'chip', text: codes[item.code] || item.code }), h('code', { text: item.file }));
          })) : h('p', { class: 'muted', text: 'Изменений нет — сайт совпадает с последней публикацией.' }),
          data.branch !== 'main' ? h('p', { class: 'warn', text: 'Ветка: ' + data.branch + '. Сайт деплоится только из main.' }) : null),
        h('section', { class: 'card' },
          h('h2', { text: 'Перед публикацией' }),
          data.warnings.length ? h('ul', { class: 'warnings' }, data.warnings.map(function (warning) {
            return h('li', {}, h('span', { text: warning.text }),
              warning.fix ? h('button', { type: 'button', class: 'ui-btn', text: 'Открыть страницу на сайте', onclick: function () {
                api('/api/unredirect', { json: { url: warning.fix.url } }).then(function () { toast('.htaccess обновлён'); go('publish'); dirty(); }).catch(fail);
              } }) : warning.file ? h('button', { type: 'button', class: 'ui-btn ui-btn--ghost', text: 'Открыть', onclick: function () { openPage(warning.file); } }) : null);
          })) : h('p', { class: 'ok', text: 'Замечаний нет.' }),
          orphanList(orphanChecks.filter(function (check) { return !check.item.tracked; }), 'Загруженные и больше не нужные файлы', 'На них не осталось ссылок — отмеченные удалятся при публикации.', true),
          orphanList(orphanChecks.filter(function (check) { return check.item.tracked; }), 'Давние неиспользуемые файлы', 'Лежат в репозитории, но ни одна страница на них не ссылается. Проверьте перед удалением: ссылку могут собирать скрипты.', false)),
        h('section', { class: 'card card--wide' },
          h('h2', { text: 'Опубликовать' }),
          h('p', { class: 'muted', text: 'Админка конвертирует PNG, прогонит те же проверки, что и деплой (npm run check), сделает коммит и отправит его в GitHub. Сайт обновится через 2–4 минуты после этого.' }),
          field('Что поменялось (сообщение коммита)', message),
          button,
          log)));
    }).catch(fail);
  }

  function orphanList(checks, title, note, open) {
    if (!checks.length) return null;
    var size = checks.reduce(function (sum, check) { return sum + check.item.size; }, 0);
    var rows = checks.map(function (check) {
      return h('label', { class: 'check' }, check.input, ' ', h('code', { text: check.item.file }), h('span', { class: 'muted small', text: ' ' + Math.round(check.item.size / 1024) + ' КБ' }));
    });
    return h('details', { class: 'panel', open: open },
      h('summary', { text: title + ' · ' + checks.length + ' · ' + (size / 1048576).toFixed(1) + ' МБ' }),
      h('p', { class: 'muted small', text: note }),
      open ? null : h('button', { type: 'button', class: 'ui-btn ui-btn--ghost', text: 'Отметить все', onclick: function () { checks.forEach(function (check) { check.input.checked = true; }); } }),
      rows);
  }

  /* ─── Старт ─── */

  load().then(function () {
    var tab = 'home';
    try { tab = localStorage.getItem('admin-tab') || 'home'; } catch (error) { /* по умолчанию Главная */ }
    if (tab === 'pages') {
      try { var last = localStorage.getItem('admin-page'); if (last) state.page = { file: last, device: 'desktop' }; } catch (error) { /* ничего */ }
    }
    go(tab);
    dirty();
  }).catch(function (error) {
    append(view, h('div', { class: 'empty' }, h('h2', { text: 'Сервер админки не отвечает' }), h('p', { text: 'Запустите в терминале: npm run admin. ' + error.message })));
  });

  var remember = function () { try { if (state.page) localStorage.setItem('admin-page', state.page.file); } catch (error) { /* ничего */ } };
  window.addEventListener('beforeunload', remember);
})();
