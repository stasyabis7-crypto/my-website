// Shared header (nav dial) and contact sheet. No garden API dependencies.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Programmatic modal focus can match :focus-visible even after a tap.
  // Keep actual focus/trapping intact, but show its ring only for keyboard use.
  document.addEventListener('pointerdown', function (event) {
    root.dataset.focusInput = event.pointerType === 'touch' || event.pointerType === 'pen' ? 'touch' : 'pointer';
  }, { capture: true, passive: true });
  document.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (['Tab', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) !== -1) {
      root.dataset.focusInput = 'keyboard';
    }
  }, true);

  /* Блокировка скролла фона под попапом/шторкой — просто overflow:hidden
     на html+body (см. .contact-scroll-lock в site-chrome.css). Без
     position:fixed / сохранения scrollY: страница остаётся ровно там,
     где была, ничего не «прыгает». */
  function lockScroll() {
    root.classList.add('contact-scroll-lock');
  }
  function unlockScroll() {
    root.classList.remove('contact-scroll-lock');
  }

  /* Закрытие любого попапа/шторки сада с анимацией: вешаем .is-closing
     (CSS проигрывает contact-picker-out / contact-sheet-out на .contact-dialog__panel),
     после её конца прячем и чистим. Предохранитель на случай, если
     animationend не прилетит. */
  function closeModal(el, done) {
    if (!el || el.hidden || el.classList.contains('is-closing')) return;
    if (reduceMotion.matches) { el.hidden = true; if (done) done(); return; }
    el.classList.add('is-closing');
    var panel = el.querySelector('.contact-dialog__panel') || el;
    var t;
    var finish = function (e) {
      if (e && (e.target !== panel || e.animationName !== 'contact-surface-out')) return;
      panel.removeEventListener('animationend', finish);
      clearTimeout(t);
      el.hidden = true;
      el.classList.remove('is-closing');
      if (done) done();
    };
    panel.addEventListener('animationend', finish);
    t = setTimeout(finish, 750);
  }

  /* Полноэкранная шторка моб/планшета (Связаться, Меню): раскрывается из
     кнопки-триггера, блокирует фон и держит фокус внутри. build(add, close)
     наполняет список пунктов. */
  function createSheet(opts) {
    var sheet;
    var inactive = [];
    function setBackgroundInert() {
      inactive = Array.from(document.body.children).filter(function (el) { return el !== sheet && !el.inert; });
      inactive.forEach(function (el) { el.inert = true; });
    }
    function restoreBackground() {
      inactive.forEach(function (el) { el.inert = false; });
      inactive = [];
    }
    function setOrigin() {
      var panel = sheet.querySelector('.contact-dialog__panel');
      var r = panel.getBoundingClientRect();
      var t = opts.trigger.getBoundingClientRect();
      var clamp = function (v, max) { return Math.max(0, Math.min(max, v)); };
      var top = clamp(t.top - r.top, r.height);
      var left = clamp(t.left - r.left, r.width);
      var right = clamp(r.right - t.right, r.width - left);
      var bottom = clamp(r.bottom - t.bottom, r.height - top);
      panel.style.setProperty('--contact-origin', 'inset(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px round 32px)');
    }
    window.addEventListener('resize', function () { if (sheet && !sheet.hidden) setOrigin(); });
    function close() {
      closeModal(sheet, function () {
        restoreBackground();
        unlockScroll();
        opts.trigger.setAttribute('aria-expanded', 'false');
        opts.trigger.focus({ preventScroll: true });
        if (opts.onClose) opts.onClose();
      });
    }
    function ensure() {
      if (sheet) return;
      sheet = document.createElement('div');
      sheet.className = 'contact-dialog contact-sheet site-sheet';
      sheet.id = opts.id;
      sheet.hidden = true;
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-label', opts.title);
      sheet.innerHTML = '<div class="contact-dialog__backdrop" data-close></div>' +
        '<div class="contact-dialog__panel"><div class="contact-dialog__body"><div class="contact-dialog__inner">' +
        '<div class="contact-dialog__head"><h2 class="contact-dialog__title text-h2"></h2></div>' +
        '<div data-rows></div></div></div><div class="contact-dialog__footer"><div class="contact-dialog__close-wrap">' +
        '<button type="button" class="contact-dialog__close btn btn--fill-ink btn--icon-right" data-close>' +
        '<span>Закрыть</span><span class="icon icon--close" aria-hidden="true"></span></button></div></div></div>';
      sheet.querySelector('.contact-dialog__title').textContent = opts.title;
      sheet.querySelector('.contact-dialog__close').setAttribute('aria-label', opts.closeLabel);
      var rows = sheet.querySelector('[data-rows]');
      opts.build(function (el) {
        var item = document.createElement('div');
        item.className = 'contact-dialog__item';
        item.style.setProperty('--item-index', rows.children.length);
        item.appendChild(el);
        rows.appendChild(item);
      }, close);
      sheet.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', close); });
      document.addEventListener('keydown', function (e) {
        if (sheet.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        if (e.key === 'Tab') {
          var controls = sheet.querySelectorAll('button, a[href]');
          var first = controls[0], last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      document.body.appendChild(sheet);
    }
    function open() {
      ensure();
      if (!sheet.hidden) return;
      sheet.hidden = false;
      sheet.querySelector('.contact-dialog__body').scrollTop = 0;
      setOrigin();
      setBackgroundInert();
      lockScroll();
      opts.trigger.setAttribute('aria-expanded', 'true');
      sheet.querySelector('.contact-dialog__close').focus({ preventScroll: true });
    }
    return {
      open: open,
      close: function () { if (sheet && !sheet.hidden) close(); },
      ensure: ensure
    };
  }

  /* ---------- chrome: pinned-on-scroll ---------- */
  function updatePinned() {
    root.classList.toggle('chrome--pinned', window.scrollY > 20);
  }
  updatePinned();
  var pinTicking = false;
  window.addEventListener('scroll', function () {
    if (pinTicking) return;
    pinTicking = true;
    requestAnimationFrame(function () { updatePinned(); pinTicking = false; });
  }, { passive: true });

  /* ---------- контакты ----------
     Полноэкранная шторка, открывается пунктом «Контакты» линейки. */
  var EMAIL = 'stasyabis7@gmail.com';
  var CONTACTS = [
    { label: 'Telegram', icon: 'telegram', href: 'https://t.me/stasyabis' },
    { label: 'Скопировать адрес почты', icon: 'email', copy: EMAIL },
    { label: 'Dribbble', icon: 'dribbble', href: 'https://dribbble.com/Stasyabis' },
    { label: 'Figma community', icon: 'figma', href: 'https://www.figma.com/@stasyabis' },
    { label: 'Medium', icon: 'medium', href: 'https://medium.com/@stasyabis' },
    { label: 'Habr', icon: 'habr', href: 'https://habr.com/ru/users/stasyabis/' }
  ];

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      // Фолбэк (не-secure-контекст). textarea фиксируем в углу вьюпорта
      // и прозрачным — иначе .select() проскроллит страницу к нему.
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) {}
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function contactRow(it, onActivate) {
    var el;
    if (it.copy) {
      el = document.createElement('button');
      el.type = 'button';
      el.addEventListener('click', function () {
        copyText(it.copy, function () {
          el.lastChild.textContent = 'Почта скопирована';
          clearTimeout(el._t);
          el._t = setTimeout(function () { el.lastChild.textContent = it.label; }, 1800);
        });
      });
    } else {
      el = document.createElement('a');
      el.href = it.href;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
      el.addEventListener('click', function () { setTimeout(onActivate, 60); });
    }
    el.className = 'contact-row btn btn--fill-white btn--icon-left';
    el.innerHTML = '<span class="icon icon--social-' + it.icon + '" aria-hidden="true"></span>';
    el.appendChild(document.createTextNode(it.label));
    return el;
  }

  /* ---------- навигация-линейка ----------
     Шкала с рисками и неподвижной стрелкой по центру, под ней строка
     разделов. Строку тянут мышью/пальцем (или скроллят тачпадом), она
     доводится до ближайшего пункта; пункт под стрелкой — в «таблетке».
     Клик по пункту подкатывает его под стрелку и открывает раздел. Без
     действий линейка через несколько секунд возвращается к текущему
     разделу. Хедер уезжает вместе с контентом при скролле вниз и мягко
     появляется при скролле вверх; над баннером — без заливки, с блюром.
     Вид — components/site-header/header.css, .btn--fill-dial. */
  (function siteDial() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var SECTIONS = [
      { label: 'Мой дом', href: '/' },
      // Отдельной страницы «Проекты» пока нет: пункт подкатывается под
      // стрелку, но никуда не ведёт. Кейсы считаются этим разделом.
      { label: 'Проекты', soon: true, section: /^\/projects\/(?!articles\/|posts\/|playground\/)/ },
      { label: 'Веселюсь', href: '/projects/playground/' },
      // Страницы «Обо мне» пока нет — ведёт на резюме.
      { label: 'Обо мне', href: '/cv.pdf?v=3', external: true },
      { label: 'Активности', href: '/projects/articles/', section: /^\/projects\/posts\// },
      { label: 'Контакты', contacts: true }
    ];
    var RETURN_DELAY = 3000;
    var path = location.pathname.replace(/index\.html$/, '');

    var nav = document.createElement('nav');
    nav.className = 'nav-dial';
    nav.setAttribute('aria-label', 'Разделы сайта');
    nav.innerHTML = '<div class="nav-dial__scroller"><div class="nav-dial__track"></div></div>' +
      '<span class="nav-dial__needle" aria-hidden="true"></span>';
    var scroller = nav.firstChild;
    var track = scroller.firstChild;

    var current = null, contactsItem = null;
    var items = SECTIONS.map(function (it) {
      var el = document.createElement(it.href ? 'a' : 'button');
      el.className = 'nav-dial__item btn btn--fill-dial';
      if (!it.href) el.type = 'button';
      if (it.contacts) {
        el.setAttribute('aria-haspopup', 'dialog');
        el.setAttribute('aria-controls', 'site-contacts-dialog');
        el.setAttribute('aria-expanded', 'false');
        contactsItem = el;
      } else if (it.soon) {
        el.setAttribute('aria-disabled', 'true');
        if (it.section.test(path)) { el.setAttribute('aria-current', 'true'); current = el; }
      } else {
        el.href = it.href;
        if (it.external) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
        if (path === it.href) { el.setAttribute('aria-current', 'page'); current = el; }
        else if (!current && it.section && it.section.test(path)) { el.setAttribute('aria-current', 'true'); current = el; }
      }
      var label = document.createElement('span');
      label.textContent = it.label;
      el.appendChild(label);
      el._section = it;
      track.appendChild(el);
      return el;
    });
    header.appendChild(nav);

    // Пункт, к которому линейка возвращается: раздел открытой страницы.
    var resting = current || items[0];

    function centerOf(el) { return el.offsetLeft + el.offsetWidth / 2; }
    function layout() {
      var half = scroller.clientWidth / 2;
      track.style.setProperty('--dial-pad-start', Math.max(0, half - items[0].offsetWidth / 2) + 'px');
      track.style.setProperty('--dial-pad-end', Math.max(0, half - items[items.length - 1].offsetWidth / 2) + 'px');
    }
    function nearest(x) {
      var best = items[0], gap = Infinity;
      items.forEach(function (el) {
        var d = Math.abs(centerOf(el) - x);
        if (d < gap) { gap = d; best = el; }
      });
      return best;
    }
    var centered = null;
    function markCentered() {
      var el = nearest(scroller.scrollLeft + scroller.clientWidth / 2);
      if (el === centered) return;
      if (centered) centered.classList.remove('is-centered');
      centered = el;
      el.classList.add('is-centered');
    }
    function glideTo(el, instant) {
      scroller.scrollTo({
        left: centerOf(el) - scroller.clientWidth / 2,
        behavior: instant || reduceMotion.matches ? 'instant' : 'smooth'
      });
    }

    var markTicking = false;
    scroller.addEventListener('scroll', function () {
      if (markTicking) return;
      markTicking = true;
      requestAnimationFrame(function () { markCentered(); markTicking = false; });
    }, { passive: true });

    // Возврат к текущему разделу, если пункт выбрали, но не открыли.
    var returnTimer;
    function scheduleReturn() {
      clearTimeout(returnTimer);
      returnTimer = setTimeout(function () {
        if (drag || nav.matches(':hover') || nav.contains(document.activeElement)) return scheduleReturn();
        if (contactsItem.getAttribute('aria-expanded') === 'true') return;
        if (centered !== resting) glideTo(resting);
      }, RETURN_DELAY);
    }
    scroller.addEventListener('scroll', function () {
      if (centered !== resting) scheduleReturn();
    }, { passive: true });

    /* Перетаскивание мышью (палец скроллит строку нативно). Пока тянем,
       привязка к пунктам выключена (.is-free), после отпускания строка с
       учётом скорости докатывается до ближайшего пункта. */
    var drag = null, suppressClick = false, freeTimer;
    scroller.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: scroller.scrollLeft, id: e.pointerId, t: e.timeStamp, v: 0, moved: false };
    });
    scroller.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 4) return;
        drag.moved = true;
        clearTimeout(freeTimer);
        nav.classList.add('is-dragging', 'is-free');
        scroller.setPointerCapture(e.pointerId);
      }
      var left = drag.left - dx;
      drag.v = (left - scroller.scrollLeft) / Math.max(1, e.timeStamp - drag.t);
      drag.t = e.timeStamp;
      scroller.scrollLeft = left;
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      if (!d.moved) return;
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      nav.classList.remove('is-dragging');
      var v = e.timeStamp - d.t > 80 ? 0 : d.v;
      glideTo(nearest(scroller.scrollLeft + scroller.clientWidth / 2 + v * 100));
      freeTimer = setTimeout(function () { nav.classList.remove('is-free'); }, 600);
    }
    scroller.addEventListener('pointerup', endDrag);
    scroller.addEventListener('pointercancel', endDrag);
    scroller.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* Тачпад и колесо мыши: любое направление жеста над линейкой крутит
       её по горизонтали. Пока жест идёт (включая инерцию тачпада),
       привязка выключена, после паузы строка докатывается до ближайшего
       пункта. В крайнем положении жест отдаётся странице. */
    var wheelTimer;
    scroller.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      var max = scroller.scrollWidth - scroller.clientWidth;
      var atEdge = (delta < 0 && scroller.scrollLeft <= 0) || (delta > 0 && scroller.scrollLeft >= max - 1);
      if (!delta || (atEdge && !nav.classList.contains('is-free'))) return;
      e.preventDefault();
      clearTimeout(freeTimer);
      nav.classList.add('is-free');
      scroller.scrollLeft += delta;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () {
        glideTo(nearest(scroller.scrollLeft + scroller.clientWidth / 2));
        freeTimer = setTimeout(function () { nav.classList.remove('is-free'); }, 600);
      }, 140);
    }, { passive: false });

    function scrollPage(destination) {
      if (window.siteNavigation) window.siteNavigation.scrollTo(destination);
      else window.scrollTo({ top: typeof destination === 'function' ? destination() : destination, behavior: 'smooth' });
    }

    var leaveTimer;
    track.addEventListener('click', function (e) {
      var el = e.target.closest('.nav-dial__item');
      if (!el || e.defaultPrevented) return;
      var it = el._section;
      if (it.contacts) {
        glideTo(el);
        contactSheet.open();
        return;
      }
      if (it.soon) {
        glideTo(el);
        return;
      }
      // Резюме открывается в новой вкладке, линейка остаётся на месте.
      if (it.external) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      glideTo(el);
      if (el.getAttribute('aria-current') === 'page') {
        scrollPage(0);
        return;
      }
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () { location.href = el.href; }, reduceMotion.matches ? 0 : 320);
    });

    var contactSheet = createSheet({
      id: 'site-contacts-dialog',
      title: 'Контакты',
      closeLabel: 'Закрыть контакты',
      trigger: contactsItem,
      onClose: function () { glideTo(resting); },
      build: function (add, close) {
        CONTACTS.forEach(function (it) { add(contactRow(it, close)); });
      }
    });

    /* ---------- хедер при скролле страницы ---------- */
    var heroEl = document.querySelector('.mood-hero');
    var lastY = Math.max(0, window.scrollY), shift = 0, upRun = 0;

    function syncSurface() {
      var over;
      if (heroEl) {
        var line = Math.max(1, header.offsetHeight + shift - 1);
        var under = document.elementsFromPoint(innerWidth / 2, line)
          .find(function (el) { return !header.contains(el); });
        over = !!under && heroEl.contains(under);
      } else {
        over = window.scrollY < 4;
      }
      header.classList.toggle('is-over-hero', over);
    }

    // Вниз — хедер едет вместе с контентом; вверх — мягко возвращается.
    function syncShift() {
      var y = Math.max(0, window.scrollY);
      var dy = y - lastY;
      lastY = y;
      if (root.classList.contains('contact-scroll-lock')) return;
      var h = header.offsetHeight;
      if (dy > 0) {
        upRun = 0;
        header.classList.remove('is-revealing');
        shift = Math.max(-h, shift - dy);
        header.classList.toggle('is-away', shift <= -h);
      } else if (dy < 0) {
        upRun -= dy;
        if (shift < 0 && (upRun > 8 || y < h)) {
          shift = 0;
          header.classList.add('is-revealing');
          header.classList.remove('is-away');
        }
      }
      header.style.setProperty('--nav-shift', shift + 'px');
    }

    var pageTicking = false;
    window.addEventListener('scroll', function () {
      if (pageTicking) return;
      pageTicking = true;
      requestAnimationFrame(function () {
        pageTicking = false;
        syncShift();
        syncSurface();
      });
    }, { passive: true });

    // Баннер Главной красит хедер в белый по тому, что под ним
    // (hero-video.js, на скролл). После возвращения хедера даём ему
    // перепроверить уже на месте.
    header.addEventListener('transitionend', function (e) {
      if (e.target !== header || e.propertyName !== 'transform') return;
      header.classList.remove('is-revealing');
      window.dispatchEvent(new Event('scroll'));
    });

    function recenter() {
      layout();
      glideTo(centered || resting, true);
      markCentered();
    }
    layout();
    glideTo(resting, true);
    markCentered();
    syncSurface();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(recenter).observe(scroller);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(recenter);
  })();
})();
