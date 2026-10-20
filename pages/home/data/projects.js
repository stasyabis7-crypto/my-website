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
  { id: 'charity', label: 'Благотворительность', group: 'industry' },
  { id: 'ecommerce', label: 'E-commerce', group: 'industry' },
  { id: 'maps', label: 'Карты', group: 'product' },
  { id: 'crm', label: 'CRM', group: 'product' },
  { id: 'payments', label: 'Платежи', group: 'product' }
];

window.portfolioProjects = [
  {
    id: 'customer-segments',
    feed: { image: '/projects/ozon-crm/customer-segments/covers/feed-cover-frame-2147239075-1800x2400.webp', width: 1800, height: 2400 },
    title: 'CRM для продавцов Ozon',
    description: 'Сегменты покупателей и рассылки для продавцов',
    href: '/projects/ozon-crm/customer-segments/',
    image: '/projects/ozon-crm/customer-segments/covers/cover-laptop-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: 'Раздел CRM в кабинете Ozon Seller: постоянные покупатели и рекомендации по сегментам',
    platforms: ['web'],
    tags: ['ozon', 'b2b', 'ecommerce', 'crm'],
    place: { c: 1, r: 1, big: true }
  },
  {
    id: 'recycle-map',
    feed: { image: '/projects/avito-charity/recycle-map/covers/feed-cover-324719910-1500x1800.webp', width: 1500, height: 1800 },
    title: 'Карта переработки вещей',
    description: 'Поиск пункта приёма, фильтры и избранное',
    href: '/projects/avito-charity/recycle-map/',
    image: '/projects/avito-charity/recycle-map/covers/cover-laptop-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: 'Карта переработки Авито на экране ноутбука: пункты приёма, категории и избранное',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'maps'],
    place: { c: 3, r: 1 }
  },
  {
    id: 'kind-subscription',
    feed: { image: '/projects/avito-charity/subscription/covers/feed-cover-324719911-1500x1800.webp', width: 1500, height: 1800 },
    title: 'Добрая подписка',
    description: 'Ежемесячная помощь фондам в приложении',
    href: '/projects/avito-charity/subscription/',
    image: '/projects/avito-charity/subscription/covers/subscription-cover-v2-2880x1800.webp',
    width: 2880,
    height: 1800,
    alt: '«Добрая подписка» в приложении Авито',
    platforms: ['mobile', 'web'],
    tags: ['avito', 'b2c', 'charity', 'payments'],
    place: { c: 4, r: 1 }
  },
  {
    id: 'about-company',
    soon: true,
    title: 'Лендинг о компании Авито',
    feed: { image: '/projects/avito-charity/about-company/covers/feed-cover-324719912-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Телефон в руке с лендингом Авито: пять бизнес-направлений — товары, авто, недвижимость, работа',
    place: { c: 1, r: 3 }
  },
  {
    id: 'watches-patches',
    soon: true,
    title: 'Медицинское приложение для часов',
    feed: { image: '/projects/swtec-medical/watches-patches/covers/feed-cover-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Умные часы с экраном показателей: пульс 100 ударов в минуту, 10 757 шагов, 2 345 килокалорий',
    place: { c: 3, r: 3 }
  },
  {
    id: 'patient-app',
    soon: true,
    title: 'Медицинское приложение для пациентов',
    feed: { image: '/projects/swtec-medical/patient-app/covers/feed-cover-324719913-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Два экрана приложения для пациентов: накопленные баллы с графиком и анкета с выбором пола',
    place: { c: 4, r: 3 }
  },
  {
    id: 'minimum-price',
    soon: true,
    title: 'Бустинг акций в ценах',
    feed: { image: '/projects/ozon-prices/minimum-price/covers/feed-cover-frame-2147239076-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Бустинг акций в ценах: карточка с показателем 22% и зелёным индикатором',
    place: { c: 1, r: 4, big: true }
  },
  {
    id: 'charity-profile',
    soon: true,
    title: 'Благотворительность в ЛК',
    feed: { image: '/projects/avito-charity/charity-profile/covers/feed-cover-324719915-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Телефон на зелёной ткани с разделом «#яПомогаю» в Авито: подписки, поддержка людей, забота о природе',
    place: { c: 4, r: 4 }
  },
  {
    id: 'prices-table',
    soon: true,
    title: 'Цены в ЛК селлера',
    feed: { image: '/projects/ozon-prices/prices-table/covers/feed-cover-324719916-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Тёмный экран приложения продавца Ozon: кванты, цены товара, цена для покупателя и бустинг в поиске',
    place: { c: 1, r: 6 }
  },
  {
    id: 'gamification',
    soon: true,
    title: 'Геймификация в ЛК',
    feed: { image: '/projects/avito-charity/gamification/covers/feed-cover-324719917-1500x1800.webp', width: 1500, height: 1800 },
    alt: 'Блок «Творим добро» со списком заданий и баллами: пожертвовать в фонд, купить мерч, поддержать «ЛизаАлерт»',
    place: { c: 2, r: 6 }
  },
  {
    id: 'doctor-dashboard',
    soon: true,
    title: 'Дашборд для врачей',
    feed: { image: '/projects/swtec-medical/doctor-dashboard/covers/feed-cover-frame-2147239077-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Дашборд врача: список пациентов с событиями по дням и почасовой график показателя',
    place: { c: 3, r: 6, big: true }
  },
  {
    id: 'employee-account',
    soon: true,
    title: 'ЛК сотрудника',
    feed: { image: '/projects/employee-account/covers/feed-cover-frame-2147239078-1800x2400.webp', width: 1800, height: 2400 },
    alt: 'Личный кабинет сотрудника: план офиса и управление рабочими местами',
    place: { c: 1, r: 8, big: true }
  }
];

/* Заглушки в ленте Главной: пустые плитки на местах проектов, которые ещё
   не описаны. Убираются по мере добавления кейсов выше. */
window.portfolioFeedStubs = 0;
