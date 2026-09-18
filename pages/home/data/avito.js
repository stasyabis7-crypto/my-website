/* Card content is shared by every slider with data-projects="avito".
   Set href when a case is published; null renders the work-in-progress badge. */
window.projectCollections = {
  ...window.projectCollections,
  avito: [
    ['Карта переработки вещей', 'Поиск, выбор и сохранение пунктов приёма в избранное', 'square', '/projects/avito-charity/recycle-map/'],
    ['Лендинг о компании', 'Как выросло посещение сайта после редизайна', 'desktop'],
    ['Проект для ПМЭФ', 'Укороченный флоу пожертвования для форума', 'desktop'],
    ['Редизайн hero—баннера', 'Что будет, если форму пожертвования вынести на первый скролл', 'square'],
    ['Чарити в профиле', 'Страница с механиками благотворительности в профиле Авито', 'desktop'],
    ['Чарити в чекауте', 'Добавили благотворительность при каждом заказе с доставкой', 'square'],
    ['Геймификация в ЛК', 'Баллы за хорошие дела', 'desktop'],
    ['Пост в ТГ', 'Почему важно показывать, куда ушли деньги с пожертвования', 'square', 'https://t.me/designavito/1874?single'],
    ['Пост в ТГ', 'Подробнее о проекте «Серебряные желания»', 'square', 'https://t.me/designavito/1971'],
    ['Пост в ТГ', 'Покупка благотворительных товаров на Авито', 'square', 'https://t.me/designavito/1848']
  ].map(([title, description, format, href], i) => ({
    title, description, format, href: href || null,
    image: i < 7 ? `/pages/home/assets/avito/${i + 1}-1920.webp?v=2` : `/pages/home/assets/avito/${i + 1}-original.webp`,
    // Telegram artwork keeps the original pixels, including its small text.
    srcset: i < 7
      ? `/pages/home/assets/avito/${i + 1}-640.webp?v=2 640w, /pages/home/assets/avito/${i + 1}-1280.webp?v=2 1280w, /pages/home/assets/avito/${i + 1}-1920.webp?v=2 1920w`
      : `/pages/home/assets/avito/${i + 1}-original.webp ${i === 7 ? 1190 : 1192}w`,
    // Balanced, mixed sequence. Neighbours differ, including the loop seam.
    color: ['#9FE2A4', '#97A6FD', '#FEB7D7', '#FDF07F', '#FDA597', '#97A6FD', '#9FE2A4', '#FDF07F', '#FEB7D7', '#FDA597'][i]
  }))
};
