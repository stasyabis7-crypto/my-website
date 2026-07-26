/*
  Поведение хедера/футера/переключателя темы (см. header.css/
  footer.css/theme-toggle.css) — все три всегда плавающие плашки.

  - Моб/планшет (<1101, либо шире — см. html.chrome--compact ниже):
    хедер — широкая плашка сверху, футер — широкая плашка снизу с
    одной кнопкой "Меню" вместо списка ссылок. Клик по "Меню" открывает
    #footer-menu-panel — отдельную плашку над футером со списком
    ссылок и кнопкой-кружком "закрыть" (как .theme-toggle).
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
  var TOGGLE_GAP = 12; // px, зазор между плашкой хедера и кнопкой темы
  var COLLISION_GAP = 16; // px, минимальный зазор между переключателем темы и футером

  var header = document.querySelector('.site-header');
  var footer = document.querySelector('.site-footer');
  var themeToggle = document.querySelector('.theme-toggle');
  var menuBtn = document.getElementById('footer-menu-btn');
  var menuPanel = document.getElementById('footer-menu-panel');
  var menuClose = document.getElementById('footer-menu-close');
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

  function syncAll() {
    updateCompactOverride();
    syncChromeHeights();
    syncThemeTogglePosition();
  }

  function openMenu() {
    if (!menuPanel) return;
    menuPanel.hidden = false;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    if (!menuPanel) return;
    menuPanel.hidden = true;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      if (menuPanel && menuPanel.hidden) openMenu();
      else closeMenu();
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', closeMenu);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', function (event) {
    if (!menuPanel || menuPanel.hidden) return;
    if (menuPanel.contains(event.target) || event.target === menuBtn) return;
    closeMenu();
  });

  window.addEventListener('resize', function () {
    syncAll();
    closeMenu();
  });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncAll).observe(header);
    new ResizeObserver(syncChromeHeights).observe(footer);
  }

  syncAll();
})();
