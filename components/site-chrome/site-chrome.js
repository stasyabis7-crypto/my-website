// Shared header and contact dialog. No garden API dependencies.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Keep the resume label on one line, shortening it only when space runs out.
  var resume = document.querySelector('.site-header__cta');
  if (resume) {
    var textWalker = document.createTreeWalker(resume, NodeFilter.SHOW_TEXT);
    var resumeText;
    while (textWalker.nextNode()) {
      if (textWalker.currentNode.textContent.trim() === 'Резюме PDF') {
        resumeText = textWalker.currentNode;
        break;
      }
    }
    if (resumeText) {
      var labelMeasure = document.createElement('canvas').getContext('2d');
      function fitResumeLabel() {
        var style = getComputedStyle(resume);
        labelMeasure.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
        var labelWidth = labelMeasure.measureText('Резюме PDF').width;
        labelWidth += (parseFloat(style.letterSpacing) || 0) * 9;
        var icon = resume.querySelector('.icon');
        var required = labelWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        if (icon) required += icon.getBoundingClientRect().width + (parseFloat(style.columnGap) || 0);
        var logo = document.querySelector('.site-header__logo');
        var constrained = innerWidth < 1000 && logo && logo.hidden;
        var label = constrained && required > resume.clientWidth + 1 ? 'Резюме' : 'Резюме PDF';
        if (resumeText.textContent !== label) resumeText.textContent = label;
      }
      new ResizeObserver(fitResumeLabel).observe(resume);
      document.fonts.ready.then(fitResumeLabel);
      window.addEventListener('resize', fitResumeLabel);
    }
  }

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

  /* ---------- соцсети ---------- */
  (function socials() {
    var wrap = document.getElementById('site-socials');
    if (!wrap) return;
    var toggle = document.getElementById('site-socials-toggle');

    /* Мобилка/планшет (<1000px): переносим блок ВНУТРЬ .site-header (кнопка справа
       от «Резюме PDF», раскладка — site-chrome.css). Десктоп: возвращаем
       обратно в body сразу после хедера — там это position:fixed кнопка в
       правом верхнем углу, а внутри плашки с backdrop-filter fixed
       считался бы от самой плашки. */
    var headerEl = document.querySelector('.site-header');
    var socialsMq = window.matchMedia('(width < 1000px)');
    function placeSocials() {
      if (toggle) {
        toggle.classList.toggle('btn--icon-only', socialsMq.matches);
        toggle.classList.toggle('btn--icon-right', !socialsMq.matches);
      }
      if (!headerEl) return;
      if (socialsMq.matches) {
        if (wrap.parentElement !== headerEl) headerEl.appendChild(wrap);
      } else if (wrap.previousElementSibling !== headerEl) {
        headerEl.insertAdjacentElement('afterend', wrap);
      }
    }
    placeSocials();
    (socialsMq.addEventListener
      ? socialsMq.addEventListener('change', placeSocials)
      : socialsMq.addListener(placeSocials));

    var EMAIL = 'stasyabis7@gmail.com';
    var ITEMS = [
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

    // Мобилка/планшет (<1000px): полноэкранная шторка, как раньше — нет
    // места для анкора. Десктоп: маленький попап у кнопки, без модального
    // затемнения/лока скролла (см. .site-socials__panel в site-chrome.css).
    function isDesktop() { return !socialsMq.matches; }
    function makeRow(it, onActivate) {
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
        if (onActivate) el.addEventListener('click', function () { setTimeout(onActivate, 60); });
      }
      el.innerHTML = '<span class="icon icon--social-' + it.icon + '" aria-hidden="true"></span>';
      el.appendChild(document.createTextNode(it.label));
      return el;
    }

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
      var t = toggle.getBoundingClientRect();
      var clamp = function (v, max) { return Math.max(0, Math.min(max, v)); };
      var top = clamp(t.top - r.top, r.height);
      var left = clamp(t.left - r.left, r.width);
      var right = clamp(r.right - t.right, r.width - left);
      var bottom = clamp(r.bottom - t.bottom, r.height - top);
      panel.style.setProperty('--contact-origin', 'inset(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px round 32px)');
    }
    window.addEventListener('resize', function () { if (sheet && !sheet.hidden) setOrigin(); });
    function closeSheet() {
      closeModal(sheet, function () {
        restoreBackground();
        unlockScroll();
        if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
      });
    }
    function ensureSheet() {
      if (!sheet) {
        sheet = document.createElement('div');
        sheet.className = 'contact-dialog contact-sheet';
        sheet.id = 'site-socials-dialog';
        sheet.hidden = true;
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-label', 'Связаться');
        var head = '<div class="contact-dialog__backdrop" data-close></div>' +
          '<div class="contact-dialog__panel"><div class="contact-dialog__body"><div class="contact-dialog__inner">' +
          '<div class="contact-dialog__head"><h2 class="contact-dialog__title text-h2">Связаться</h2></div>' +
          '<div data-rows></div></div></div><div class="contact-dialog__footer"><div class="contact-dialog__close-wrap">' +
          '<button type="button" class="contact-dialog__close btn btn--fill-ink btn--icon-right" data-close aria-label="Закрыть контакты">' +
          '<span>Закрыть</span><span class="icon icon--close" aria-hidden="true"></span></button></div></div></div>';
        sheet.innerHTML = head;
        var rows = sheet.querySelector('[data-rows]');
        ITEMS.forEach(function (it, index) {
          var el = makeRow(it, closeSheet);
          el.className = 'contact-row btn btn--fill-white btn--icon-left';
          var item = document.createElement('div');
          item.className = 'contact-dialog__item';
          item.style.setProperty('--item-index', index);
          item.appendChild(el);
          rows.appendChild(item);
        });
        sheet.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeSheet); });
        document.addEventListener('keydown', function (e) {
          if (!sheet || sheet.hidden) return;
          if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
          if (e.key === 'Tab') {
            var controls = sheet.querySelectorAll('button, a[href]');
            var first = controls[0], last = controls[controls.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        });
        document.body.appendChild(sheet);
      }
    }
    function openSheet() {
      ensureSheet();
      if (!sheet.hidden) return;
      sheet.hidden = false;
      sheet.querySelector('.contact-dialog__body').scrollTop = 0;
      setOrigin();
      setBackgroundInert();
      lockScroll();
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      var c = sheet.querySelector('.contact-dialog__close');
      if (c) c.focus({ preventScroll: true });
    }

    var popover, popoverOpen = false;
    function ensurePopover() {
      if (popover) return;
      popover = document.createElement('div');
      popover.className = 'site-socials__panel';
      popover.id = 'site-socials-panel';
      popover.inert = true;
      var nav = document.createElement('nav');
      nav.setAttribute('aria-label', 'Связаться');
      ITEMS.forEach(function (it) {
        var el = makeRow(it, closePopover);
        el.className = 'btn btn--fill-toc btn--icon-left';
        nav.appendChild(el);
      });
      popover.appendChild(nav);
      wrap.appendChild(popover);
    }
    function closePopover(focusToggle) {
      if (!popoverOpen) return;
      popoverOpen = false;
      popover.classList.remove('is-open');
      popover.inert = true;
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (focusToggle) toggle.focus({ preventScroll: true });
    }
    function openPopover() {
      ensurePopover();
      if (popoverOpen) return;
      popoverOpen = true;
      popover.inert = false;
      popover.classList.add('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }
    // Click-only, stays open until an item, an empty area of the page,
    // Escape, or the trigger itself closes it — no hover/pointerleave.
    document.addEventListener('pointerdown', function (e) {
      if (popoverOpen && !wrap.contains(e.target)) closePopover();
    });
    document.addEventListener('keydown', function (e) {
      if (popoverOpen && e.key === 'Escape') { e.preventDefault(); closePopover(true); }
    });
    wrap.addEventListener('focusout', function (e) {
      if (popoverOpen && !wrap.contains(e.relatedTarget)) closePopover();
    });

    function syncSocialsMode() {
      if (isDesktop()) {
        if (sheet && !sheet.hidden) closeSheet();
        if (toggle) {
          toggle.setAttribute('aria-haspopup', 'true');
          toggle.setAttribute('aria-controls', 'site-socials-panel');
          toggle.setAttribute('aria-expanded', String(popoverOpen));
        }
      } else {
        closePopover();
        if (toggle) {
          toggle.setAttribute('aria-haspopup', 'dialog');
          toggle.setAttribute('aria-controls', 'site-socials-dialog');
          toggle.setAttribute('aria-expanded', 'false');
        }
      }
    }
    ensureSheet();
    ensurePopover();
    syncSocialsMode();
    (socialsMq.addEventListener
      ? socialsMq.addEventListener('change', syncSocialsMode)
      : socialsMq.addListener(syncSocialsMode));
    if (toggle) toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isDesktop()) { popoverOpen ? closePopover() : openPopover(); } else { openSheet(); }
    });
  })();

  function measureSocialsOffset() {
    var footer = document.querySelector('.site-footer');
    var rect = footer && footer.getBoundingClientRect();
    root.style.setProperty('--chrome-socials-offset', rect && rect.top < 140 && rect.right > innerWidth - 260 ? Math.ceil(rect.width + 12) + 'px' : '0px');
  }
  window.addEventListener('resize', measureSocialsOffset);
  document.fonts.ready.then(measureSocialsOffset);
  requestAnimationFrame(measureSocialsOffset);
})();
