/*
  Поведение хедера/футера/переключателя темы (см. header.css/
  footer.css/theme-toggle.css) — все три всегда плавающие плашки.

  - Моб/планшет (<1101, либо шире — см. html.chrome--compact ниже):
    хедер — широкая плашка сверху, футер — широкая плашка снизу.
    Футер по умолчанию (страница не проскроллена) показывает список
    ссылок целиком, как на десктопе. При скролле (см.
    updateFooterCollapse, .is-collapsed) список прячется, вместо него
    остаются кнопка "Меню" слева и кнопка со стрелкой вверх справа
    (скроллит наверх). Клик по "Меню" открывает #footer-menu-panel —
    плашку над футером в виде такого же горизонтального бара со
    списком ссылок, с отдельной кнопкой-кружком "закрыть" РЯДОМ с ним
    (как .theme-toggle, но не наложением).
  - Десктоп (1101+): хедер/футер сжимаются до плашек по контенту в
    верхних углах (чистый CSS), футер показывает список ссылок целиком.
    Горизонтальный отступ переключателя темы (сразу после плашки
    хедера) считает этот скрипт — ширина хедера плавающая, зависит от
    контента (логотип/имя).

  html.chrome--compact — принудительный откат на моб-плашки даже на
  ширине ≥1101px: если бы хедер, переключатель темы и футер не
  влезли в один ряд без наезда друг на друга, этот скрипт добавляет
  класс на <html>, и CSS (см. `html:not(.chrome--compact)` в
  header.css/footer.css/theme-toggle.css) откатывает раскладку на
  моб-вариант вместо того, чтобы дать плашкам наехать друг на друга.
*/
(function () {
  var DESKTOP_MIN = 1101;
  var TOGGLE_GAP = 10; // px, зазор между плашкой хедера и кнопкой темы
  var HEADER_EDGE_GAP = 12; // px, минимальный зазор от плашки-хедера по центру до края экрана на мобилке (см. syncLogoScale)
  var LOGO_MIN_WIDTH = 80; // px, ниже этой ширины логотип-словомарк не сжимаем дальше, а убираем совсем (см. syncLogoScale)
  var COLLISION_GAP = 16; // px, минимальный зазор между переключателем темы и футером
  var FOOTER_COLLAPSE_SCREENS = 2; // сколько высот экрана нужно проскроллить, прежде чем футер свернётся в "Меню" + стрелку вверх
  // Длительность закрытия панели меню — держите синхронно с transition
  // у .footer-menu-panel/.footer-menu-backdrop в footer.css: именно
  // столько ждём после снятия .is-open, прежде чем вернуть [hidden]
  // (иначе панель пропадёт из раскладки раньше, чем доиграет анимация).
  var MENU_TRANSITION_MS = 380;

  var header = document.querySelector('.site-header');
  var footer = document.querySelector('.site-footer');
  var headerCta = document.querySelector('.site-header__cta');
  var logoLink = document.querySelector('.site-header__logo');
  var logoMark = document.querySelector('.site-header__logo-mark');
  var themeToggle = document.querySelector('.theme-toggle');
  var menuBtn = document.getElementById('footer-menu-btn');
  var menuPanel = document.getElementById('footer-menu-panel');
  var menuBackdrop = document.getElementById('footer-menu-backdrop');
  var topBtn = document.getElementById('footer-top-btn');
  var topBtnDesktop = document.getElementById('footer-top-btn-desktop');
  var root = document.documentElement;
  if (!header || !footer) return;

  function isFixedChrome() {
    return window.innerWidth < DESKTOP_MIN || root.classList.contains('chrome--compact');
  }

  function updateCompactOverride() {
    if (window.innerWidth < DESKTOP_MIN) {
      // Ниже брейкпоинта и так всегда моб-плашки — класс не нужен.
      root.classList.remove('chrome--compact');
      return;
    }

    // Пробно снимаем откат, чтобы измерить, как разместились бы
    // десктопные плашки сами по себе (без него CSS их сожмёт по
    // контенту и расставит по углам).
    root.classList.remove('chrome--compact');

    var headerRect = header.getBoundingClientRect();
    var footerRect = footer.getBoundingClientRect();
    var toggleWidth = themeToggle ? themeToggle.getBoundingClientRect().width : 0;
    var toggleRight = headerRect.right + TOGGLE_GAP + toggleWidth;

    var collides = toggleRight + COLLISION_GAP > footerRect.left;
    root.classList.toggle('chrome--compact', collides);
  }

  function syncChromeHeights() {
    root.style.setProperty('--header-h', header.offsetHeight + 'px');
    root.style.setProperty('--footer-h', footer.offsetHeight + 'px');
    // --chrome-item-h — реальная высота кнопки "Резюме PDF" (иконка +
    // подпись в столбик) — гоняет размер аватара/лого в хедере и
    // кружков (переключатель темы, кнопки футера в свёрнутом виде),
    // см. header.css/footer.css/theme-toggle.css. Высоту строкой не
    // посчитать надёжно (зависит от font-size, тот — от брейкпоинта и
    // fluid-скейла scale.css), поэтому меряем по факту отрисованной
    // кнопки, а не считаем формулой.
    if (headerCta) {
      root.style.setProperty('--chrome-item-h', headerCta.offsetHeight + 'px');
    }
  }

  function syncThemeTogglePosition() {
    if (!themeToggle) return;
    if (isFixedChrome()) {
      // Моб/планшет (в т.ч. компакт-откат) — позицию задаёт CSS.
      themeToggle.style.left = '';
      return;
    }
    var rect = header.getBoundingClientRect();
    themeToggle.style.left = Math.round(rect.right + TOGGLE_GAP) + 'px';
  }

  /* Мобилка/планшет (<1000px): вся хрома в одной плашке-хедере по центру экрана
     (аватар + лого + «Резюме PDF» + кнопка соцсетей, см.
     site-chrome.css). Если плашка шире экрана — сжимаем словомарк ровно
     на величину нехватки; если и сжатый не влезает (< LOGO_MIN_WIDTH) —
     убираем логотип совсем, остаются аватар, кнопка и соцсети. На
     десктопе/планшете места хватает — логотип в натуральном размере. */
  function syncLogoScale() {
    if (!logoMark) return;
    // Сбрасываем принудительную ширину и скрытие — мерить нужно логотип
    // в его естественном размере, а не то, до чего он был сжат/спрятан.
    logoMark.style.width = '';
    if (logoLink) logoLink.hidden = false;
    if (window.innerWidth >= 1000) return;

    var budget = window.innerWidth - 2 * HEADER_EDGE_GAP;
    var overflow = header.getBoundingClientRect().width - budget;
    if (overflow <= 0) return;

    var next = logoMark.getBoundingClientRect().width - overflow;
    if (next < LOGO_MIN_WIDTH) {
      if (logoLink) logoLink.hidden = true;
    } else {
      logoMark.style.width = next + 'px';
    }
  }

  function updateFooterCollapse() {
    var collapsed = window.scrollY > window.innerHeight * FOOTER_COLLAPSE_SCREENS;
    var wasCollapsed = footer.classList.contains('is-collapsed');
    footer.classList.toggle('is-collapsed', collapsed);
    // Список ссылок вернулся — открытая панель "Меню" больше не имеет
    // смысла (кнопка, которая её открыла, тоже пропала).
    if (wasCollapsed && !collapsed) closeMenu();
    // Кнопка "наверх" на десктопе — тот же порог, см. её отдельные
    // CSS-правила в footer.css (#footer-top-btn-desktop).
    if (topBtnDesktop) topBtnDesktop.classList.toggle('is-visible', collapsed);
  }

  function syncAll() {
    updateCompactOverride();
    syncChromeHeights();
    syncThemeTogglePosition();
    syncLogoScale();
    updateFooterCollapse();
  }

  var menuHideTimer = null;

  function openMenu() {
    if (!menuPanel) return;
    clearTimeout(menuHideTimer);
    menuPanel.hidden = false;
    if (menuBackdrop) menuBackdrop.hidden = false;
    // Рефлоу между снятием [hidden] и добавлением .is-open — иначе оба
    // изменения схлопнутся в один кадр, и переход к открытому
    // состоянию не проиграется (браузер просто не увидит "закрытый"
    // кадр, с которого нужно анимировать).
    void menuPanel.offsetWidth;
    menuPanel.classList.add('is-open');
    if (menuBackdrop) menuBackdrop.classList.add('is-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
      // Кнопка "Меню" сама становится кнопкой "закрыть" — крестик
      // подставляет CSS (см. .is-menu-open .site-footer__menu-btn
      // .icon в footer.css), тут только текст для скринридеров.
      menuBtn.setAttribute('aria-label', 'Закрыть меню');
    }
    footer.classList.add('is-menu-open');
    root.classList.add('footer-menu-open');
  }

  function closeMenu() {
    if (!menuPanel || !menuPanel.classList.contains('is-open')) return;
    menuPanel.classList.remove('is-open');
    if (menuBackdrop) menuBackdrop.classList.remove('is-open');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Меню');
    }
    footer.classList.remove('is-menu-open');
    root.classList.remove('footer-menu-open');
    // [hidden] возвращаем только после того, как доиграет анимация
    // закрытия — до этого момента панель должна остаться в раскладке,
    // иначе opacity/transform-переход из footer.css мгновенно обрежется.
    clearTimeout(menuHideTimer);
    menuHideTimer = setTimeout(function () {
      menuPanel.hidden = true;
      if (menuBackdrop) menuBackdrop.hidden = true;
    }, MENU_TRANSITION_MS);
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      if (menuPanel && menuPanel.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
  }

  // Shared, time-based navigation scroll: soft acceleration and a long landing.
  // Manual input always takes control immediately; reduced motion jumps directly.
  var scrollFrame = 0;
  var savedScrollBehavior = '';
  var scrollRunning = false;
  var scrollMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function cancelNavigationScroll() {
    if (!scrollRunning) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    scrollRunning = false;
    root.style.scrollBehavior = savedScrollBehavior;
  }
  function navigateScroll(destination) {
    cancelNavigationScroll();
    var start = window.scrollY;
    var target = Math.max(0, Math.min(destination, document.documentElement.scrollHeight - window.innerHeight));
    var distance = target - start;
    if (scrollMotion.matches || Math.abs(distance) < 2) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }
    savedScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    scrollRunning = true;
    var duration = Math.min(2100, 1200 + Math.abs(distance) * 0.16);
    var started = performance.now();
    function step(now) {
      var progress = Math.min(1, (now - started) / duration);
      var eased = (1 - Math.cos(Math.PI * progress)) / 2;
      window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
      if (progress < 1) scrollFrame = requestAnimationFrame(step);
      else cancelNavigationScroll();
    }
    scrollFrame = requestAnimationFrame(step);
  }
  [topBtn, topBtnDesktop].forEach(function (button) {
    if (button) button.addEventListener('click', function () { navigateScroll(0); });
  });
  document.querySelectorAll('a[href="#works-gallery"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var gallery = document.getElementById('works-gallery');
      if (!gallery) return;
      event.preventDefault();
      var inset = header ? header.getBoundingClientRect().height + 26 : 20;
      var destination = window.scrollY + gallery.getBoundingClientRect().top - inset;
      if (location.hash !== '#works-gallery') history.pushState(null, '', '#works-gallery');
      navigateScroll(destination);
    });
  });
  window.addEventListener('wheel', cancelNavigationScroll, { passive: true });
  window.addEventListener('touchstart', cancelNavigationScroll, { passive: true });
  window.addEventListener('pointerdown', cancelNavigationScroll, { passive: true });
  window.addEventListener('resize', cancelNavigationScroll);
  window.addEventListener('pagehide', cancelNavigationScroll);
  scrollMotion.addEventListener('change', cancelNavigationScroll);
  window.addEventListener('keydown', function (event) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].indexOf(event.key) !== -1) cancelNavigationScroll();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', function (event) {
    if (!menuPanel || !menuPanel.classList.contains('is-open')) return;
    if (menuPanel.contains(event.target) || (menuBtn && menuBtn.contains(event.target))) return;
    closeMenu();
  });

  window.addEventListener('resize', function () {
    syncAll();
    closeMenu();
  });

  // rAF-throttle: updateFooterCollapse читает window.scrollY на каждый
  // тик скролла, не нужно гонять это чаще одного раза за кадр.
  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      updateFooterCollapse();
      scrollTicking = false;
    });
  }, { passive: true });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncAll).observe(header);
    new ResizeObserver(syncChromeHeights).observe(footer);
  }

  /* Точка старта розовой radial-заливки совпадает с местом, где
     указатель впервые вошёл в кнопку. Для клавиатуры CSS оставляет
     безопасное значение по умолчанию — центр контрола. */
  var hoverControls = document.querySelectorAll(
    '.site-header__cta, .site-footer__telegram, .theme-toggle, .site-footer__link, ' +
    '.site-footer__menu-btn, .site-footer__top-btn, ' +
    '.footer-menu-panel__link, .btn'
  );

  hoverControls.forEach(function (control) {
    control.addEventListener('pointerenter', function (event) {
      var rect = control.getBoundingClientRect();
      control.style.setProperty('--hover-x', event.clientX - rect.left + 'px');
      control.style.setProperty('--hover-y', event.clientY - rect.top + 'px');
    });

    control.addEventListener('focus', function () {
      control.style.setProperty('--hover-x', '50%');
      control.style.setProperty('--hover-y', '50%');
    });
  });

  // Delegation includes dynamically rendered carousel buttons. Some mobile
  // browsers delay :active; explicit pointer state gives immediate press feedback.
  var touchPress = null;
  function clearTouchPress() {
    if (touchPress) touchPress.button.classList.remove('is-touch-pressed');
    touchPress = null;
  }
  document.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    clearTouchPress();
    var button = event.target.closest('.btn');
    if (!button || button.disabled) return;
    touchPress = { button: button, id: event.pointerId, x: event.clientX, y: event.clientY };
    button.classList.add('is-touch-pressed');
  }, { passive: true });
  document.addEventListener('pointermove', function (event) {
    if (touchPress && event.pointerId === touchPress.id &&
        Math.hypot(event.clientX - touchPress.x, event.clientY - touchPress.y) > 8) clearTouchPress();
  }, { passive: true });
  document.addEventListener('pointerup', clearTouchPress, { passive: true });
  document.addEventListener('pointercancel', clearTouchPress, { passive: true });
  window.addEventListener('blur', clearTouchPress);

  syncAll();
})();
