const cards = [
  { id: 1, title: "Seller СRM", image: "assets/project-photo-1.jpg", logo: "assets/logo-1.png", href: "#" },
  { id: 2, title: "О компании", image: "assets/project-photo-2.jpg", logo: "assets/logo-2.png", href: "#" },
  { id: 3, title: "Карта переработки", image: "assets/project-photo-3.jpg", logo: "assets/logo-2.png", href: "#" },
  { id: 4, title: "Seller Prices", image: "assets/project-photo-4.jpg", logo: "assets/logo-1.png", href: "#" },
  { id: 5, title: "ПМЭФ 2025", image: "assets/project-photo-5.jpg", logo: "assets/logo-2.png", href: "#" },
  { id: 6, title: "Геймификация", image: "assets/project-photo-6.jpg", logo: "assets/logo-2.png", href: "#" },
  { id: 7, title: "Поиск животных", image: "assets/project-photo-7.jpg", logo: "assets/logo-2.png", href: "#" },
  { id: 8, title: "HR платформа", image: "assets/project-photo-8.jpg", logo: "assets/logo-3.png", href: "#" },
  { id: 9, title: "Здоровье", image: "assets/project-photo-9.jpg", logo: "assets/logo-3.png", href: "#" },
  { id: 10, title: "Time Warp", image: "assets/project-photo-10.jpg", logo: null, href: "#" },
  { id: 11, title: "Dashboard", image: "assets/project-photo-11.jpg", logo: "assets/logo-3.png", href: "#" },
];

export function initProjectCards(root) {
  const grid = document.createElement('div');
  grid.className = 'project-grid';

  cards.forEach(card => {
    const article = document.createElement('article');
    article.className = 'project-card glass-surface';
    article.innerHTML = `
      <div class="project-card__image-wrap">
        <img class="project-card__image" src="${card.image}" alt="${card.title}" />
        ${card.logo ? `<img class="project-card__logo" src="${card.logo}" alt="Логотип компании" />` : ''}
      </div>
      <div class="project-card__body">
        <h2 class="project-card__title">${card.title}</h2>
        <a class="project-card__action" href="${card.href}" aria-label="Открыть проект ${card.title}">
          <span>Перейти</span>
          <svg class="project-card__action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 17L17 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 7H17V17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    `;
    grid.append(article);
  });

  root.append(grid);
}
