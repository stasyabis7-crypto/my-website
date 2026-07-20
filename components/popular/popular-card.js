/*
  PopularCard — данные и фабрика DOM-карточки блока "Популярное".
  Отдельный от ProjectCard (components/project-card) набор карточек —
  свой размер/пропорции фото (квадратные, может быть несколько на
  проект — см. мини-слайдер ниже) и своя типографика заголовка/подзаголовка,
  поэтому не переиспользуем createProjectCard, а заводим параллельный
  компонент с тем же принципом (данные + фабрика).
*/

const popularPhoto = (slug, n) => encodeURI(`assets/popular/popular ${slug} ${n}.png`);

// href: null — у проекта нет перехода, кнопка-стрелка не показывается
// (см. createPopularCard). Как только появится реальная ссылка, достаточно
// проставить её сюда — стрелка отрисуется сама, ничего в разметке менять
// не нужно.
export const popularCards = [
  {
    id: "pmef",
    title: "Пожертвование на ПМЭФ",
    subtitle:
      "Разработала механику доната для гостей форума: укороченный онлайн–флоу и метрики в режиме реального времени",
    images: [popularPhoto("pmef", 1), popularPhoto("pmef", 2)],
    href: null,
  },
  {
    id: "ozon-prices",
    title: "Цены в кабинете продавца",
    subtitle: "Ввела временную минимальную цену, встроила акции в раздел цен, переработала таблицу и фильтры",
    images: [popularPhoto("ozon prices", 1), popularPhoto("ozon prices", 2), popularPhoto("ozon prices", 3)],
    href: null,
  },
  {
    id: "recycle-map",
    title: "Карта раздельного сбора",
    subtitle: "Обновила типографику и UX, добавила сохранение точек в избранное",
    images: [popularPhoto("recycle map", 1), popularPhoto("recycle map", 2), popularPhoto("recycle map", 3)],
    href: null,
  },
  {
    id: "animals",
    title: "Животные из приютов",
    subtitle: "Разработала лендинг с тестом на готовность завести питомца и витриной объявлений от приютов",
    images: [popularPhoto("animals", 1), popularPhoto("animals", 2), popularPhoto("animals", 3)],
    href: null,
  },
];

// Без автоплея: на мобильном фото листаются свайпом пальца, на десктопе —
// наведением мыши (позиция курсора по горизонтали внутри фото напрямую
// маппится на индекс кадра — "скраб"). pointerType различает эти два
// сценария на одних и тех же обработчиках.
const DRAG_THRESHOLD = 32; // px — свайп меньше этого возвращает текущий кадр на место
const DIRECTION_THRESHOLD = 8; // px — до этого не решаем, горизонтальный жест или вертикальный скролл

function initPopularCardSlider(article, count) {
  const wrap = article.querySelector(".popular-card__photo-wrap");
  const track = article.querySelector(".popular-card__photo-track");
  const dotsWrap = article.querySelector(".popular-card__dots");

  let activeIndex = 0;

  const dots = Array.from({ length: count }, (_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "popular-card__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Фото ${index + 1} из ${count}`);
    dot.addEventListener("click", () => goTo(index));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.dataset.state = i === activeIndex ? "active" : "default";
      dot.setAttribute("aria-selected", String(i === activeIndex));
    });
  }

  function goTo(index, withTransition = true) {
    activeIndex = Math.max(0, Math.min(count - 1, index));
    track.style.transition = withTransition ? "" : "none";
    track.style.transform = `translateX(${activeIndex * -100}%)`;
    updateDots();
  }

  updateDots();

  // --- Десктоп: наведение мышью скрабит фото по горизонтали ---
  wrap.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || isDragging) return;
    const rect = wrap.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
    if (index !== activeIndex) goTo(index, false);
  });

  // --- Мобильный: свайп пальцем (вертикальный скролл страницы не трогаем,
  // как и в большом слайдере — см. слайдер.js) ---
  let isDragging = false;
  let dragDirection = null; // null | "horizontal" | "vertical"
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;

  wrap.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    isDragging = true;
    dragDirection = null;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
  });

  wrap.addEventListener("pointermove", (event) => {
    if (!isDragging || event.pointerId !== dragPointerId) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    if (dragDirection === null) {
      if (Math.abs(deltaX) < DIRECTION_THRESHOLD && Math.abs(deltaY) < DIRECTION_THRESHOLD) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        dragDirection = "vertical";
        isDragging = false;
        return;
      }
      dragDirection = "horizontal";
      wrap.setPointerCapture(dragPointerId);
    }

    track.style.transition = "none";
    track.style.transform = `translateX(calc(${activeIndex * -100}% + ${deltaX}px))`;
  });

  function endDrag(event) {
    if (!isDragging || event.pointerId !== dragPointerId || dragDirection !== "horizontal") {
      isDragging = false;
      dragDirection = null;
      return;
    }
    isDragging = false;
    dragDirection = null;
    const deltaX = event.clientX - dragStartX;
    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      goTo(activeIndex - Math.sign(deltaX));
    } else {
      goTo(activeIndex);
    }
  }

  wrap.addEventListener("pointerup", endDrag);
  wrap.addEventListener("pointercancel", endDrag);

  goTo(0, false);
}

export function createPopularCard(card) {
  const article = document.createElement("article");
  article.className = "popular-card";
  article.dataset.projectId = String(card.id);

  const hasMultiplePhotos = card.images.length > 1;

  article.innerHTML = `
    <div class="popular-card__photo-wrap">
      <div class="popular-card__photo-track">
        ${card.images
          .map(
            (src, i) =>
              `<img class="popular-card__photo" src="${src}" alt="${i === 0 ? card.title : ""}" ${
                i === 0 ? "" : 'aria-hidden="true"'
              } />`
          )
          .join("")}
      </div>
      ${
        card.href
          ? `<a class="popular-card__action" href="${card.href}" aria-label="Открыть проект ${card.title}" target="_blank" rel="noopener">
        <svg class="popular-card__action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 17L17 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 7H17V17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>`
          : ""
      }
      ${hasMultiplePhotos ? `<div class="popular-card__dots" role="tablist" aria-label="Фото проекта"></div>` : ""}
    </div>
    <h2 class="popular-card__title">${card.title}</h2>
    <p class="popular-card__subtitle">${card.subtitle}</p>
  `;

  if (hasMultiplePhotos) {
    initPopularCardSlider(article, card.images.length);
  }

  return article;
}
