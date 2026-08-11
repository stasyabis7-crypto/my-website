/*
  Интерактив страницы «Обо мне»: появление секций при скролле, лёгкий
  параллакс плавающих карточек в hero, общая панель компании (drawer на
  десктопе / bottom sheet на моб-планшете — один и тот же DOM-узел, см.
  timeline.css), фильтры активностей, счётчик в "Коротко в цифрах",
  копирование email и sticky-CTA "Связаться". Хедер/футер/тема — общий
  layout-chrome.js/theme.js, здесь не дублируется.
*/
(function () {
  var DESKTOP_MIN = 1101; // держите синхронно с layout-chrome.js
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isDesktop() {
    return window.innerWidth >= DESKTOP_MIN;
  }

  /* ---------------- Reveal-on-scroll ---------------- */
  (function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!items.length) return;

    // --reveal-i — номер элемента среди соседей той же группы (родителя) —
    // даёт лёгкий stagger через transition-delay в CSS без ручной разметки
    // задержек под каждый компонент отдельно.
    var countByParent = new Map();
    items.forEach(function (el) {
      var parent = el.parentElement;
      var i = countByParent.get(parent) || 0;
      el.style.setProperty('--reveal-i', i);
      countByParent.set(parent, i + 1);
    });

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { observer.observe(el); });
  })();

  /* ---------------- Параллакс плавающих карточек hero ---------------- */
  (function initHeroParallax() {
    if (reduceMotion) return;
    var hero = document.getElementById('about-hero');
    var group = hero && hero.querySelector('[data-parallax-group]');
    if (!hero || !group) return;
    var cards = Array.prototype.slice.call(group.querySelectorAll('[data-parallax-depth]'));
    if (!cards.length) return;

    var ticking = false;
    var lastX = 0;
    var lastY = 0;

    function apply() {
      ticking = false;
      var rect = hero.getBoundingClientRect();
      var cx = (lastX - rect.left) / rect.width - 0.5;
      var cy = (lastY - rect.top) / rect.height - 0.5;
      cards.forEach(function (card) {
        var depth = parseFloat(card.getAttribute('data-parallax-depth')) || 0.5;
        var tx = cx * 18 * depth;
        var ty = cy * 18 * depth;
        card.style.transform = 'translate(' + tx.toFixed(2) + 'px, ' + ty.toFixed(2) + 'px)';
      });
    }

    hero.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;
      lastX = event.clientX;
      lastY = event.clientY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    });

    hero.addEventListener('pointerleave', function () {
      cards.forEach(function (card) { card.style.transform = ''; });
    });
  })();

  /* ---------------- Счётчик "Коротко в цифрах" ---------------- */
  (function initStatsCount() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));
    if (!els.length || reduceMotion || typeof IntersectionObserver === 'undefined') return;

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      var suffix = el.getAttribute('data-count-suffix') || '';
      if (!isFinite(target)) return;
      var duration = 900;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(target * eased);
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target + suffix;
      }

      requestAnimationFrame(frame);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    els.forEach(function (el) { observer.observe(el); });
  })();

  /* ---------------- Панель компании (drawer / bottom sheet) ---------------- */
  (function initCompanyPanel() {
    var backdrop = document.getElementById('panel-backdrop');
    var panel = document.getElementById('company-panel');
    var body = document.getElementById('panel-body');
    var closeBtn = document.getElementById('panel-close');
    var periodEl = document.getElementById('panel-period');
    var titleEl = document.getElementById('panel-title');
    var roleEl = document.getElementById('panel-role');
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.timeline__node'));
    if (!backdrop || !panel || !body || !nodes.length) return;

    var CLOSE_MS = 450; // держите синхронно с transition у .panel в timeline.css
    var lastTrigger = null;
    var hideTimer = null;
    var previousOverflow = '';

    function focusableIn(container) {
      return Array.prototype.slice.call(
        container.querySelectorAll('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])')
      );
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = focusableIn(panel);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function open(trigger) {
      var company = trigger.getAttribute('data-company');
      var tpl = document.getElementById('company-tpl-' + company);
      if (!tpl) return;

      lastTrigger = trigger;
      body.innerHTML = '';
      body.appendChild(tpl.content.cloneNode(true));

      periodEl.textContent = trigger.querySelector('.timeline__period').textContent;
      titleEl.textContent = trigger.querySelector('.timeline__company').textContent;
      roleEl.textContent = trigger.querySelector('.timeline__role').textContent;

      var accent = getComputedStyle(trigger).getPropertyValue('--node-accent').trim();
      var accentInk = getComputedStyle(trigger).getPropertyValue('--node-accent-ink').trim();
      if (accent) panel.style.setProperty('--panel-accent', accent);
      if (accentInk) panel.style.setProperty('--panel-accent-ink', accentInk);

      clearTimeout(hideTimer);
      backdrop.hidden = false;
      panel.hidden = false;
      panel.style.transform = '';
      void panel.offsetWidth; // рефлоу — см. footer-menu-panel в layout-chrome.js
      backdrop.classList.add('is-open');
      panel.classList.add('is-open');

      trigger.setAttribute('aria-expanded', 'true');
      nodes.forEach(function (n) { if (n !== trigger) n.setAttribute('aria-expanded', 'false'); });

      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      document.addEventListener('keydown', onKeydown);
      body.scrollTop = 0;
      var closeButton = panel.querySelector('#panel-close');
      if (closeButton) closeButton.focus();
    }

    function close() {
      if (!panel.classList.contains('is-open')) return;
      panel.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      nodes.forEach(function (n) { n.setAttribute('aria-expanded', 'false'); });
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeydown);

      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        panel.hidden = true;
        backdrop.hidden = true;
        panel.style.transform = '';
      }, CLOSE_MS);

      if (lastTrigger) {
        lastTrigger.focus();
        lastTrigger = null;
      }
    }

    nodes.forEach(function (node) {
      node.addEventListener('click', function () { open(node); });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);

    /* Свайп вниз — закрывает bottom sheet на моб/планшете. На десктопе
       (боковой drawer) обработчики просто не сработают: жест начинается
       только с .panel__grabber, которая на десктопе не видна/не в потоке
       для тач-жеста (display:none), см. timeline.css. */
    var grabber = panel.querySelector('.panel__grabber');
    if (grabber) {
      var dragStartY = null;
      var dragDelta = 0;

      grabber.addEventListener('pointerdown', function (event) {
        if (isDesktop()) return;
        dragStartY = event.clientY;
        panel.classList.add('is-dragging');
        grabber.setPointerCapture(event.pointerId);
      });

      grabber.addEventListener('pointermove', function (event) {
        if (dragStartY === null) return;
        dragDelta = Math.max(0, event.clientY - dragStartY);
        panel.style.transform = 'translateY(' + dragDelta + 'px)';
      });

      function endDrag() {
        if (dragStartY === null) return;
        panel.classList.remove('is-dragging');
        var shouldClose = dragDelta > 120;
        dragStartY = null;
        if (shouldClose) {
          close();
        } else {
          panel.style.transform = '';
        }
        dragDelta = 0;
      }

      grabber.addEventListener('pointerup', endDrag);
      grabber.addEventListener('pointercancel', endDrag);
    }

    window.addEventListener('resize', function () {
      if (panel.classList.contains('is-open')) panel.style.transform = '';
    });
  })();

  /* ---------------- Фильтры активностей (моб/планшет) ---------------- */
  (function initActivityFilters() {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip--filter'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-activity-group]'));
    if (!chips.length || !groups.length) return;

    function applyFilter(filter) {
      groups.forEach(function (group) {
        var match = filter === 'all' || group.getAttribute('data-activity-group') === filter;
        group.classList.toggle('is-filtered-out', !match);
      });
      chips.forEach(function (chip) {
        chip.setAttribute('aria-pressed', String(chip.getAttribute('data-filter') === filter));
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        applyFilter(chip.getAttribute('data-filter'));
      });
    });

    window.addEventListener('resize', function () {
      // На десктопе фильтры скрыты (см. about-activities.css) — сбрасываем
      // состояние, чтобы группы не остались спрятанными после ресайза
      // с узкого окна, где был выбран не "Все".
      if (isDesktop()) applyFilter('all');
    });
  })();

  /* ---------------- Контакты: копирование email ---------------- */
  (function initCopyEmail() {
    var btn = document.getElementById('copy-email-btn');
    var label = document.getElementById('copy-email-label');
    if (!btn || !label) return;
    var defaultText = label.textContent;
    var resetTimer = null;

    btn.addEventListener('click', function () {
      var email = btn.getAttribute('data-email') || '';
      function done(ok) {
        label.textContent = ok ? 'Скопировано' : defaultText;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () { label.textContent = defaultText; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  })();

  /* ---------------- Sticky CTA "Связаться" ---------------- */
  (function initStickyCta() {
    var cta = document.getElementById('about-sticky-cta');
    var hero = document.getElementById('about-hero');
    var contacts = document.getElementById('contacts');
    if (!cta || !hero || !contacts) return;

    var ticking = false;
    function update() {
      ticking = false;
      if (isDesktop()) {
        cta.classList.remove('is-visible');
        return;
      }
      var heroBottom = hero.getBoundingClientRect().bottom;
      var contactsTop = contacts.getBoundingClientRect().top;
      var pastHero = heroBottom < window.innerHeight * 0.4;
      var beforeContacts = contactsTop > window.innerHeight * 0.6;
      cta.classList.toggle('is-visible', pastHero && beforeContacts);
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();
})();
