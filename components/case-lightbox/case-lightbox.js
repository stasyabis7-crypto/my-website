(function () {
  'use strict';

  // Триггеры — любые превью интерфейса на странице кейса (см. критерий
  // отбора в case-lightbox.css: реальный alt, а не декоративная метрика/
  // аватар команды). Подключается один раз на страницу проекта и сама
  // находит все подходящие фото — переписывать поведение на новой
  // странице кейса не нужно.
  // Видео (обложка кейса) входят в ту же галерею: в полноэкранном слайде
  // у них свои контролы — плей/пауза, дорожка и время. Подпись у видео —
  // aria-label вместо alt.
  var SELECTOR = '.case-cover__media img, .case-cover__media video, .case-card__media img, .case-card__media video, .case-card__media-overlay, .case-role__col-art img';

  var MIN_SCALE = 1;
  var MAX_SCALE = 4;
  var DBLTAP_SCALE = 2.5;
  var TAP_SLOP = 10;
  var DBLTAP_MS = 300;
  var SLIDE_GAP = 2;
  // На десктопе пролистывание медленнее и мягче, чем на телефоне (там
  // лента сначала едет за пальцем); дальние прыжки по миниатюре
  // растягиваются по длине пути, чтобы не «телепортировать».
  var SLIDE_EASING = 'cubic-bezier(.25,.8,.25,1)';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(init);

  function init() {
    function isVideo(el) { return el.tagName === 'VIDEO'; }
    function labelOf(el) {
      return el.getAttribute('alt') || (isVideo(el) ? el.getAttribute('aria-label') : '') || '';
    }

    var items = Array.prototype.filter.call(document.querySelectorAll(SELECTOR), function (img) {
      var alt = labelOf(img);
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
        '<p class="case-lightbox__counter text-body-sm"><span data-lightbox-kind>Фото</span> <span data-lightbox-current>1</span> из <span data-lightbox-total>' + items.length + '</span></p>' +
        '<button type="button" class="btn btn--fill-plain btn--icon-only case-lightbox__close" aria-label="Закрыть"><span class="icon icon--close" aria-hidden="true"></span></button>' +
      '</header>' +
      '<button type="button" class="btn btn--fill-white btn--icon-only btn--media-control case-lightbox__nav case-lightbox__nav--prev" aria-label="Предыдущее фото"><span class="icon icon--arrow-left" aria-hidden="true"></span></button>' +
      '<button type="button" class="btn btn--fill-white btn--icon-only btn--media-control case-lightbox__nav case-lightbox__nav--next" aria-label="Следующее фото"><span class="icon icon--arrow-right" aria-hidden="true"></span></button>' +
      '<div class="case-lightbox__viewport"><div class="case-lightbox__track"></div></div>' +
      '<div class="case-lightbox__thumbs"></div>';
    document.body.appendChild(root);

    var closeBtn = root.querySelector('.case-lightbox__close');
    var prevBtn = root.querySelector('.case-lightbox__nav--prev');
    var nextBtn = root.querySelector('.case-lightbox__nav--next');
    var viewport = root.querySelector('.case-lightbox__viewport');
    var track = root.querySelector('.case-lightbox__track');
    var thumbsEl = root.querySelector('.case-lightbox__thumbs');
    var currentEl = root.querySelector('[data-lightbox-current]');
    var kindEl = root.querySelector('[data-lightbox-kind]');

    // Все фото лежат в одной ленте рядом (как в обычном слайдере) —
    // src больше не подменяется на лету, поэтому нет мигания пустой
    // картинки; пролистывание — это только сдвиг ленты.
    var slides = [];
    var thumbs = [];
    var players = [];
    items.forEach(function (src, i) {
      var slide = document.createElement('div');
      slide.className = 'case-lightbox__slide';
      var im;
      if (isVideo(src)) {
        slide.classList.add('case-lightbox__slide--video');
        im = document.createElement('video');
        im.className = 'case-lightbox__image case-lightbox__video';
        im.setAttribute('aria-label', labelOf(src));
        im.muted = true;
        im.loop = true;
        im.playsInline = true;
        im.preload = 'none';
        slide.appendChild(im);
        players[i] = createPlayer(im, slide);
      } else {
        im = document.createElement('img');
        im.className = 'case-lightbox__image';
        im.alt = labelOf(src);
        im.draggable = false;
        im.decoding = 'async';
        slide.appendChild(im);
      }
      track.appendChild(slide);
      slides.push(im);

      var th = document.createElement('div');
      th.className = 'case-lightbox__thumb';
      th.tabIndex = 0;
      th.setAttribute('role', 'button');
      th.setAttribute('aria-label', 'Фото ' + (i + 1) + ' из ' + items.length);
      var ti = document.createElement('img');
      ti.alt = '';
      ti.draggable = false;
      th.appendChild(ti);
      thumbsEl.appendChild(th);
      thumbs.push(th);
      th.addEventListener('click', function () { goTo(i, true); });
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          goTo(i, true);
        }
      });
    });

    var sourcesLoaded = false;
    function loadSources() {
      if (sourcesLoaded) return;
      sourcesLoaded = true;
      items.forEach(function (src, i) {
        var url = src.currentSrc || src.src;
        slides[i].src = url;
        if (isVideo(src)) {
          slides[i].poster = src.poster;
          slides[i].preload = 'auto';
          thumbs[i].firstChild.src = src.poster;
        } else {
          thumbs[i].firstChild.src = url;
        }
      });
    }

    // Плеер видео-слайда: кнопка плей/пауза (тип из styles/buttons.css),
    // дорожка-перемотка и время. Прогресс дорожки обновляется каждый кадр,
    // пока видео играет — timeupdate слишком редкий для коротких роликов.
    function formatTime(t) {
      t = Math.max(0, Math.floor(t || 0));
      return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2);
    }

    function createPlayer(video, slide) {
      var bar = document.createElement('div');
      bar.className = 'case-lightbox__player';
      bar.innerHTML =
        '<button type="button" class="btn btn--fill-white btn--icon-only btn--media-control case-lightbox__play" aria-label="Пауза"><span class="icon icon--pause" aria-hidden="true"></span></button>' +
        '<input type="range" class="case-lightbox__seek" min="0" max="1000" step="1" value="0" aria-label="Перемотка видео" />' +
        '<p class="case-lightbox__time text-body-sm"><span data-time-current>0:00</span> / <span data-time-total>0:00</span></p>';
      slide.appendChild(bar);

      var btn = bar.querySelector('.case-lightbox__play');
      var icon = btn.firstChild;
      var seek = bar.querySelector('.case-lightbox__seek');
      var curEl = bar.querySelector('[data-time-current]');
      var totalEl = bar.querySelector('[data-time-total]');
      var raf = 0, scrubbing = false, resumeAfterScrub = false;

      function paint() {
        var d = video.duration || 0;
        var p = d ? video.currentTime / d : 0;
        if (!scrubbing) seek.value = String(Math.round(p * 1000));
        seek.style.setProperty('--seek-progress', (Number(seek.value) / 10) + '%');
        curEl.textContent = formatTime(video.currentTime);
        totalEl.textContent = formatTime(d);
      }
      function loop() {
        paint();
        raf = video.paused ? 0 : requestAnimationFrame(loop);
      }
      function syncButton() {
        var playing = !video.paused;
        icon.className = 'icon ' + (playing ? 'icon--pause' : 'icon--play');
        btn.setAttribute('aria-label', playing ? 'Пауза' : 'Смотреть');
      }

      video.addEventListener('play', function () {
        syncButton();
        if (!raf) raf = requestAnimationFrame(loop);
      });
      video.addEventListener('pause', function () { syncButton(); paint(); });
      video.addEventListener('loadedmetadata', paint);
      video.addEventListener('seeked', paint);

      function toggle() {
        if (video.paused) play(); else video.pause();
      }
      function play() {
        var pr = video.play();
        if (pr && pr.catch) pr.catch(function () {});
      }

      btn.addEventListener('click', toggle);

      seek.addEventListener('input', function () {
        if (!scrubbing) {
          scrubbing = true;
          resumeAfterScrub = !video.paused;
          video.pause();
        }
        if (video.duration) video.currentTime = Number(seek.value) / 1000 * video.duration;
        paint();
      });
      seek.addEventListener('change', function () {
        scrubbing = false;
        if (resumeAfterScrub) play();
        resumeAfterScrub = false;
      });

      return { video: video, toggle: toggle, play: play, paint: paint };
    }

    function syncPlayback() {
      players.forEach(function (p, i) {
        if (!p) return;
        if (i === index && !root.hidden) {
          p.play();
        } else {
          p.video.pause();
        }
      });
    }

    // Пока открыт полноэкранный просмотр, превью-видео на странице
    // останавливаются, после закрытия продолжают играть.
    var pausedInline = [];
    function pauseInline() {
      pausedInline = items.filter(function (el) { return isVideo(el) && !el.paused; });
      pausedInline.forEach(function (el) { el.pause(); });
    }
    function resumeInline() {
      pausedInline.forEach(function (el) {
        var pr = el.play();
        if (pr && pr.catch) pr.catch(function () {});
      });
      pausedInline = [];
    }

    var image = slides[0];
    var prevImage = null;
    var index = 0;
    var lastFocused = null;
    var inactive = [];

    var scale = 1, tx = 0, ty = 0;
    var pointers = {};
    var pinchStartDist = 0, pinchStartScale = 1;
    var panStartX = 0, panStartY = 0, panStartTx = 0, panStartTy = 0;
    var swipeStartX = 0, swipeLastX = 0, swipeLastT = 0, swipeVx = 0, swiping = false;
    var dragActive = false, dragMoved = false;
    var lastTapTime = 0, lastTapX = 0, lastTapY = 0;

    // Наведение мышью: плитка уменьшается сразу под курсором, в том числе
    // во время скролла — браузер в это время не шлёт pointerenter/hover, поэтому
    // положение курсора запоминается и проверяется заново на каждый scroll и
    // pointermove. У уже уменьшенной плитки границы берутся без сжатия,
    // иначе на самом краю она дёргалась бы (курсор выпадал, плитка росла,
    // курсор снова попадал).
    var mouseQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    var hoverTargets = [];
    var mouseX = -1, mouseY = -1, hasMouse = false, hoverRaf = 0;
    var HOVER_SCALE = 0.985;
    function updateHover() {
      hoverRaf = 0;
      hoverTargets.forEach(function (t) {
        var inside = false;
        if (hasMouse) {
          var r = t.getBoundingClientRect();
          var pad = t.classList.contains('is-hovered')
            ? (r.width / HOVER_SCALE - r.width) / 2 : 0;
          var padY = t.classList.contains('is-hovered')
            ? (r.height / HOVER_SCALE - r.height) / 2 : 0;
          inside = mouseX >= r.left - pad && mouseX <= r.right + pad &&
                   mouseY >= r.top - padY && mouseY <= r.bottom + padY;
        }
        t.classList.toggle('is-hovered', inside);
      });
    }
    function queueHover() {
      if (!hoverRaf) hoverRaf = requestAnimationFrame(updateHover);
    }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !mouseQuery.matches) return;
      mouseX = e.clientX; mouseY = e.clientY; hasMouse = true;
      queueHover();
    }, { passive: true });
    window.addEventListener('scroll', function () { if (hasMouse) queueHover(); }, { passive: true, capture: true });
    document.documentElement.addEventListener('mouseleave', function () {
      hasMouse = false;
      queueHover();
    });
    function bindHover(target) {
      hoverTargets.push(target);
    }

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
      bindHover(target);
      target.tabIndex = 0;
      target.setAttribute('role', 'button');
      if (!target.hasAttribute('aria-label')) {
        target.setAttribute('aria-label', 'Открыть ' + (isVideo(img) ? 'видео ' : 'фото ') + (i + 1) + ' из ' + items.length + ' на весь экран');
      }
      target.addEventListener('click', function () { open(i, target); });
      target.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          open(i, target);
        }
      });
    });

    function step() {
      return viewport.clientWidth + SLIDE_GAP;
    }

    // Лента: пока палец на экране — 1:1 за пальцем (без transition), при
    // отпускании/стрелках/миниатюре — плавный доезд до нужного слайда.
    var trackRaf = 0, trackPendingX = 0;
    function queueTrack(x) {
      trackPendingX = x;
      if (trackRaf) return;
      trackRaf = requestAnimationFrame(function () {
        trackRaf = 0;
        track.style.transition = 'none';
        track.style.transform = 'translate3d(' + trackPendingX + 'px,0,0)';
      });
    }
    var desktopMq = window.matchMedia('(min-width: 768px)');
    function renderTrack(animate, distance) {
      if (trackRaf) { cancelAnimationFrame(trackRaf); trackRaf = 0; }
      var base = desktopMq.matches ? 0.75 : 0.5;
      var duration = Math.min(1.1, base + 0.07 * Math.max(0, (distance || 1) - 1));
      track.style.transition = animate && !reducedMotion.matches ? 'transform ' + duration + 's ' + SLIDE_EASING : 'none';
      track.style.transform = 'translate3d(' + (-index * step()) + 'px,0,0)';
    }

    function setTransform(animate) {
      image.style.transitionProperty = animate ? 'transform' : 'none';
      image.style.transitionDuration = animate ? '.25s' : '0s';
      image.style.transitionTimingFunction = 'ease';
      image.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      image.classList.toggle('is-zoomed', scale > 1.001);
      root.classList.toggle('is-zoomed', scale > 1.001);
    }

    // Пинч/пан/колесо пишут scale/tx/ty на каждое событие (тачскрины
    // отдают их гораздо чаще частоты кадров экрана), а в DOM — не чаще
    // раза за кадр через rAF. Дискретные скачки (даблтап, снэп-бэк,
    // ресайз) идут напрямую, с transition.
    var rafPending = false;
    function scheduleRender() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(function () {
        rafPending = false;
        setTransform(false);
      });
    }

    // Картинка растянута на весь бокс (object-fit: contain), поэтому
    // реальный размер содержимого считаем по натуральным пропорциям.
    function contentSize() {
      var w = image.offsetWidth, h = image.offsetHeight;
      var nw = image.naturalWidth, nh = image.naturalHeight;
      if (!nw || !nh || !w || !h) return { w: w, h: h };
      var r = Math.min(w / nw, h / nh);
      return { w: nw * r, h: nh * r };
    }

    function clampPan(scaleVal, txVal, tyVal) {
      var size = contentSize();
      var maxX = Math.max(0, (size.w * scaleVal - viewport.clientWidth) / 2);
      var maxY = Math.max(0, (size.h * scaleVal - viewport.clientHeight) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, txVal)),
        y: Math.min(maxY, Math.max(-maxY, tyVal))
      };
    }

    function zoomAt(newScale, clientX, clientY, animate) {
      newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      var vpRect = viewport.getBoundingClientRect();
      var px = clientX - (vpRect.left + image.offsetLeft + image.offsetWidth / 2);
      var py = clientY - (vpRect.top + image.offsetTop + image.offsetHeight / 2);
      var ratio = newScale / scale;
      var rawTx = px - (px - tx) * ratio;
      var rawTy = py - (py - ty) * ratio;
      var clamped = clampPan(newScale, rawTx, rawTy);
      scale = newScale;
      tx = clamped.x;
      ty = clamped.y;
      if (animate) setTransform(true);
      else scheduleRender();
    }

    function updateChrome() {
      currentEl.textContent = String(index + 1);
      kindEl.textContent = players[index] ? 'Видео' : 'Фото';
      prevBtn.hidden = index === 0;
      nextBtn.hidden = index === items.length - 1;
      thumbs.forEach(function (th, i) {
        var active = i === index;
        th.classList.toggle('is-current', active);
        if (active) th.setAttribute('aria-current', 'true');
        else th.removeAttribute('aria-current');
      });
      var th = thumbs[index];
      if (th && thumbsEl.scrollHeight > thumbsEl.clientHeight) {
        thumbsEl.scrollTo({
          top: th.offsetTop - (thumbsEl.clientHeight - th.offsetHeight) / 2,
          behavior: reducedMotion.matches ? 'auto' : 'smooth'
        });
      }
    }

    function goTo(i, animate) {
      i = Math.max(0, Math.min(items.length - 1, i));
      var leaving = image;
      var changed = i !== index;
      var distance = Math.abs(i - index);
      index = i;
      image = slides[index];
      scale = 1; tx = 0; ty = 0;
      if (changed) {
        prevImage = leaving;
        window.setTimeout(function () {
          if (prevImage && prevImage !== image) {
            prevImage.style.transition = 'none';
            prevImage.style.transform = '';
            prevImage.classList.remove('is-zoomed');
          }
        }, 1200);
      }
      setTransform(false);
      renderTrack(animate, distance);
      updateChrome();
      syncPlayback();
    }

    function navigate(delta) {
      goTo(index + delta, true);
    }

    function handleTap(e) {
      if (players[index]) {
        players[index].toggle();
        return;
      }
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
      if (players[index]) return;
      // Пинч на трекпаде (ctrlKey) присылает мелкие deltaY — ему нужен
      // больший множитель, чем колесу мыши; колесо в строках/страницах
      // приводим к пикселям.
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      dy = Math.max(-120, Math.min(120, dy));
      var factor = Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.005));
      zoomAt(scale * factor, e.clientX, e.clientY, false);
    }, { passive: false });

    viewport.addEventListener('pointerdown', function (e) {
      // Кнопка и дорожка плеера работают сами по себе — не перехватываем
      // их в свайп/пан ленты.
      if (e.target.closest('.case-lightbox__player')) return;
      viewport.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var p0 = pointers[ids[0]], p1 = pointers[ids[1]];
        pinchStartDist = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        pinchStartScale = scale;
        dragActive = false;
        if (swiping) { swiping = false; renderTrack(true); }
      } else if (ids.length === 1) {
        dragActive = true;
        dragMoved = false;
        swiping = false;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartTx = tx;
        panStartTy = ty;
        swipeStartX = swipeLastX = e.clientX;
        swipeLastT = e.timeStamp;
        swipeVx = 0;
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
        if (!players[index]) zoomAt(pinchStartScale * (dist / pinchStartDist), mid.x, mid.y, false);
      } else if (ids.length === 1 && dragActive) {
        var dx = e.clientX - panStartX;
        var dy = e.clientY - panStartY;
        if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) dragMoved = true;
        if (scale > 1.001) {
          var clamped = clampPan(scale, panStartTx + dx, panStartTy + dy);
          tx = clamped.x; ty = clamped.y;
          scheduleRender();
          image.classList.add('is-panning');
        } else if (dragMoved) {
          swiping = true;
          var sdx = e.clientX - swipeStartX;
          var atEdge = (index === 0 && sdx > 0) || (index === items.length - 1 && sdx < 0);
          if (atEdge) sdx *= 0.35;
          queueTrack(-index * step() + sdx);
          var dt = e.timeStamp - swipeLastT;
          if (dt > 0) swipeVx = 0.8 * swipeVx + 0.2 * ((e.clientX - swipeLastX) / dt);
          swipeLastX = e.clientX;
          swipeLastT = e.timeStamp;
        }
      }
    });

    function endPointer(e) {
      var hadTwo = Object.keys(pointers).length === 2;
      var wasSingleDrag = dragActive && Object.keys(pointers).length === 1;
      delete pointers[e.pointerId];
      image.classList.remove('is-panning');
      var remaining = Object.keys(pointers).length;

      if (remaining === 1) {
        var id = Object.keys(pointers)[0];
        panStartX = pointers[id].x;
        panStartY = pointers[id].y;
        panStartTx = tx;
        panStartTy = ty;
        swipeStartX = swipeLastX = pointers[id].x;
        swipeLastT = e.timeStamp;
        swipeVx = 0;
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
      if (scale <= 1.001 && swiping) {
        swiping = false;
        var total = e.clientX - swipeStartX;
        var threshold = Math.min(90, viewport.clientWidth * 0.2);
        if ((total < -threshold || swipeVx < -0.4) && index < items.length - 1) goTo(index + 1, true);
        else if ((total > threshold || swipeVx > 0.4) && index > 0) goTo(index - 1, true);
        else renderTrack(true);
      }
    }

    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);

    window.addEventListener('resize', function () {
      if (root.hidden) return;
      renderTrack(false);
      var clamped = clampPan(scale, tx, ty);
      tx = clamped.x; ty = clamped.y;
      setTransform(false);
    });

    function onKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if ((e.key === ' ' || e.key === 'Spacebar') && players[index] &&
          !(e.target.closest && e.target.closest('button, input, [role="button"]'))) {
        e.preventDefault();
        players[index].toggle();
        return;
      }
      if (e.target.classList && e.target.classList.contains('case-lightbox__seek')) return;
      if (e.key === 'ArrowLeft') { navigate(-1); return; }
      if (e.key === 'ArrowRight') { navigate(1); }
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
      closeTimer = window.setTimeout(finish, 400);
    }

    function open(i, triggerEl) {
      lastFocused = triggerEl || document.activeElement;
      inactive = Array.prototype.filter.call(document.body.children, function (el) { return el !== root; });
      inactive.forEach(function (el) { el.inert = true; });
      document.documentElement.classList.add('contact-scroll-lock');
      root.classList.remove('is-closing');
      root.hidden = false;
      pauseInline();
      loadSources();
      index = -1;
      goTo(i, false);
      document.addEventListener('keydown', onKeydown);
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      players.forEach(function (p) { if (p) p.video.pause(); });
      closeAnimated(function () {
        resumeInline();
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
