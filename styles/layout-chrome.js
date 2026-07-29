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
  var COLLISION_GAP = 16; // px, минимальный зазор между переключателем темы и футером
  var FOOTER_COLLAPSE_AT = 24; // px, после какого scrollY футер сворачивается в "Меню" + стрелку вверх
  // Длительность закрытия панели меню — держите синхронно с transition
  // у .footer-menu-panel/.footer-menu-backdrop в footer.css: именно
  // столько ждём после снятия .is-open, прежде чем вернуть [hidden]
  // (иначе панель пропадёт из раскладки раньше, чем доиграет анимация).
  var MENU_TRANSITION_MS = 380;

  var header = document.querySelector('.site-header');
  var footer = document.querySelector('.site-footer');
  var themeToggle = document.querySelector('.theme-toggle');
  var menuBtn = document.getElementById('footer-menu-btn');
  var menuPanel = document.getElementById('footer-menu-panel');
  var menuBackdrop = document.getElementById('footer-menu-backdrop');
  var menuClose = document.getElementById('footer-menu-close');
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

  function updateFooterCollapse() {
    var collapsed = window.scrollY > FOOTER_COLLAPSE_AT;
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
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    footer.classList.add('is-menu-open');
    root.classList.add('footer-menu-open');
  }

  function closeMenu() {
    if (!menuPanel || !menuPanel.classList.contains('is-open')) return;
    menuPanel.classList.remove('is-open');
    if (menuBackdrop) menuBackdrop.classList.remove('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
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

  if (menuClose) {
    menuClose.addEventListener('click', closeMenu);
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

  syncAll();
})();
