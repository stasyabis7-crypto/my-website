/* Главная: семь разделов портфолио.
   href задаётся для групп с опубликованными кейсами, концептами или постами.
   count — число проектов (материалов) внутри кликабельной группы; сверяется
   с её страницей скриптом scripts/check-section-counts.js. */
window.portfolioGroups = [
  {
    "id": "avito-charity",
    "title": "Благотворительность",
    "alt": "Телефон с экраном «#яПомогаю» на зелёном плиточном фоне, виден вклад пользователя за три года",
    "description": "Подписки, ESG механики, доступность",
    "tag": "Avito",
    "image": "/projects/avito-charity/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": "/projects/avito-charity/",
    "count": 6,
    "countUnit": "project"
  },
  {
    "id": "ozon-crm",
    "title": "CRM для продавцов",
    "alt": "Монитор с кабинетом Ozon Seller, открыт раздел «Сегменты покупателей» с таблицей аналитики",
    "description": "Создание рассылок и баннеров на покупателей, портрет покупателя, главная в ЛК, сегменты покупателей",
    "tag": "Ozon",
    "image": "/projects/ozon-crm/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": "/projects/ozon-crm/",
    "count": 6,
    "countUnit": "project"
  },
  {
    "id": "ozon-prices",
    "title": "Цены в ЛК селлера",
    "alt": "Ноутбук на синей скамье, на экране раздел «Цены» кабинета Ozon Seller",
    "description": "Редизайн таблицы цен, НДС, временная мин. цена, бустинг",
    "tag": "Ozon",
    "image": "/projects/ozon-prices/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": null
  },
  {
    "id": "swtec-angel",
    "title": "Внутренний ЛК для сотрудника",
    "alt": "Ноутбук на синем ковре, на экране внутренний кабинет сотрудника с планом отпусков",
    "description": "Модуль отпусков, карта офиса, праздники и настройки",
    "tag": "SwtecNN",
    "image": "/projects/swtec-angel/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": null
  },
  {
    "id": "swtec-medical",
    "title": "Медицинские проекты",
    "alt": "Смарт-часы на голубом фоне, на циферблате пульс 100 ударов, 10 757 шагов, 2 345 ккал",
    "description": "Приложение, часы, дашборд для врачей",
    "tag": "SWTecNN",
    "image": "/projects/swtec-medical/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": null
  },
  {
    "id": "concepts",
    "title": "Концепты",
    "alt": "Рука держит телефон с концептом почтового приложения, рядом блокнот на столе",
    "description": "Красивые макеты, которые я делаю для души и для развития UI",
    "tag": "",
    "image": "/projects/concepts/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": "/projects/concepts/",
    "count": 12,
    "countUnit": "project"
  },
  {
    "id": "activities",
    "title": "Активности",
    "alt": "Постер статьи «Куда идут ваши деньги», 76% жертвователей не знают ответа на этот вопрос",
    "description": "Статьи, посты в тг",
    "tag": "",
    "image": "/projects/activities/assets/section-cover.webp",
    "srcset": "",
    "format": "desktop",
    "href": "/projects/activities/",
    "count": 20,
    "countUnit": "material"
  }
];
