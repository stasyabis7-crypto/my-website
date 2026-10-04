/* Главная: опубликованные кейсы (components/project-feed). На Главную
   попадают только описанные кейсы; у каждого своя бенто-сетка.
   Картинки бенто — отдельные файлы Главной, с обложкой на странице кейса
   они не связаны.

   bento.rows — число рядов сетки на десктопе (12 колонок, клетка 100px и
   зазор 16px при ширине сетки 1376px).
   bento.tiles — плитки по порядку показа на телефоне:
     col, row — [начало, размах] на десктопе;
     mobile   — 'full' (на всю ширину) или 'half' (две мелкие в строку);
     image, video, alt — медиа плитки; пока их нет, плитка показывает
                         заглушку с размером, в котором готовить картинку. */
window.portfolioProjects = [
  {
    id: 'customer-segments',
    title: 'CRM для продавцов Ozon',
    description: 'Сегменты покупателей и рассылки для продавцов',
    href: '/projects/ozon-crm/customer-segments/',
    bento: {
      rows: 6,
      tiles: [
        { col: [1, 8], row: [1, 6], mobile: 'full',
          image: '/pages/home/assets/customer-segments/segments-table-q90.webp',
          alt: 'Раздел «Сегменты покупателей» в кабинете Ozon Seller: таблица сегментов с рекомендациями' },
        { col: [9, 4], row: [1, 3], mobile: 'half',
          image: '/pages/home/assets/customer-segments/activity-feed-2.webp',
          alt: 'Лента активностей покупателей — фича на будущее' },
        { col: [9, 4], row: [4, 3], mobile: 'half',
          image: '/pages/home/assets/customer-segments/customer-cards-2-q90.webp',
          alt: 'Карточка покупателя, подсказка о рассылке постоянным клиентам и календарь периода' }
      ]
    }
  },
  {
    id: 'recycle-map',
    title: 'Карта переработки вещей',
    description: 'Поиск пункта приёма, фильтры и избранное',
    href: '/projects/avito-charity/recycle-map/',
    bento: {
      rows: 6,
      tiles: [
        { col: [1, 4], row: [1, 6], mobile: 'full',
          image: '/pages/home/assets/recycle-map/map-categories-q90.webp',
          alt: 'Карта с пунктами приёма в приложении и панель «Виды переработки»: одежда, пластик, бумага, стекло' },
        { col: [5, 8], row: [1, 4], mobile: 'full',
          image: '/pages/home/assets/recycle-map/point-card-web-q90.webp',
          alt: 'Карточка пункта переработки рядом с веб-версией карты' },
        { col: [5, 4], row: [5, 2], mobile: 'half',
          image: '/pages/home/assets/recycle-map/map-pin-q90.webp',
          alt: 'Метка пункта на карте: «Переработка вещей», часы работы' },
        { col: [9, 4], row: [5, 2], mobile: 'half',
          image: '/pages/home/assets/recycle-map/map-icons.webp',
          alt: 'Иконки интерфейса карты: поиск, поделиться, меню, избранное, закрыть, назад' }
      ]
    }
  },
  {
    id: 'kind-subscription',
    title: 'Добрая подписка',
    description: 'Ежемесячная помощь фондам в приложении',
    href: '/projects/avito-charity/subscription/',
    bento: {
      rows: 6,
      tiles: [
        { col: [1, 3], row: [1, 6], mobile: 'half',
          image: '/pages/home/assets/kind-subscription/thanks-screens-q90.webp',
          alt: 'Экран «Спасибо за помощь»: отправляем 100 ₽ в фонд «Старость в радость»' },
        { col: [4, 3], row: [1, 6], mobile: 'half',
          image: '/pages/home/assets/kind-subscription/donation-form-q90.webp',
          alt: 'Форма пожертвования и блок подключённой «Доброй подписки»' },
        { col: [7, 6], row: [1, 3], mobile: 'full',
          image: '/pages/home/assets/kind-subscription/promo-star-q90.webp',
          alt: 'Плашка «Умножайте добро: ежемесячно поддерживайте любимый фонд»' },
        { col: [7, 6], row: [4, 3], mobile: 'full',
          image: '/pages/home/assets/kind-subscription/promo-banner-q90.webp',
          alt: 'Баннер «Помогать фондам проще, чем кажется» с кнопкой «Подключить подписку»' }
      ]
    }
  }
];
