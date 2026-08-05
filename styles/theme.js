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
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var next = theme === 'dark' ? 'light' : 'dark';
    // Сама иконка (солнце/луна) переключается чистым CSS по
    // [data-theme] на <html> — см. theme-toggle.css.
    btn.setAttribute(
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
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    syncToggleButton(root.getAttribute('data-theme'));

    btn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      apply(next);
      writeSaved(next);
    });
  });
})();
