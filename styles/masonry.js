/*
  Классическая Pinterest-masonry "в самую короткую колонку" (см.
  masonry.css) — все карточки одной ширины (1 колонка), разной высоты
  по data-ratio. N независимых вертикальных стопок, каждая карточка по
  порядку уходит в текущую самую короткую — дыр не бывает по
  построению (в отличие от вариантов с карточками на несколько
  колонок, которые пробовали раньше и отказались).
*/
(function () {
  function ratioOf(item) {
    var raw = item.getAttribute('data-ratio') || '1/1';
    var parts = raw.split('/');
    var w = parseFloat(parts[0]);
    var h = parseFloat(parts[1]);
    return w > 0 && h > 0 ? w / h : 1;
  }

  function columnCount(width) {
    if (width >= 1441) return 4;
    if (width >= 1101) return 3;
    return 2;
  }

  // Резолвим --masonry-gap реальным layout-движком браузера (пробный
  // элемент шириной var(--masonry-gap)), а не parseFloat строки —
  // getPropertyValue на custom property вернул бы значение КАК
  // НАПИСАНО ("10px" — тут безопасно, но если гэп когда-то станет
  // rem, parseFloat молча даст неверное число в px).
  function resolveGapPx(root) {
    var probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.height = '0';
    probe.style.width = 'var(--masonry-gap)';
    root.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    root.removeChild(probe);
    return px || 10;
  }

  function layout(root, items) {
    if (!items.length) return;

    var width = root.clientWidth;
    var count = columnCount(width);
    var gap = resolveGapPx(root);
    var colWidth = (width - gap * (count - 1)) / count;
    var colHeights = new Array(count).fill(0);

    items.forEach(function (item) {
      var itemHeight = colWidth / ratioOf(item);

      var col = 0;
      for (var c = 1; c < count; c++) {
        if (colHeights[c] < colHeights[col]) col = c;
      }

      var x = col * (colWidth + gap);
      var y = colHeights[col];

      item.style.left = x + 'px';
      item.style.top = y + 'px';
      item.style.width = colWidth + 'px';
      item.style.height = itemHeight + 'px';

      colHeights[col] = y + itemHeight + gap;
    });

    var maxHeight = 0;
    for (var i = 0; i < colHeights.length; i++) {
      if (colHeights[i] > maxHeight) maxHeight = colHeights[i];
    }
    root.style.height = Math.max(0, maxHeight - gap) + 'px';
  }

  function init(root) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.masonry__item'));
    var relayout = function () { layout(root, items); };
    relayout();

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(relayout).observe(root);
    } else {
      window.addEventListener('resize', relayout);
    }
  }

  document.querySelectorAll('.masonry').forEach(init);
})();
