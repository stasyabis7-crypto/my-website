/* Shared Ozon content. Add href when a project is published: the whole white
   card becomes a link and gains a primary theme action in its upper corner. */
window.projectCollections = {
  ...window.projectCollections,
  ozon: [
    ['Раздел Цен в ЛК Селлера', 'Обновили все таблицы и настройки', 'desktop'],
    ['НДС на УСН', 'Обновление выбора НДС по запросу гос–ва', 'square'],
    ['CRM для продавцов', 'Раздел для продвижения товаров с нуля до прода', 'desktop'],
    ['ТГ канал', 'Учила делать анимацию в Protopie', 'desktop', 'https://t.me/ozondesign/4393'],
    ['Портрет покупателя', 'Нужен для глубокого анализа своей ЦА', 'square'],
    ['Временная мин. цена', 'Сделали её временной и алёртили везде об этом', 'square'],
    ['Бустинг в ценах', 'Учим пользователей ставить акции на товары', 'square'],
    ['Редизайн таблицы цен', 'Поменяли всё от скролла до кол–ва ячеек', 'desktop']
  ].map(([title, description, format, href], i) => ({
    title, description, format, href: href || null,
    image: i < 4 ? `/assets/covers-ozon/${i + 1}-1920.webp?v=3` : `/assets/covers-ozon/${i + 1}-1280.webp`,
    srcset: i < 4
      ? `/assets/covers-ozon/${i + 1}-640.webp?v=3 640w, /assets/covers-ozon/${i + 1}-1280.webp?v=3 1280w, /assets/covers-ozon/${i + 1}-1920.webp?v=3 1920w`
      : `/assets/covers-ozon/${i + 1}-640.webp 640w, /assets/covers-ozon/${i + 1}-1280.webp 1280w`,
    color: '#EEF0F4'
  }))
};
