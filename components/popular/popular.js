/*
  Логика Popular: строит карточки (см. popular-card.js) и кладёт их в
  сетку. Сама сетка/раскладка — в popular.css, поведение мини-слайдера
  внутри каждой карточки — в popular-card.js.
*/

import { popularCards, createPopularCard } from "./popular-card.js";

const initializedGrids = new WeakSet();

export function initPopular(root = document) {
  const grid = root.querySelector(".popular-grid");
  if (!grid || initializedGrids.has(grid)) return;
  initializedGrids.add(grid);

  popularCards.forEach((card) => {
    grid.appendChild(createPopularCard(card));
  });
}
