/*
  Переключение темы: dark ⇄ light, выбор хранится в localStorage.
  Дефолт (ничего не сохранено) — тёмная, независимо от системной темы
  (так и задумано, не читаем prefers-color-scheme).

  Ставим data-theme на <html> сразу, в первой же строчке скрипта — до
  того, как отрисуется остальная страница, — чтобы не было вспышки
  светлой темы перед переключением на тёмную (FOUC). Поэтому этот файл
  подключается в <head> самым первым, ещё до ссылок на CSS.
*/
(function () {
  var STORAGE_KEY = 'theme';
  var root = document.documentElement;

  function readSaved() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeSaved(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  function syncToggleButton(theme) {
    var input = document.getElementById('theme-toggle');
    if (!input) return;
    var next = theme === 'dark' ? 'light' : 'dark';
    // Костяшка тумблера (луна/солнце) едет чистым CSS от :checked — см.
    // theme-toggle.css, тут только держим сам чекбокс синхронным с
    // текущей темой (важно при первом заходе со светлой сохранённой
    // темой — чекбокс по умолчанию unchecked).
    input.checked = theme === 'light';
    input.setAttribute(
      'aria-label',
      'Переключить на ' + (next === 'light' ? 'светлую' : 'тёмную') + ' тему'
    );
  }

  // Рассылка темы в iframe-анимации галереи (works/*/index.html,
  // см. works/shared/theme-sync.js) — они не видят data-theme
  // родителя сами, только через postMessage.
  function broadcastTheme(theme) {
    var frames = document.querySelectorAll('.works-grid__embed-frame');
    for (var i = 0; i < frames.length; i++) {
      try {
        frames[i].contentWindow.postMessage({ type: 'theme', theme: theme }, '*');
      } catch (e) {}
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    syncToggleButton(theme);
    broadcastTheme(theme);
  }

  apply(readSaved() === 'light' ? 'light' : 'dark');

  // Хендшейк с анимациями: каждая при своей загрузке шлёт "готова",
  // отвечаем ей одной текущей темой — так не важно, кто из них успел
  // подгрузиться раньше, а кто позже основной страницы.
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'theme-ready' && event.source) {
      event.source.postMessage(
        { type: 'theme', theme: root.getAttribute('data-theme') === 'light' ? 'light' : 'dark' },
        '*'
      );
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('theme-toggle');
    if (!input) return;

    syncToggleButton(root.getAttribute('data-theme'));

    input.addEventListener('change', function () {
      var next = input.checked ? 'light' : 'dark';
      apply(next);
      writeSaved(next);
    });
  });
})();
