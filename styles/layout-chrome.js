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
  var LOGO_TOGGLE_GAP = 6; // px, мин. зазор хедер/кнопка темы на моб/планшете (см. syncLogoScale)
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
  var logoMark = document.querySelector('.site-header__logo-mark');
  var themeToggle = document.querySelector('.theme-toggle');
  var menuBtn = document.getElementById('footer-menu-btn');
  var menuPanel = document.getElementById('footer-menu-panel');
  var menuBackdrop = document.getElementById('footer-menu-backdrop');
  var topBtn = document.getElementById('footer-top-btn');
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

  /* На моб/планшете кнопка темы стоит в своём углу независимо от
     хедера (см. .theme-toggle { right: page-px } в theme-toggle.css)
     — если хедер (аватар+имя+кнопка) вырос и полез под неё, схлопывать
     раскладку в chrome--compact тут незачем (это чисто десктопный
     механизм, см. updateCompactOverride): вместо этого сжимаем только
     логотип — просим ужаться ровно настолько, чтобы между хедером и
     кнопкой остался LOGO_TOGGLE_GAP. На десктопе кнопка сама следует
     за хедером (см. syncThemeTogglePosition) — коллизии там нет,
     логотип всегда в своём натуральном размере. */
  function syncLogoScale() {
    if (!logoMark || !themeToggle) return;
    // Сбрасываем принудительную ширину — мерить нужно логотип в его
    // естественном размере (высота = --chrome-item-h, см. header.css),
    // а не то, до чего он был сжат в прошлый раз.
    logoMark.style.width = '';
    if (!isFixedChrome()) return;
    var headerRect = header.getBoundingClientRect();
    var toggleRect = themeToggle.getBoundingClientRect();
    var overlap = headerRect.right + LOGO_TOGGLE_GAP - toggleRect.left;
    if (overlap > 0) {
      var logoRect = logoMark.getBoundingClientRect();
      logoMark.style.width = Math.max(0, logoRect.width - overlap) + 'px';
    }
  }

  function updateFooterCollapse() {
    var collapsed = window.scrollY > window.innerHeight * FOOTER_COLLAPSE_SCREENS;
    var wasCollapsed = footer.classList.contains('is-collapsed');
    footer.classList.toggle('is-collapsed', collapsed);
    // Список ссылок вернулся — открытая панель "Меню" больше не имеет
    // смысла (кнопка, которая её открыла, тоже пропала).
    if (wasCollapsed && !collapsed) closeMenu();
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

  if (topBtn) {
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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
    '.site-header__cta, .theme-toggle, .site-footer__link, ' +
    '.site-footer__menu-btn, .site-footer__top-btn, ' +
    '.footer-menu-panel__link, .hero__cta'
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

  syncAll();
})();
