// Only the experiment opts into mood palettes; project embeds remain dark.
(function () {
  var root = document.documentElement;
  if (!root.hasAttribute('data-mood')) return;
  try {
    var saved = localStorage.getItem('stasyabis-mood');
    if (['anastasia', 'stasy', 'stas'].indexOf(saved) !== -1) root.dataset.mood = saved;
  } catch (_) { /* Private browsing: use the default mood. */ }
})();

/*
  Сайт всегда тёмный (переключателя темы больше нет). Этот файл только
  рассылает тему "dark" в iframe-анимации старой сетки — они не знают тему родителя сами,
  только через postMessage.
*/
(function () {
  function broadcastTheme() {
    var frames = document.querySelectorAll('.works-grid__embed-frame');
    for (var i = 0; i < frames.length; i++) {
      try {
        frames[i].contentWindow.postMessage({ type: 'theme', theme: 'dark' }, '*');
      } catch (e) {}
    }
  }

  broadcastTheme();

  // Хендшейк с анимациями: каждая при своей загрузке шлёт "готова",
  // отвечаем ей "dark" — так не важно, кто из них успел подгрузиться
  // раньше, а кто позже основной страницы.
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'theme-ready' && event.source) {
      event.source.postMessage({ type: 'theme', theme: 'dark' }, '*');
    }
  });
})();
