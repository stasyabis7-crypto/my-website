/* Shared Ozon content. Add href when a project is published: the whole white
   card becomes a link and gains a primary theme action in its upper corner. */
window.projectCollections = {
  ...window.projectCollections,
  ozon: [
    ['Раздел Цен в ЛК Селлера', 'Обновили все таблицы и настройки', 'phone'],
    ['НДС на УСН', 'Обновление выбора НДС по запросу гос–ва', 'phone'],
    ['CRM для продавцов', 'Раздел для продвижения товаров с нуля до прода', 'desktop'],
    ['ТГ канал', 'Учила делать анимацию в Protopie', 'square'],
    ['Портрет покупателя', 'Нужен для глубокого анализа своей ЦА', 'square'],
    ['Временная мин. цена', 'Сделали её временной и алёртили везде об этом', 'square'],
    ['Бустинг в ценах', 'Учим пользователей ставить акции на товары', 'square'],
    ['Редизайн таблицы цен', 'Поменяли всё от скролла до кол–ва ячеек', 'desktop']
  ].map(([title, description, format], i) => ({
    title, description, format, href: null,
    image: `/assets/covers-ozon/${i + 1}-1280.webp`,
    srcset: `/assets/covers-ozon/${i + 1}-640.webp 640w, /assets/covers-ozon/${i + 1}-1280.webp 1280w`,
    color: ['#97A6FD', '#FDA597', '#9FE2A4', '#FEB7D7', '#FDF07F', '#97A6FD', '#9FE2A4', '#FEB7D7'][i]
  }))
};
