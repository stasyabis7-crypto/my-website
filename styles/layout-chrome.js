/*
  Поведение хедера/футера/переключателя темы (см. header.css/
  footer.css/theme-toggle.css):

  - Моб/планшет (<1101): все зафиксированы (хедер — бар сверху, футер
    — бар снизу, переключатель темы — кружок справа от хедера, место
    под него зарезервировано в header.css). При скролле вниз футер
    сворачивается в две кнопки — "Меню" слева и "наверх" справа.
    Кнопка "Меню" разворачивает футер обратно вручную, до следующего
    скролла.
  - Десктоп (1101+): вертикальное позиционирование и сворачивание —
    чистый CSS (плавающие плашки в углах). Горизонтальный отступ
    переключателя темы (сразу после плашки хедера) считает этот
    скрипт — ширина хедера плавающая, зависит от контента (логотип/
    имя), поэтому фиксированным отступом в CSS не обойтись.
*/
(function () {
  var DESKTOP_MIN = 1101;
  var COLLAPSE_THRESHOLD = 24;
  var TOGGLE_GAP = 12; // px, зазор между плашкой хедера и кнопкой темы

  var header = document.querySelector('.site-header');
  var footer = document.querySelector('.site-footer');
  var themeToggle = document.querySelector('.theme-toggle');
  if (!header || !footer) return;

  var menuBtn = footer.querySelector('.site-footer__menu-btn');
  var topBtn = footer.querySelector('.site-footer__top-btn');
  var manualOpen = false;

  function isFixedChrome() {
    return window.innerWidth < DESKTOP_MIN;
  }

  function syncChromeHeights() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
    document.documentElement.style.setProperty('--footer-h', footer.offsetHeight + 'px');
  }

  function syncThemeTogglePosition() {
    if (!themeToggle) return;
    if (isFixedChrome()) {
      // Моб/планшет — позицию задаёт CSS (right: var(--page-px)).
      themeToggle.style.left = '';
      return;
    }
    var rect = header.getBoundingClientRect();
    themeToggle.style.left = Math.round(rect.right + TOGGLE_GAP) + 'px';
  }

  function updateCollapse() {
    if (!isFixedChrome()) {
      footer.classList.remove('is-collapsed');
      return;
    }
    var collapsed = window.scrollY > COLLAPSE_THRESHOLD && !manualOpen;
    footer.classList.toggle('is-collapsed', collapsed);
  }

  window.addEventListener(
    'scroll',
    function () {
      manualOpen = false;
      updateCollapse();
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    syncChromeHeights();
    syncThemeTogglePosition();
    updateCollapse();
  });

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      manualOpen = true;
      updateCollapse();
    });
  }

  if (topBtn) {
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    var syncAll = function () {
      syncChromeHeights();
      syncThemeTogglePosition();
    };
    new ResizeObserver(syncAll).observe(header);
    new ResizeObserver(syncChromeHeights).observe(footer);
  }

  syncChromeHeights();
  syncThemeTogglePosition();
  updateCollapse();
})();
