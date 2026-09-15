// Shared header and contact dialog. No garden API dependencies.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    if (reduceMotion) { el.hidden = true; if (done) done(); return; }
    el.classList.add('is-closing');
    var panel = el.querySelector('.contact-dialog__panel') || el;
    var t;
    var finish = function (e) {
      if (e && e.animationName && !/-out$/.test(e.animationName)) return;
      panel.removeEventListener('animationend', finish);
      clearTimeout(t);
      el.hidden = true;
      el.classList.remove('is-closing');
      if (done) done();
    };
    panel.addEventListener('animationend', finish);
    t = setTimeout(finish, 450);
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
      { label: 'Написать в tg', img: '/assets/socials/Telegram.svg', href: 'https://t.me/stasyabis' },
      { label: 'Написать на почту', img: '/assets/socials/Google.svg', copy: EMAIL },
      { label: 'Dribbble', img: '/assets/socials/Dribbble.svg', href: 'https://dribbble.com/Stasyabis' },
      { label: 'Figma community', img: '/assets/socials/Figma.svg', href: 'https://www.figma.com/@stasyabis' },
      { label: 'Medium', img: '/assets/socials/Medium.svg', href: 'https://medium.com/@stasyabis' },
      { label: 'Habr', img: '/assets/socials/Habr.svg', href: 'https://habr.com/ru/users/stasyabis/' }
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

    // Общий список: десктопный попап или мобильная шторка.
    var sheet;
    function closeSheet() {
      closeModal(sheet, function () {
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
        sheet.setAttribute('aria-label', 'Соцсети');
        var head = '<div class="contact-dialog__backdrop" data-close></div>' +
          '<div class="contact-dialog__panel"><div class="contact-dialog__head">' +
          '<h2 class="contact-dialog__title text-h2">Связаться</h2>' +
          '<button type="button" class="contact-dialog__close btn btn--fill-white btn--icon-only" data-close aria-label="Закрыть">×</button>' +
          '</div><div data-rows></div></div>';
        sheet.innerHTML = head;
        var rows = sheet.querySelector('[data-rows]');
        ITEMS.forEach(function (it) {
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
            el.addEventListener('click', function () { setTimeout(closeSheet, 60); });
          }
          el.className = 'contact-row btn btn--fill-white btn--icon-left';
          el.innerHTML = '<img src="' + it.img + '" width="32" height="32" alt="" aria-hidden="true">';
          el.appendChild(document.createTextNode(it.label));
          rows.appendChild(el);
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
      lockScroll();
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      var c = sheet.querySelector('.contact-dialog__close');
      if (c) c.focus();
    }
    ensureSheet();
    if (toggle) toggle.addEventListener('click', function (e) { e.stopPropagation(); openSheet(); });
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
