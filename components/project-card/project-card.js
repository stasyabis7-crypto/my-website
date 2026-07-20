/*
  ProjectCard — данные проектов + фабрика DOM-карточки.
  Разметка карточки живёт только здесь (project-card.html — не используется,
  чтобы markup не расходился в двух местах); слайдер импортирует
  createProjectCard() и сам решает, куда карточки вставлять.
*/

const projectPhoto = (n) => encodeURI(`assets/project photos/project photo ${n}.png`);
const companyLogo = (n) => encodeURI(`assets/company logos/logo ${n}.png`);

// Ширина/высота, при которой лого ещё выводится на полную базовую высоту
// (см. --logo-height-scale в project-card.css) — у всего, что шире,
// высоту уменьшаем, чтобы ширина плашки не убегала заметно дальше
// компактных лого-иконок (Avito, swtec).
const MAX_LOGO_ASPECT = 4.75 / 2.125;

// href: null — у карточки нет перехода, стрелка не показывается
// (см. createProjectCard). Как только для проекта появится реальная
// ссылка, достаточно проставить её сюда — стрелка отрисуется сама.
export const projectCards = [
  { id: 1, title: "Seller CRM", image: projectPhoto(1), logo: companyLogo(1), logoAlt: "Ozon", href: null },
  { id: 2, title: "О компании", image: projectPhoto(2), logo: companyLogo(2), logoAlt: "Avito", href: null },
  { id: 3, title: "Карта переработки", image: projectPhoto(3), logo: companyLogo(2), logoAlt: "Avito", href: null },
  { id: 4, title: "Seller Prices", image: projectPhoto(4), logo: companyLogo(1), logoAlt: "Ozon", href: null },
  { id: 5, title: "ПМЭФ 2025", image: projectPhoto(5), logo: companyLogo(2), logoAlt: "Avito", href: null },
  { id: 6, title: "Геймификация", image: projectPhoto(6), logo: companyLogo(2), logoAlt: "Avito", href: null },
  { id: 7, title: "Поиск животных", image: projectPhoto(7), logo: companyLogo(2), logoAlt: "Avito", href: null },
  { id: 8, title: "HR платформа", image: projectPhoto(8), logo: companyLogo(3), logoAlt: "swtec", href: null },
  { id: 9, title: "Здоровье", image: projectPhoto(9), logo: companyLogo(3), logoAlt: "swtec", href: null },
  { id: 10, title: "Time Warp", image: projectPhoto(10), logo: null, logoAlt: "", href: null },
  { id: 11, title: "Dashboard", image: projectPhoto(11), logo: companyLogo(3), logoAlt: "swtec", href: null },
];

// Нейтральный плейсхолдер (градиент + иконка изображения) на случай,
// пока реальные фото проектов не добавлены в assets/.
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="208" height="245" viewBox="0 0 208 245">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#8fc6f5"/>
          <stop offset="100%" stop-color="#3ba2ec"/>
        </linearGradient>
      </defs>
      <rect width="208" height="245" fill="url(#g)"/>
      <g transform="translate(74,100)" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
        <rect x="0" y="0" width="60" height="46" rx="6"/>
        <circle cx="16" cy="15" r="6"/>
        <path d="M0 38L20 22L34 34L46 20L60 34"/>
      </g>
    </svg>
  `);

export function createProjectCard(card) {
  const article = document.createElement("article");
  article.className = "project-card glass-surface";
  article.dataset.projectId = String(card.id);

  article.innerHTML = `
    <div class="project-card__image-wrap">
      <img class="project-card__image" alt="${card.title}" />
      ${
        card.href
          ? `<a class="project-card__action" href="${card.href}" aria-label="Открыть проект ${card.title}" target="_blank" rel="noopener">
        <svg class="project-card__action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 17L17 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 7H17V17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>`
          : ""
      }
      ${card.logo ? `<span class="project-card__logo-pill"><img class="project-card__logo" alt="${card.logoAlt || ""}" /></span>` : ""}
    </div>
    <h2 class="project-card__title">${card.title}</h2>
  `;

  const image = article.querySelector(".project-card__image");
  image.addEventListener(
    "error",
    () => {
      image.src = FALLBACK_IMAGE;
      image.classList.add("project-card__image--fallback");
    },
    { once: true }
  );
  image.src = card.image;

  const logo = article.querySelector(".project-card__logo");
  if (logo) {
    logo.addEventListener(
      "error",
      () => {
        logo.closest(".project-card__logo-pill")?.remove();
      },
      { once: true }
    );
    logo.addEventListener(
      "load",
      () => {
        // Лого-вордмарки (напр. Ozon) заметно шире иконок-значков (Avito,
        // swtec) — при равной высоте они растягивают плашку в длину сильнее
        // остальных. MAX_LOGO_ASPECT — соотношение сторон, до которого лого
        // ещё показывается на полную базовую высоту; у всего, что шире,
        // высоту уменьшаем ровно настолько, чтобы ширина не превышала ту же
        // границу, что и у компактных лого — плашки остаются сопоставимого
        // размера.
        const aspect = logo.naturalWidth / logo.naturalHeight;
        if (aspect > MAX_LOGO_ASPECT) {
          logo.style.setProperty("--logo-height-scale", String(MAX_LOGO_ASPECT / aspect));
        }
      },
      { once: true }
    );
    logo.src = card.logo;
  }

  return article;
}
