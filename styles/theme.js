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
    var icon = btn.querySelector('.theme-toggle__icon');
    var next = theme === 'dark' ? 'light' : 'dark';
    if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    btn.setAttribute(
      'aria-label',
      'Переключить на ' + (next === 'light' ? 'светлую' : 'тёмную') + ' тему'
    );
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    syncToggleButton(theme);
  }

  apply(readSaved() === 'light' ? 'light' : 'dark');

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
