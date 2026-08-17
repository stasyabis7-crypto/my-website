/*
  Мобилка (<=640px): вместо всех плиток галереи сразу — по BATCH_SIZE
  штук, остальные открывает кнопка "Показать ещё" внизу. Скрытые плитки
  не получают src на iframe вообще (не просто display:none — сам src
  снят в data-src), пока их не открыли — иначе браузер начинает
  грузить их все разом ещё до кнопки, просто спрятанными, и мы
  возвращаемся к тому же перерасходу памяти, из-за которого мобильный
  браузер сам перезагружал вкладку (см. works-anim-gate.js).

  Десктоп/планшет: скрипт не выполняется — галерея как была, целиком,
  ленивая подгрузка на IntersectionObserver из works-anim-gate.js.

  ВАЖНО: подключать ДО works-anim-gate.js — тот на бутстрапе читает
  dataset.src, отдавая приоритет уже выставленному здесь значению (см.
  комментарий в works-anim-gate.js), иначе для скрытых плиток дальше
  некуда будет восстанавливать src при открытии.
*/
(function () {
  if (!window.matchMedia || !window.matchMedia('(max-width: 640px)').matches) return;

  var BATCH_SIZE = 3;
  var grid = document.getElementById('works-gallery');
  if (!grid) return;

  var items = Array.prototype.slice.call(grid.querySelectorAll('.works-grid__item'));
  if (items.length <= BATCH_SIZE) return;

  var revealedCount = 0;

  function hide(item) {
    var frame = item.querySelector('.works-grid__embed-frame');
    if (frame) {
      frame.dataset.src = frame.getAttribute('src') || '';
      frame.removeAttribute('src');
    }
    var video = item.querySelector('.works-grid__video');
    if (video) video.pause();
    item.classList.add('is-paginated-hidden');
  }

  function reveal(item) {
    item.classList.remove('is-paginated-hidden');
    var frame = item.querySelector('.works-grid__embed-frame');
    // Пока плитка скрыта (display:none, "не в кадре" для observer'а),
    // works-anim-gate.js по своему дальнему таймеру уже мог сам
    // выставить src="about:blank" (тот же наблюдатель следит за ВСЕМИ
    // frame, не только видимыми) — сравнивать нужно с data-src, а не
    // просто с "src ещё пустой", иначе плитка так и останется на
    // about:blank навсегда, даже после открытия кнопкой.
    if (frame && frame.dataset.src && frame.getAttribute('src') !== frame.dataset.src) {
      frame.src = frame.dataset.src;
    }
    var video = item.querySelector('.works-grid__video');
    if (video) video.play().catch(function () {});
  }

  function revealNextBatch() {
    var end = Math.min(revealedCount + BATCH_SIZE, items.length);
    for (var i = revealedCount; i < end; i++) reveal(items[i]);
    revealedCount = end;
    if (revealedCount >= items.length) button.remove();
  }

  items.forEach(function (item, i) {
    if (i >= BATCH_SIZE) hide(item);
  });
  revealedCount = Math.min(BATCH_SIZE, items.length);

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'works-grid__load-more text-button';
  button.textContent = 'Показать ещё';
  button.addEventListener('click', revealNextBatch);
  grid.insertAdjacentElement('afterend', button);
})();
