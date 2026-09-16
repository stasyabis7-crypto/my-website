/* Card content is shared by every slider with data-projects="avito".
   Set href when a case is published; null renders the work-in-progress badge. */
window.projectCollections = {
  ...window.projectCollections,
  avito: [
    ['Карта переработки вещей', 'Поиск, выбор и сохранение пунктов приёма в избранное', 'phone', '/projects/recycle-map/'],
    ['Лендинг о компании', 'Как выросло посещение сайта после редизайна', 'phone'],
    ['Проект для ПМЭФ', 'Укороченный флоу пожертвования для форума', 'phone'],
    ['Редизайн hero—баннера', 'Что будет, если форму пожертвования вынести на первый скролл', 'desktop'],
    ['Чарити в профиле', 'Страница с механиками благотворительности в профиле Авито', 'phone'],
    ['Чарити в чекауте', 'Добавили благотворительность при каждом заказе с доставкой', 'phone'],
    ['Геймификация в ЛК', 'Баллы за хорошие дела', 'phone'],
    ['Пост в ТГ', 'Почему важно показывать, куда ушли деньги с пожертвования', 'square', 'https://t.me/designavito/1874?single'],
    ['Пост в ТГ', 'Подробнее о проекте «Серебряные желания»', 'square'],
    ['Пост в ТГ', 'Покупка благотворительных товаров на Авито', 'square']
  ].map(([title, description, format, href], i) => ({
    title, description, format, href: href || null,
    image: i >= 7 ? `/assets/covers-avito/${i + 1}-original.webp` : `/assets/covers-avito/${i + 1}-1280.webp`,
    // Telegram artwork keeps the original pixels, including its small text.
    srcset: i >= 7
      ? `/assets/covers-avito/${i + 1}-original.webp ${i === 7 ? 1190 : 1192}w`
      : `/assets/covers-avito/${i + 1}-640.webp 640w, /assets/covers-avito/${i + 1}-1280.webp 1280w`,
    // Balanced, mixed sequence. Neighbours differ, including the loop seam.
    color: ['#9FE2A4', '#97A6FD', '#FEB7D7', '#FDF07F', '#FDA597', '#97A6FD', '#9FE2A4', '#FDF07F', '#FEB7D7', '#FDA597'][i]
  }))
};
