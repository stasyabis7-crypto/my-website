/*
  Masonry-раскладка (см. masonry.css) — абсолютное позиционирование по
  алгоритму "в колонку с наименьшей текущей высотой" (skyline),
  обобщённому под карточки шириной в несколько колонок (data-cols).

  Раньше раскладка была на CSS Grid + grid-auto-flow: dense, но у неё
  row-track общий на всю ширину строки: широкая карточка не могла
  начаться, пока ОБЕ колонки под ней не дойдут до одного и того же
  ряда, и под короткой колонкой оставалась дыра до выравнивания. Здесь
  каждая карточка ставится в буквально самое низкое доступное место
  (перебором всех допустимых стартовых колонок для её ширины) — дыр
  не остаётся в принципе.

  Число колонок по брейкпоинтам живёт только здесь (columnCount) —
  раз .masonry больше не размечает колонки в CSS, синхронизировать
  не с чем.
*/
(function () {
  function ratioOf(item) {
    var raw = item.getAttribute('data-ratio') || '1/1';
    var parts = raw.split('/');
    var w = parseFloat(parts[0]);
    var h = parseFloat(parts[1]);
    return w > 0 && h > 0 ? w / h : 1;
  }

  function colsOf(item, maxCols) {
    var raw = parseInt(item.getAttribute('data-cols'), 10);
    var cols = raw > 0 ? raw : 1;
    return Math.min(cols, maxCols);
  }

  function columnCount(width) {
    if (width >= 1441) return 5;
    if (width >= 1101) return 4;
    if (width >= 800) return 3;
    return 2;
  }

  // Резолвим --masonry-gap реальным layout-движком браузера (пробный
  // элемент шириной var(--masonry-gap)), а не parseFloat строки — та же
  // ловушка с unresolved custom property, что чинили в row-gap раньше,
  // здесь бы тоже сыграла (rem как строка вместо px).
  function resolveGapPx(root) {
    var probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.height = '0';
    probe.style.width = 'var(--masonry-gap)';
    root.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    root.removeChild(probe);
    return px || 16;
  }

  function layout(root, items) {
    if (!items.length) return;

    var width = root.clientWidth;
    var count = columnCount(width);
    var gap = resolveGapPx(root);
    var colWidth = (width - gap * (count - 1)) / count;
    var colHeights = new Array(count).fill(0);

    items.forEach(function (item) {
      var cols = colsOf(item, count);
      var itemWidth = colWidth * cols + gap * (cols - 1);
      var itemHeight = itemWidth / ratioOf(item);

      // Из всех наборов `cols` соседних колонок выбираем тот, где
      // карточка встанет НИЖЕ всего (минимум максимума высот колонок
      // внутри набора) — то же самое "самое низкое доступное место",
      // просто честно посчитанное для произвольной ширины карточки.
      var bestStart = 0;
      var bestTop = Infinity;
      for (var start = 0; start <= count - cols; start++) {
        var top = 0;
        for (var c = start; c < start + cols; c++) {
          if (colHeights[c] > top) top = colHeights[c];
        }
        if (top < bestTop) {
          bestTop = top;
          bestStart = start;
        }
      }

      var x = bestStart * (colWidth + gap);
      var y = bestTop;

      item.style.left = x + 'px';
      item.style.top = y + 'px';
      item.style.width = itemWidth + 'px';
      item.style.height = itemHeight + 'px';

      for (var c2 = bestStart; c2 < bestStart + cols; c2++) {
        colHeights[c2] = bestTop + itemHeight + gap;
      }
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
