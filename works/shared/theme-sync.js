/*
  Подключается в анимациях works/<project>/index.html, встроенных через iframe
  в галерею (см. корневой index.html, .works-grid__embed-frame).
  Слушает тему родительской страницы и ставит data-embed-theme на
  <html> — сама анимация переключает фон подложки через CSS
  ([data-embed-theme="dark"] { --stage-bg: ... }).

  Хендшейк, а не просто "слушать и ждать": родитель может прислать
  тему раньше, чем этот скрипт успеет повесить листенер (iframe грузится
  асинхронно) — поэтому при старте сами пингуем родителя "готовы", и
  родитель в ответ шлёт текущую тему именно нам (postMessage e.source),
  а не всем сразу.

  Если страница открыта не в iframe (например, просто в браузере
  отдельно) — window.parent === window, пинговать некого, тема остаётся
  дефолтной (light), которая и была в файле изначально.
*/
(function () {
  function apply(theme) {
    document.documentElement.setAttribute('data-embed-theme', theme === 'dark' ? 'dark' : 'light');
  }

  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'theme') apply(event.data.theme);
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: 'theme-ready' }, '*');
  }
})();
