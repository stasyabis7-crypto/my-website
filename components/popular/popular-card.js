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

// Автоплей мини-слайдера включается/выключается по факту видимости карточки
// на экране (см. IntersectionObserver ниже), а не сразу при загрузке —
// та же идея, что у "Обо мне" (about.js), только вместо разового появления
// тут повторяющийся цикл, который можно поставить на паузу.
const MINI_AUTOPLAY_INTERVAL = 3200; // ms

function initPopularCardSlider(article, count) {
  const wrap = article.querySelector(".popular-card__photo-wrap");
  const track = article.querySelector(".popular-card__photo-track");
  const dotsWrap = article.querySelector(".popular-card__dots");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  wrap.style.setProperty("--popular-autoplay-duration", `${MINI_AUTOPLAY_INTERVAL}ms`);

  let activeIndex = 0;

  const dots = Array.from({ length: count }, (_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "popular-card__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Фото ${index + 1} из ${count}`);

    const fill = document.createElement("span");
    fill.className = "popular-card__dot-fill";
    fill.addEventListener("animationend", () => {
      if (index === activeIndex) goTo((activeIndex + 1) % count);
    });
    dot.appendChild(fill);

    dot.addEventListener("click", () => goTo(index));
    dotsWrap.appendChild(dot);
    return { dot, fill };
  });

  function goTo(index) {
    activeIndex = index;
    track.style.transform = `translateX(${activeIndex * -100}%)`;
    dots.forEach(({ dot }, i) => {
      dot.dataset.state = i === activeIndex ? "active" : "default";
      dot.setAttribute("aria-selected", String(i === activeIndex));
    });
    dots.forEach(({ fill }, i) => {
      fill.classList.remove("is-playing");
      if (i === activeIndex && !prefersReducedMotion) {
        void fill.offsetWidth; // reflow — иначе анимация не перезапустится с нуля
        fill.classList.add("is-playing");
      }
    });
  }

  dots[0].dot.dataset.state = "active";
  dots[0].dot.setAttribute("aria-selected", "true");

  if (!("IntersectionObserver" in window) || prefersReducedMotion) return;

  let started = false;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        wrap.classList.toggle("is-paused", !entry.isIntersecting);
        if (entry.isIntersecting && !started) {
          started = true;
          goTo(0);
        }
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(wrap);
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
