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
   feed.video — зацикленная обложка ленты без звука; feed.image — её первый кадр
   на время загрузки и при reduced motion.
   focus — необязательная точка кадрирования (object-position): плитки ленты
   вертикальные, а обложки пока горизонтальные; по умолчанию — центр.
   place — место плитки на десктопе { c: колонка 1–4, r: строка, big: крупная 2×2 };
   его ставит админка (docs/admin.md), без него место берётся из набора ленты. */
window.portfolioPlatforms = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'web', label: 'Web' }
];

window.portfolioTags = [
  { id: 'avito', label: 'Avito', group: 'company' },
  { id: 'ozon', label: 'Ozon', group: 'company' },
  { id: 'b2c', label: 'B2C', group: 'audience' },
  { id: 'b2b', label: 'B2B', group: 'audience' },
  { id: 'charity', label: 'Charity', group: 'industry' },
  { id: 'ecommerce', label: 'E-commerce', group: 'industry' },
  { id: 'maps', label: 'Maps', group: 'product' },
  { id: 'crm', label: 'CRM', group: 'product' },
  { id: 'payments', label: 'Payments', group: 'product' }
];

window.portfolioProjects = [
  {
    id: 'customer-segments',
    feed: { image: '/projects/ozon-crm/customer-segments/covers/feed-cover-frame-2147239075-1800x2400.webp', width: 1800, height: 2400 },
    title: 'CRM for Ozon sellers',
    description: 'Customer segments and campaigns for sellers',
    href: '/projects/ozon-crm/customer-segments/',
    image: '/projects/ozon-crm/customer-segments/covers/cover-laptop-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: 'CRM section in the Ozon Seller account: repeat customers and segment recommendations',
    platforms: ['web'],
    tags: ['ozon', 'b2b', 'ecommerce', 'crm'],
    place: { c: 1, r: 1, big: true }
  },
  {
    id: 'recycle-map',
    feed: { image: '/projects/avito-charity/recycle-map/covers/feed-cover-324719910-1500x1800.webp', width: 1500, height: 1800 },
    title: 'Recycling map',
    description: 'Finding a drop-off point, filters and favourites',
    href: '/projects/avito-charity/recycle-map/',
    image: '/projects/avito-charity/recycle-map/covers/cover-laptop-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: 'Avito recycling map on a laptop screen: drop-off points, categories and favourites',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'maps'],
    place: { c: 3, r: 1 }
  },
  {
    id: 'kind-subscription',
    feed: { image: '/projects/avito-charity/subscription/covers/feed-cover-324719911-1500x1800.webp', width: 1500, height: 1800 },
    title: 'Kind Subscription',
    description: 'Monthly donations to charities in the app',
    href: '/projects/avito-charity/subscription/',
    image: '/projects/avito-charity/subscription/covers/subscription-cover-v2-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: 'Kind Subscription in the Avito app',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'payments'],
    place: { c: 4, r: 1 }
  },
  {
    id: 'about-company',
    soon: true,
    title: 'Avito company landing page',
    feed: { image: '/projects/avito-charity/about-company/covers/feed-cover-324719912-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'A hand holding a phone with the Avito landing page: business areas — goods, cars, real estate, jobs',
    place: { c: 1, r: 3 }
  },
  {
    id: 'watches-patches',
    soon: true,
    title: 'Medical app for smartwatches',
    feed: { image: '/projects/swtec-medical/watches-patches/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Smartwatch showing vitals: heart rate 100 bpm, 10,757 steps, 2,345 kcal',
    place: { c: 3, r: 3 }
  },
  {
    id: 'patient-app',
    soon: true,
    title: 'Medical app for patients',
    feed: { image: '/projects/swtec-medical/patient-app/covers/feed-cover-324719913-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Two screens of the patient app: earned points with a chart and a questionnaire with gender selection',
    place: { c: 4, r: 3 }
  },
  {
    id: 'minimum-price',
    soon: true,
    title: 'Promotion boosting in pricing',
    feed: { image: '/projects/ozon-prices/minimum-price/covers/feed-cover-frame-2147239076-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Promotion boosting in pricing: a card showing 22% with a green indicator',
    place: { c: 1, r: 4, big: true }
  },
  {
    id: 'charity-profile',
    soon: true,
    title: 'Charity in the user account',
    feed: { image: '/projects/avito-charity/charity-profile/covers/feed-cover-324719915-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'A phone on green fabric showing the Avito #яПомогаю (I help) section: subscriptions, helping people, caring for nature',
    place: { c: 4, r: 4 }
  },
  {
    id: 'prices-table',
    soon: true,
    title: 'Prices in the seller account',
    feed: { image: '/projects/ozon-prices/prices-table/covers/feed-cover-324719916-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Dark screen of the Ozon seller app: quantities, product prices, buyer price and search boosting',
    place: { c: 1, r: 6 }
  },
  {
    id: 'gamification',
    soon: true,
    title: 'Gamification in the user account',
    feed: { image: '/projects/avito-charity/gamification/covers/feed-cover-324719917-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'The “Doing good” block with tasks and points: donate to a charity, buy merch, support LizaAlert',
    place: { c: 2, r: 6 }
  },
  {
    id: 'doctor-dashboard',
    soon: true,
    title: 'Dashboard for doctors',
    feed: { image: '/projects/swtec-medical/doctor-dashboard/covers/feed-cover-frame-2147239077-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Doctor dashboard: patient list with daily events and an hourly chart of a vital sign',
    place: { c: 3, r: 6, big: true }
  },
  {
    id: 'employee-account',
    soon: true,
    title: 'Employee account',
    feed: { image: '/projects/employee-account/covers/feed-cover-frame-2147239078-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Employee account: office floor plan and desk management',
    place: { c: 1, r: 8, big: true }
  }
];

/* Заглушки в ленте Главной: пустые плитки на местах проектов, которые ещё
   не описаны. Убираются по мере добавления кейсов выше. */
window.portfolioFeedStubs = 0;
