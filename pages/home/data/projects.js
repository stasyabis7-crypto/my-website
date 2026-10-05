/* Главная: опубликованные кейсы и система тегов для фильтра
   (components/project-feed). На Главную попадают только описанные кейсы.
   Платформа выбирается переключателем, остальные теги — чипами;
   у проекта не больше четырёх тегов, по одному из каждой группы.
   video — необязательная обложка-видео (webm, 16:10); image тогда служит
   заглушкой, пока видео грузится или если его нельзя воспроизвести.
   Обложка живёт в covers/ кейса и она же — первый кадр страницы кейса
   (проверяет scripts/check-case-covers.js).
   focus — необязательная точка кадрирования (object-position): плитки ленты
   вертикальные, а обложки пока горизонтальные; по умолчанию — центр. */
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
    focus: 'left center',
    title: 'CRM для продавцов Ozon',
    description: 'Сегменты покупателей и рассылки для продавцов',
    href: '/projects/ozon-crm/customer-segments/',
    image: '/projects/ozon-crm/customer-segments/covers/crm-flow-short-stable-poster-1440x900.webp',
    video: '/projects/ozon-crm/customer-segments/covers/crm-flow-short-stable-1440x900-60fps.mp4',
    width: 2880,
    height: 1800,
    alt: 'Раздел CRM в кабинете Ozon Seller: постоянные покупатели и рекомендации по сегментам',
    platforms: ['web'],
    tags: ['ozon', 'b2b', 'ecommerce', 'crm']
  },
  {
    id: 'recycle-map',
    focus: 'left center',
    title: 'Карта переработки вещей',
    description: 'Поиск пункта приёма, фильтры и избранное',
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
    title: 'Добрая подписка',
    description: 'Ежемесячная помощь фондам в приложении',
    href: '/projects/avito-charity/subscription/',
    image: '/projects/avito-charity/subscription/covers/subscription-cover-poster-2880x1800.webp',
    video: '/projects/avito-charity/subscription/covers/subscription-cover-loop-1440x900-60fps.mp4',
    width: 2880,
    height: 1800,
    alt: '«Добрая подписка» в приложении Авито',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'payments']
  }
];

/* Заглушки в ленте Главной: пустые плитки на местах проектов, которые ещё
   не описаны. Убираются по мере добавления кейсов выше. */
window.portfolioFeedStubs = 8;
