(function () {
  'use strict';

  // Триггеры — любые превью интерфейса на странице кейса (см. критерий
  // отбора в case-lightbox.css: реальный alt, а не декоративная метрика/
  // аватар команды). Подключается один раз на страницу проекта и сама
  // находит все подходящие фото — переписывать поведение на новой
  // странице кейса не нужно.
  var SELECTOR = '.case-cover__media img, .case-card__media img, .case-card__media-overlay, .case-role__col-art img';

  var MIN_SCALE = 1;
  var MAX_SCALE = 4;
  var DBLTAP_SCALE = 2.5;
  var SWIPE_THRESHOLD = 60;
  var TAP_SLOP = 10;
  var DBLTAP_MS = 300;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(init);

  function init() {
    var items = Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (img) {
      var alt = img.getAttribute('alt');
      // «О проекте» — свой отдельный, некликабельный контекст (декоративный
      // фон + плавающий скриншот меню поверх него): в общую галерею
      // страницы (счётчик/пролистывание по всем фото) не входит.
      return !!(alt && alt.trim()) && !img.closest('#about, .case-about');
    });
    if (!items.length) return;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var root = document.createElement('div');
    root.className = 'case-lightbox';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Просмотр фото интерфейса');
    root.innerHTML =
      '<header class="case-lightbox__bar">' +
        '<p class="case-lightbox__counter text-body-sm">Фото <span data-lightbox-current>1</span> из <span data-lightbox-total>' + items.length + '</span></p>' +
        '<button type="button" class="btn btn--fill-plain btn--icon-only case-lightbox__close" aria-label="Закрыть"><span class="icon icon--close" aria-hidden="true"></span></button>' +
      '</header>' +
      '<button type="button" class="btn btn--fill-white btn--icon-only btn--media-control case-lightbox__nav case-lightbox__nav--prev" aria-label="Предыдущее фото"><span class="icon icon--arrow-left" aria-hidden="true"></span></button>' +
      '<button type="button" class="btn btn--fill-white btn--icon-only btn--media-control case-lightbox__nav case-lightbox__nav--next" aria-label="Следующее фото"><span class="icon icon--arrow-right" aria-hidden="true"></span></button>' +
      '<div class="case-lightbox__viewport">' +
        '<img class="case-lightbox__image" alt="" draggable="false" />' +
      '</div>';
    document.body.appendChild(root);

    var closeBtn = root.querySelector('.case-lightbox__close');
    var prevBtn = root.querySelector('.case-lightbox__nav--prev');
    var nextBtn = root.querySelector('.case-lightbox__nav--next');
    var viewport = root.querySelector('.case-lightbox__viewport');
    var image = root.querySelector('.case-lightbox__image');
    var currentEl = root.querySelector('[data-lightbox-current]');

    var index = 0;
    var lastFocused = null;
    var inactive = [];

    var scale = 1, tx = 0, ty = 0;
    var baseW = 0, baseH = 0;
    var pointers = {};
    var pinchStartDist = 0, pinchStartScale = 1;
    var panStartX = 0, panStartY = 0, panStartTx = 0, panStartTy = 0;
    var dragActive = false, dragMoved = false;
    var lastTapTime = 0, lastTapX = 0, lastTapY = 0;

    // Наведение/фокус должны уменьшать всю плитку-контейнер с фото
    // (рамку, в которой лежит картинка), а не саму картинку внутри неё —
    // иначе на кроп-рамках (object-fit: cover) уменьшается только
    // содержимое, открывая фон рамки по краям. Плавающий скриншот поверх
    // фонового фото (.case-card__media-overlay) — сам себе рамка, его не
    // оборачиваем.
    items.forEach(function (img, i) {
      var target = img.classList.contains('case-card__media-overlay')
        ? img
        : (img.closest('.case-cover__media') || img.closest('.case-card--media') || img.closest('.case-role__col-art') || img.parentElement);
      target.classList.add('case-lightbox-openable');
      target.tabIndex = 0;
      target.setAttribute('role', 'button');
      if (!target.hasAttribute('aria-label')) {
        target.setAttribute('aria-label', 'Открыть фото ' + (i + 1) + ' из ' + items.length + ' на весь экран');
      }
      target.addEventListener('click', function () { open(i, target); });
      target.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          open(i, target);
        }
      });
    });

    function computeBaseSize() {
      var vw = viewport.clientWidth || 1;
      var vh = viewport.clientHeight || 1;
      var natW = image.naturalWidth || vw;
      var natH = image.naturalHeight || vh;
      var ratio = Math.min(1, vw / natW, vh / natH);
      baseW = natW * ratio;
      baseH = natH * ratio;
    }

    function setTransform(animate) {
      image.style.transitionProperty = animate ? 'transform' : 'none';
      image.style.transitionDuration = '.25s';
      image.style.transitionTimingFunction = 'ease';
      image.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      image.classList.toggle('is-zoomed', scale > 1.001);
    }

    function clampPan(scaleVal, txVal, tyVal) {
      var maxX = Math.max(0, (baseW * scaleVal - viewport.clientWidth) / 2);
      var maxY = Math.max(0, (baseH * scaleVal - viewport.clientHeight) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, txVal)),
        y: Math.min(maxY, Math.max(-maxY, tyVal))
      };
    }

    function zoomAt(newScale, clientX, clientY, animate) {
      newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      var vpRect = viewport.getBoundingClientRect();
      var px = clientX - (vpRect.left + vpRect.width / 2);
      var py = clientY - (vpRect.top + vpRect.height / 2);
      var ratio = newScale / scale;
      var rawTx = px - (px - tx) * ratio;
      var rawTy = py - (py - ty) * ratio;
      var clamped = clampPan(newScale, rawTx, rawTy);
      scale = newScale;
      tx = clamped.x;
      ty = clamped.y;
      setTransform(animate);
    }

    var switchTimer = 0;

    function applyImage(i) {
      index = i;
      var src = items[index];
      scale = 1; tx = 0; ty = 0;
      image.alt = src.getAttribute('alt') || '';
      image.src = src.currentSrc || src.src;
      setTransform(false);
      currentEl.textContent = String(index + 1);
    }

    // Плавная мягкая смена фото — краткий кроссфейд, а не мгновенная
    // подмена src. Открытие первого фото — без фейда, только пролистывание.
    function show(i, animate) {
      window.clearTimeout(switchTimer);
      if (!animate || reducedMotion.matches) {
        image.style.opacity = '';
        applyImage(i);
        return;
      }
      image.style.transitionProperty = 'opacity';
      image.style.transitionDuration = '.16s';
      image.style.transitionTimingFunction = 'ease';
      image.style.opacity = '0';
      switchTimer = window.setTimeout(function () {
        applyImage(i);
        void image.offsetWidth; // reflow: committer opacity:0 перед фейдом обратно
        image.style.transitionProperty = 'opacity';
        image.style.transitionDuration = '.22s';
        image.style.opacity = '1';
      }, 160);
    }

    function navigate(delta) {
      show((index + delta + items.length) % items.length, true);
    }

    image.addEventListener('load', computeBaseSize);

    function handleTap(e) {
      var now = Date.now();
      var dx = e.clientX - lastTapX, dy = e.clientY - lastTapY;
      if (now - lastTapTime < DBLTAP_MS && Math.hypot(dx, dy) < 30) {
        var target = scale > 1.001 ? 1 : DBLTAP_SCALE;
        zoomAt(target, e.clientX, e.clientY, true);
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = e.clientX;
        lastTapY = e.clientY;
      }
    }

    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

    viewport.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(scale * factor, e.clientX, e.clientY, false);
    }, { passive: false });

    viewport.addEventListener('pointerdown', function (e) {
      viewport.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var p0 = pointers[ids[0]], p1 = pointers[ids[1]];
        pinchStartDist = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        pinchStartScale = scale;
        dragActive = false;
      } else if (ids.length === 1) {
        dragActive = true;
        dragMoved = false;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartTx = tx;
        panStartTy = ty;
      }
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var p0 = pointers[ids[0]], p1 = pointers[ids[1]];
        var dist = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        var mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        zoomAt(pinchStartScale * (dist / pinchStartDist), mid.x, mid.y, false);
      } else if (ids.length === 1 && dragActive) {
        var dx = e.clientX - panStartX;
        var dy = e.clientY - panStartY;
        if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) dragMoved = true;
        if (scale > 1.001) {
          var clamped = clampPan(scale, panStartTx + dx, panStartTy + dy);
          tx = clamped.x; ty = clamped.y;
          setTransform(false);
          image.classList.add('is-panning');
        }
      }
    });

    function endPointer(e) {
      var hadTwo = Object.keys(pointers).length === 2;
      var wasSingleDrag = dragActive && Object.keys(pointers).length === 1;
      var dx = 0, dy = 0;
      if (wasSingleDrag) {
        dx = e.clientX - panStartX;
        dy = e.clientY - panStartY;
      }
      delete pointers[e.pointerId];
      image.classList.remove('is-panning');
      var remaining = Object.keys(pointers).length;

      if (remaining === 1) {
        var id = Object.keys(pointers)[0];
        panStartX = pointers[id].x;
        panStartY = pointers[id].y;
        panStartTx = tx;
        panStartTy = ty;
        dragActive = true;
        dragMoved = false;
        return;
      }

      dragActive = false;
      if (hadTwo) {
        if (scale < 1.05) { scale = 1; tx = 0; ty = 0; setTransform(true); }
        return;
      }
      if (!wasSingleDrag) return;
      if (!dragMoved) {
        handleTap(e);
        return;
      }
      if (scale <= 1.001 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        navigate(dx < 0 ? 1 : -1);
      }
    }

    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    window.addEventListener('resize', function () {
      if (root.hidden) return;
      computeBaseSize();
      var clamped = clampPan(scale, tx, ty);
      tx = clamped.x; ty = clamped.y;
      setTransform(false);
    });

    function onKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft') { navigate(-1); return; }
      if (e.key === 'ArrowRight') { navigate(1); }
    }

    // Открытие/закрытие «вырастает»/«сжимается» из кликнутого превью —
    // тот же приём и тайминги (clip-path из --lightbox-origin), что у
    // диалога «Связаться» (components/site-chrome/site-chrome.css).
    function setOrigin(triggerEl) {
      if (!triggerEl || !triggerEl.getBoundingClientRect) {
        root.style.removeProperty('--lightbox-origin');
        return;
      }
      var r = triggerEl.getBoundingClientRect();
      var right = window.innerWidth - r.right;
      var bottom = window.innerHeight - r.bottom;
      root.style.setProperty(
        '--lightbox-origin',
        'inset(' + r.top + 'px ' + right + 'px ' + bottom + 'px ' + r.left + 'px round var(--wg-radius, 28px))'
      );
    }

    var closeTimer = 0;
    function closeAnimated(done) {
      if (root.hidden || root.classList.contains('is-closing')) { if (done) done(); return; }
      if (reducedMotion.matches) { root.hidden = true; if (done) done(); return; }
      root.classList.add('is-closing');
      function finish(e) {
        if (e && (e.target !== root || e.animationName !== 'case-lightbox-surface-out')) return;
        root.removeEventListener('animationend', finish);
        window.clearTimeout(closeTimer);
        root.hidden = true;
        root.classList.remove('is-closing');
        if (done) done();
      }
      root.addEventListener('animationend', finish);
      closeTimer = window.setTimeout(finish, 750);
    }

    function open(i, triggerEl) {
      lastFocused = triggerEl || document.activeElement;
      setOrigin(triggerEl);
      inactive = Array.prototype.filter.call(document.body.children, function (el) { return el !== root; });
      inactive.forEach(function (el) { el.inert = true; });
      document.documentElement.classList.add('contact-scroll-lock');
      root.classList.remove('is-closing');
      root.hidden = false;
      show(i);
      document.addEventListener('keydown', onKeydown);
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      closeAnimated(function () {
        image.removeAttribute('src');
        document.documentElement.classList.remove('contact-scroll-lock');
        inactive.forEach(function (el) { el.inert = false; });
        inactive = [];
        document.removeEventListener('keydown', onKeydown);
        if (lastFocused && typeof lastFocused.focus === 'function') {
          lastFocused.focus({ preventScroll: true });
        }
      });
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { navigate(-1); });
    nextBtn.addEventListener('click', function () { navigate(1); });
  }
})();
