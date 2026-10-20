/*
  Режим правки внутри страницы (подключает scripts/admin/server.js при ?admin-edit).
  Подсвечивает текст, медиа, пункты и блоки; клик выбирает элемент и сообщает
  админке, двойной клик по тексту — правка прямо на странице. Файл,
  перетащенный на картинку, уходит в админку на замену.
*/
(function () {
  'use strict';
  var page = window.__adminPage;
  if (!page || window.parent === window) return;
  var root = document.documentElement;
  root.classList.add('admin-edit');
  var parentOrigin = location.origin;
  var post = function (message) { window.parent.postMessage(Object.assign({ source: 'admin-editor' }, message), parentOrigin); };
  var scrollKey = 'admin-scroll:' + page.file;

  var hover = box('admin-box admin-box--hover');
  var selected = box('admin-box admin-box--selected');
  var current = null;
  var hovered = null;
  var editing = null;

  function box(className) {
    var element = document.createElement('div');
    element.className = className;
    element.innerHTML = '<span class="admin-box__label"></span>';
    element.hidden = true;
    document.body.appendChild(element);
    return element;
  }

  var MEDIA = 'img[data-admin-id], video[data-admin-id], .cg-stub[data-admin-id]';
  function pick(target, wide) {
    if (!target || !target.closest) return null;
    if (target.closest('.admin-box')) return null;
    if (wide) return target.closest('[data-admin-item]') || target.closest('[data-admin-block]');
    return target.closest(MEDIA) || target.closest('[data-admin-text]') || target.closest('[data-admin-item]') || target.closest('[data-admin-block]');
  }

  function kind(element) {
    if (element.matches('.cg-stub')) return 'stub';
    if (element.matches('img, video')) return 'media';
    if (element.hasAttribute('data-admin-text')) return 'text';
    if (element.hasAttribute('data-admin-block')) return 'block';
    return 'item';
  }

  function label(element) {
    var type = kind(element);
    if (type === 'stub') return 'Место под кадр · загрузить';
    if (type === 'media') {
      var w = element.naturalWidth || element.videoWidth, h = element.naturalHeight || element.videoHeight;
      return (element.tagName === 'VIDEO' ? 'Видео' : 'Картинка') + (w ? ' ' + w + '×' + h : '');
    }
    if (type === 'text') return 'Текст · двойной клик — править';
    if (type === 'block') {
      var heading = element.querySelector('h1, h2');
      return 'Блок' + (heading ? ' · ' + heading.textContent.trim().slice(0, 40) : '');
    }
    return 'Элемент';
  }

  function place(frame, element, text) {
    if (!element || !element.isConnected) { frame.hidden = true; return; }
    var rect = element.getBoundingClientRect();
    frame.hidden = false;
    frame.style.transform = 'translate(' + rect.left + 'px,' + rect.top + 'px)';
    frame.style.width = rect.width + 'px';
    frame.style.height = rect.height + 'px';
    frame.setAttribute('data-kind', kind(element));
    if (text !== undefined) frame.firstChild.textContent = text;
  }

  function metrics(element) {
    var rect = element.getBoundingClientRect();
    var phone = innerWidth < 700;
    var density = phone ? 3 : 2;
    return {
      width: Math.round(rect.width), height: Math.round(rect.height), viewport: innerWidth, density: density,
      recommended: Math.ceil(rect.width * density / 10) * 10,
      natural: element.naturalWidth ? [element.naturalWidth, element.naturalHeight] : element.videoWidth ? [element.videoWidth, element.videoHeight] : null,
      stubRatio: element.matches('.cg-stub') ? getComputedStyle(element).aspectRatio : null
    };
  }

  function select(element, silent) {
    current = element;
    place(selected, element, element ? label(element) : '');
    if (!element) { if (!silent) post({ type: 'select', id: null }); return; }
    if (!silent) post({ type: 'select', id: Number(element.getAttribute('data-admin-id')), kind: kind(element), metrics: metrics(element) });
  }

  function byId(id) { return document.querySelector('[data-admin-id="' + id + '"]'); }

  document.addEventListener('mousemove', function (event) {
    if (editing) return;
    var element = pick(event.target, event.altKey);
    if (element === hovered) return;
    hovered = element;
    if (!element || element === current) { hover.hidden = true; return; }
    place(hover, element, label(element));
  }, true);
  document.addEventListener('mouseleave', function () { hover.hidden = true; hovered = null; });

  // Ссылки, просмотр картинок и кнопки страницы в режиме правки не срабатывают.
  window.addEventListener('click', function (event) {
    if (editing && editing.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (editing) { finish(true); return; }
    select(pick(event.target, event.altKey));
  }, true);
  ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'auxclick'].forEach(function (type) {
    window.addEventListener(type, function (event) {
      if (editing && editing.contains(event.target)) return;
      event.stopImmediatePropagation();
    }, true);
  });
  window.addEventListener('submit', function (event) { event.preventDefault(); }, true);

  window.addEventListener('dblclick', function (event) {
    var element = event.target.closest && event.target.closest('[data-admin-text]');
    if (!element || editing) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    edit(element);
  }, true);

  /* ─── Правка текста на месте ─── */

  function api(url, options) {
    options = options || {};
    options.headers = Object.assign({ 'X-Admin': '1' }, options.headers || {});
    return fetch(url, options).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw Error(data.error || response.statusText);
        return data;
      });
    });
  }

  function edit(element) {
    var id = element.getAttribute('data-admin-id');
    select(element);
    api('/api/node?file=' + encodeURIComponent(page.file) + '&id=' + id + '&version=' + page.version).then(function (info) {
      editing = element;
      element.__adminBefore = element.innerHTML;
      // Текст из исходника: типографика страницы уже расставила неразрывные пробелы.
      element.innerHTML = info.inner;
      element.setAttribute('contenteditable', 'true');
      element.setAttribute('spellcheck', 'true');
      element.classList.add('admin-editing');
      hover.hidden = true;
      selected.hidden = true;
      element.focus();
      var range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      var selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      post({ type: 'editing', id: Number(id) });
    }).catch(function (error) { post({ type: 'error', message: error.message }); });
  }

  function finish(save) {
    var element = editing;
    if (!element) return;
    editing = null;
    element.removeAttribute('contenteditable');
    element.classList.remove('admin-editing');
    var html = element.innerHTML;
    if (!save) {
      element.innerHTML = element.__adminBefore;
      place(selected, element, label(element));
      post({ type: 'editing', id: null });
      return;
    }
    remember();
    api('/api/edit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: page.file, version: page.version, op: { type: 'setInner', id: Number(element.getAttribute('data-admin-id')), html: html } })
    }).then(function (result) {
      post({ type: 'changed', reselect: Number(element.getAttribute('data-admin-id')), result: result });
    }).catch(function (error) {
      element.innerHTML = element.__adminBefore;
      post({ type: 'error', message: error.message });
    });
  }

  document.addEventListener('keydown', function (event) {
    if (!editing) {
      if (event.key === 'Escape') select(null);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); editing.blur(); }
    else if (event.key === 'Escape') { event.preventDefault(); finish(false); }
    event.stopPropagation();
  }, true);
  document.addEventListener('focusout', function (event) {
    if (editing && event.target === editing) finish(true);
  }, true);
  document.addEventListener('paste', function (event) {
    if (!editing) return;
    event.preventDefault();
    var text = (event.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  }, true);

  /* ─── Файл, перетащенный на картинку ─── */

  var dropTarget = null;
  document.addEventListener('dragover', function (event) {
    var element = event.target.closest && event.target.closest(MEDIA);
    if (!element || !event.dataTransfer || Array.prototype.indexOf.call(event.dataTransfer.types, 'Files') < 0) return;
    event.preventDefault();
    dropTarget = element;
    place(hover, element, 'Отпустите — заменить файл');
    hover.classList.add('admin-box--drop');
  }, true);
  document.addEventListener('dragleave', function () { hover.classList.remove('admin-box--drop'); }, true);
  document.addEventListener('drop', function (event) {
    hover.classList.remove('admin-box--drop');
    var element = dropTarget;
    dropTarget = null;
    if (!element || !event.dataTransfer.files.length) return;
    event.preventDefault();
    select(element);
    post({ type: 'dropFile', id: Number(element.getAttribute('data-admin-id')), kind: kind(element), metrics: metrics(element), file: event.dataTransfer.files[0] });
  }, true);

  /* ─── Команды админки ─── */

  window.addEventListener('message', function (event) {
    if (event.origin !== parentOrigin || !event.data || event.data.target !== 'admin-editor') return;
    var data = event.data;
    if (data.type === 'select' || data.type === 'reveal') {
      var element = data.id === null ? null : byId(data.id);
      if (element && data.type === 'reveal') element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      select(element, data.silent);
    } else if (data.type === 'revealSelector') {
      var found = document.querySelector(data.selector);
      var block = found && (found.closest('[data-admin-block]') || found);
      if (block) { block.scrollIntoView({ block: 'start' }); select(block); }
    } else if (data.type === 'highlight') {
      var target = data.id === null ? null : byId(data.id);
      if (target) place(hover, target, label(target)); else hover.hidden = true;
    } else if (data.type === 'editText') {
      var text = byId(data.id);
      if (text && text.hasAttribute('data-admin-text')) edit(text);
    } else if (data.type === 'remember') {
      remember();
    }
  });

  function remember() {
    try { sessionStorage.setItem(scrollKey, String(scrollY)); } catch (error) { /* без памяти прокрутки */ }
  }
  function restore() {
    var saved = null;
    try { saved = sessionStorage.getItem(scrollKey); } catch (error) { /* ничего */ }
    if (saved !== null) window.scrollTo(0, Number(saved));
  }

  function follow() {
    if (current && !editing) place(selected, current);
    if (hovered && !hover.hidden && !editing) place(hover, hovered);
  }
  addEventListener('scroll', follow, { passive: true });
  addEventListener('resize', follow);
  addEventListener('load', function () { restore(); setTimeout(restore, 120); });
  addEventListener('beforeunload', remember);
  // Медиа догружаются и сдвигают раскладку — рамки следуют за элементами.
  setInterval(follow, 400);
  post({ type: 'ready', file: page.file, version: page.version });
})();
