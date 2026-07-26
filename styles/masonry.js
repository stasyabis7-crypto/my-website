/*
  Балансировка masonry-колонок "в самую короткую колонку" (как в
  Pinterest), поверх разметки/CSS из masonry.css.

  Высота каждой карточки предсказывается по data-ratio (не по реальному
  <img> — его можно ещё не загрузить), поэтому раскладка происходит сразу,
  без ожидания картинок и без прыжков контента.

  Порядок карточек в HTML — это порядок кураторства (что за чем идёт).
  Он сохраняется: карточки просто распределяются по колонкам одна за
  другой, а не пересортировываются по высоте.
*/
(function () {
  var BREAKPOINTS = [
    { minWidth: 1441, columns: 5 },
    { minWidth: 1101, columns: 4 },
    { minWidth: 800, columns: 3 },
    { minWidth: 0, columns: 2 }
  ];

  function columnsFor(width) {
    for (var i = 0; i < BREAKPOINTS.length; i++) {
      if (width >= BREAKPOINTS[i].minWidth) return BREAKPOINTS[i].columns;
    }
    return 2;
  }

  function ratioOf(item) {
    var raw = item.getAttribute('data-ratio') || '1/1';
    var parts = raw.split('/');
    var w = parseFloat(parts[0]);
    var h = parseFloat(parts[1]);
    return w > 0 && h > 0 ? w / h : 1;
  }

  function layout(root, items) {
    if (!items.length) return;

    var width = root.clientWidth;
    var count = columnsFor(width);

    // Число колонок не изменилось — внутри брейкпоинта ширина картинок
    // и так тянется вместе с контейнером через CSS, пересчитывать нечего.
    if (root.dataset.columns === String(count)) return;
    root.dataset.columns = String(count);

    var gap = parseFloat(getComputedStyle(root).getPropertyValue('--masonry-gap')) || 16;
    var colWidth = (width - gap * (count - 1)) / count;

    var cols = [];
    var heights = [];
    for (var i = 0; i < count; i++) {
      cols.push(document.createElement('div'));
      cols[i].className = 'masonry__col';
      heights.push(0);
    }

    items.forEach(function (item) {
      var shortest = heights.indexOf(Math.min.apply(Math, heights));
      cols[shortest].appendChild(item);
      heights[shortest] += colWidth / ratioOf(item) + gap;
    });

    root.classList.add('masonry--js');
    root.replaceChildren.apply(root, cols);
  }

  function init(root) {
    // Исходный порядок карточек фиксируем один раз: после первой
    // раскладки они станут потомками .masonry__col на разной глубине,
    // и повторный querySelectorAll вернул бы уже перемешанный порядок.
    var items = Array.prototype.slice.call(root.querySelectorAll('.masonry__item'));

    items.forEach(function (item) {
      if (!item.style.aspectRatio) {
        item.style.aspectRatio = item.getAttribute('data-ratio') || '1/1';
      }
    });

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
