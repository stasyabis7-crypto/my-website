/* Главная: опубликованные кейсы и система тегов для фильтра
   (components/project-feed). На Главную попадают только описанные кейсы.
   Платформа выбирается переключателем, остальные теги — чипами;
   у проекта не больше четырёх тегов, по одному из каждой группы.
   video — необязательная обложка-видео (webm, 16:10); image тогда служит
   заглушкой, пока видео грузится или если его нельзя воспроизвести.
   Обложка живёт в covers/ кейса и она же — первый кадр страницы кейса
   (проверяет scripts/check-case-covers.js). */
window.portfolioPlatforms = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'web', label: 'Web' }
];

window.portfolioTags = [
  { id: 'avito', label: 'Avito', group: 'company' },
  { id: 'ozon', label: 'Ozon', group: 'company' },
  { id: 'b2c', label: 'B2C', group: 'audience' },
  { id: 'b2b', label: 'B2B', group: 'audience' },
  { id: 'charity', label: 'Благотворительность', group: 'industry' },
  { id: 'ecommerce', label: 'E-commerce', group: 'industry' },
  { id: 'maps', label: 'Карты', group: 'product' },
  { id: 'crm', label: 'CRM', group: 'product' },
  { id: 'payments', label: 'Платежи', group: 'product' }
];

window.portfolioProjects = [
  {
    id: 'customer-segments',
    title: 'Сегменты покупателей',
    description: 'Аналитика покупателей и рекомендации для рекламы',
    href: '/projects/ozon-crm/customer-segments/',
    image: '/projects/ozon-crm/customer-segments/covers/cover.webp',
    width: 2880,
    height: 1800,
    alt: 'Раздел CRM в кабинете Ozon Seller: постоянные покупатели и рекомендации по сегментам',
    platforms: ['web'],
    tags: ['ozon', 'b2b', 'ecommerce', 'crm']
  },
  {
    id: 'recycle-map',
    title: 'Карта переработки вещей',
    description: 'Поиск, выбор и сохранение пунктов приёма вещей в избранное',
    href: '/projects/avito-charity/recycle-map/',
    image: '/projects/avito-charity/recycle-map/covers/cover-poster.webp',
    video: '/projects/avito-charity/recycle-map/covers/cover.webm?v=3',
    width: 2880,
    height: 1800,
    alt: 'Карта Avito с пунктами приёма вещей и панелью категорий: одежда, пластик, бумага, стекло',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'maps']
  },
  {
    id: 'kind-subscription',
    title: 'Как устроена регулярная помощь в Авито',
    description: 'Подключение и управление «Доброй подпиской»',
    href: '/projects/avito-charity/subscription/',
    image: '/projects/avito-charity/subscription/covers/cover-poster.webp',
    video: '/projects/avito-charity/subscription/covers/cover.mp4',
    width: 2880,
    height: 1800,
    alt: '«Добрая подписка» в приложении Авито',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'payments']
  }
];
