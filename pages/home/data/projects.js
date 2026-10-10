/* Главная: опубликованные кейсы и система тегов для фильтра
   (components/project-feed). На Главную попадают только описанные кейсы.
   Платформа выбирается переключателем, остальные теги — чипами;
   у проекта не больше четырёх тегов, по одному из каждой группы.
   video — необязательная обложка-видео (webm, 16:10); image тогда служит
   заглушкой, пока видео грузится или если его нельзя воспроизвести.
   Обложка живёт в covers/ кейса и она же — первый кадр страницы кейса
   (проверяет scripts/check-case-covers.js).
   soon: true — проект без страницы: в ленте обложка без ссылки с подписью
   «Скоро появится»; ему нужны только title, feed и alt.
   feed — необязательная вертикальная обложка только для ленты Главной
   (крупная плитка 3:4, обычная 5:6); страница кейса берёт image/video.
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
    feed: { image: '/projects/ozon-crm/customer-segments/covers/feed-cover-1800x2400.webp', width: 1800, height: 2400 },
    title: 'CRM для продавцов Ozon',
    description: 'Сегменты покупателей и рассылки для продавцов',
    href: '/projects/ozon-crm/customer-segments/',
    image: '/projects/ozon-crm/customer-segments/covers/cover-b-1440x900.webp',
    width: 1440,
    height: 900,
    alt: 'Раздел CRM в кабинете Ozon Seller: постоянные покупатели и рекомендации по сегментам',
    platforms: ['web'],
    tags: ['ozon', 'b2b', 'ecommerce', 'crm']
  },
  {
    id: 'recycle-map',
    feed: { image: '/projects/avito-charity/recycle-map/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    title: 'Карта переработки вещей',
    description: 'Поиск пункта приёма, фильтры и избранное',
    href: '/projects/avito-charity/recycle-map/',
    image: '/projects/avito-charity/recycle-map/covers/cover-laptop-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: 'Карта переработки Авито на экране ноутбука: пункты приёма, категории и избранное',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'maps']
  },
  {
    id: 'kind-subscription',
    feed: { image: '/projects/avito-charity/subscription/covers/feed-cover-loop-750x900.webp', video: '/projects/avito-charity/subscription/covers/feed-cover-loop-750x900.mp4', width: 750, height: 900 },
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
  },
  {
    id: 'about-company',
    soon: true,
    title: 'Лендинг о компании Авито',
    feed: { image: '/projects/avito-charity/about-company/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Телефон в руке с лендингом Авито: пять бизнес-направлений — товары, авто, недвижимость, работа'
  },
  {
    id: 'watches-patches',
    soon: true,
    title: 'Медицинское приложение для часов',
    feed: { image: '/projects/swtec-medical/watches-patches/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Умные часы с экраном показателей: пульс 100 ударов в минуту, 10 757 шагов, 2 345 килокалорий'
  },
  {
    id: 'patient-app',
    soon: true,
    title: 'Медицинское приложение для пациентов',
    feed: { image: '/projects/swtec-medical/patient-app/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Два экрана приложения для пациентов: накопленные баллы с графиком и анкета с выбором пола'
  },
  {
    id: 'minimum-price',
    soon: true,
    title: 'Временная минимальная цена',
    feed: { image: '/projects/ozon-prices/minimum-price/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Окно «Отслеживайте срок действия минимальной цены» с будильником и тремя способами настройки'
  },
  {
    id: 'charity-profile',
    soon: true,
    title: 'Благотворительность в ЛК',
    feed: { image: '/projects/avito-charity/charity-profile/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Телефон на зелёной ткани с разделом «#яПомогаю» в Авито: подписки, поддержка людей, забота о природе'
  },
  {
    id: 'prices-table',
    soon: true,
    title: 'Цены в ЛК селлера',
    feed: { image: '/projects/ozon-prices/prices-table/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Тёмный экран приложения продавца Ozon: кванты, цены товара, цена для покупателя и бустинг в поиске'
  },
  {
    id: 'gamification',
    soon: true,
    title: 'Геймификация в ЛК',
    feed: { image: '/projects/avito-charity/gamification/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Блок «Творим добро» со списком заданий и баллами: пожертвовать в фонд, купить мерч, поддержать «ЛизаАлерт»'
  },
  {
    id: 'doctor-dashboard',
    soon: true,
    title: 'Дашборд для врачей',
    feed: { image: '/projects/swtec-medical/doctor-dashboard/covers/feed-cover-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Дашборд врача: список пациентов с событиями по дням и почасовой график показателя'
  }
];

/* Заглушки в ленте Главной: пустые плитки на местах проектов, которые ещё
   не описаны. Убираются по мере добавления кейсов выше. */
window.portfolioFeedStubs = 0;
