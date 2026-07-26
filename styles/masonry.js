/*
  Раскладку целиком делает CSS Grid (см. masonry.css) — dense-flow по
  колонкам одной "высоты строки" не оставляет дыр и не требует пересчёта
  на resize. Единственное, что не выразить атрибутными CSS-селекторами
  (значений слишком много) — сама пропорция карточки: проставляем её
  один раз при загрузке как inline aspect-ratio из data-ratio.
*/
(function () {
  document.querySelectorAll('.masonry__item[data-ratio]').forEach(function (item) {
    item.style.aspectRatio = item.getAttribute('data-ratio');
  });
})();
