/*
  Рандомизация проектов в галерее работ — сама раскладка (55
  плашек-слотов, их формы и позиции, см. works-grid.css) остаётся
  прибитой в разметке, но при каждом заходе какой проект в какой
  плашке оказывается — перемешивается, чтобы одни и те же проекты не
  оседали наверху навсегда.

  Раскладка — чистый CSS Grid (grid-auto-flow: dense), а её финальные
  визуальные позиции целиком определяются ПОСЛЕДОВАТЕЛЬНОСТЬЮ форм
  карточек в DOM. Поэтому переставлять можно только карточки ОДНОЙ и
  той же формы (--square с --square, --tall с --tall и т.д.) и строго
  на места друг друга — тогда набор форм по порядку не меняется, а
  значит не меняется и раскладка, меняется только то, какой проект в
  какой из них.

  Плейсхолдеры (ещё не занятые слоты — data-slot есть, data-title нет,
  см. index.html) в перестановке не участвуют и остаются на своих
  местах: это не проекты, рандомить их незачем.

  Скрипт — синхронный <script> сразу после .works-grid в разметке (см.
  index.html), отрабатывает до раскладки/отрисовки страницы и до того,
  как loading.js решает, какие карточки считать "первым экраном" — так
  разброс проектов уже учтён, когда экран загрузки решает, что ждать.
*/
(function () {
  var gallery = document.getElementById('works-gallery');
  if (!gallery) return;

  var SHAPE_CLASSES = [
    'works-grid__item--square',
    'works-grid__item--wide-left',
    'works-grid__item--wide-right',
    'works-grid__item--tall'
  ];

  function shapeOf(el) {
    for (var i = 0; i < SHAPE_CLASSES.length; i++) {
      if (el.classList.contains(SHAPE_CLASSES[i])) return SHAPE_CLASSES[i];
    }
    return null;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  var children = Array.prototype.slice.call(gallery.children);
  var result = children.slice();
  var indicesByShape = {};

  children.forEach(function (el, i) {
    if (!el.hasAttribute('data-title')) return; // плейсхолдер — не трогаем
    var shape = shapeOf(el);
    if (!shape) return;
    (indicesByShape[shape] = indicesByShape[shape] || []).push(i);
  });

  Object.keys(indicesByShape).forEach(function (shape) {
    var indices = indicesByShape[shape];
    var shuffled = shuffle(indices.map(function (i) { return children[i]; }));
    indices.forEach(function (slotIndex, k) { result[slotIndex] = shuffled[k]; });
  });

  // append с уже существующими узлами — это перемещение, а не
  // пересоздание (img/iframe не теряют/не рестартуют состояние из-за
  // самого факта перестановки), один reflow на всю галерею.
  gallery.append.apply(gallery, result);
})();
