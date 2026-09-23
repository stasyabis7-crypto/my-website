/* Главная: опубликованные кейсы и система тегов для фильтра
   (components/project-feed). На Главную попадают только описанные кейсы.
   Платформа выбирается переключателем, остальные теги — чипами;
   у проекта не больше четырёх тегов, по одному из каждой группы.
   video — необязательная обложка-видео (webm, 16:10); image тогда служит
   заглушкой, пока видео грузится или если его нельзя воспроизвести. */
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
  { id: 'crm', label: 'CRM', group: 'product' }
];

window.portfolioProjects = [
  {
    id: 'customer-segments',
    title: 'Сегменты покупателей',
    description: 'Аналитика покупателей и рекомендации для рассылок и рекламы в Ozon Seller',
    href: '/projects/ozon-crm/customer-segments/',
    image: '/projects/ozon-crm/customer-segments/covers/project-crm-1.webp',
    width: 1380,
    height: 1380,
    alt: 'Ноутбук на белом столе с разделом «Сегменты покупателей» кабинета Ozon Seller',
    platforms: ['web'],
    tags: ['ozon', 'b2b', 'ecommerce', 'crm']
  },
  {
    id: 'recycle-map',
    title: 'Карта переработки вещей',
    description: 'Поиск, выбор и сохранение пунктов приёма вещей в избранное',
    href: '/projects/avito-charity/recycle-map/',
    image: '/projects/avito-charity/recycle-map/covers/cover-poster.webp',
    video: '/projects/avito-charity/recycle-map/covers/cover.webm?v=2',
    width: 2880,
    height: 1800,
    alt: 'Карта Avito с пунктами приёма вещей и панелью категорий: одежда, пластик, бумага, стекло',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'maps']
  }
];
