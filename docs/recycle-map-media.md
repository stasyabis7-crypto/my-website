# Изображения кейса карты раздельного сбора: RU / EN

Импорт в `test/bilingual-about` от 10 ноября 2026 года. Исходники:
`~/Desktop/Port/ru/recyclemap/ru N.png` и
`~/Desktop/Port/en/recyclemap/en N.png`.

Содержимое сопоставлено с существующими блоками кейса. В таблице указан
общий слот относительно `projects/avito-charity/recycle-map/`.
Новые файлы лежат рядом с суффиксами `-ru.webp` и `-en.webp`;
общие изображения не перезаписываются. Языковой реестр обновляется
существующей командой `npm run images:prepare`.

| Номер N в обеих папках | Слот на странице | Размер исходника, px |
| --- | --- | --- |
| 1 | `covers/cover-laptop-2880x1800.webp` | 2880 × 1800 |
| 2 | `media/about/statement-desktop-v2-3840x1680.webp` | 3840 × 1680 |
| 3 | `media/about/statement-mobile-v2-1200x1500.webp` | 1200 × 1500 |
| 4 | `media/concepts/concept-1-v2-2880x1600.webp` | 2880 × 1600 |
| 5 | `media/concepts/concept-2-v2-2880x1600.webp` | 2880 × 1600 |
| 6 | `media/navigation/before-v2-2880x1600.webp` | 2880 × 1600 |
| 7 | `media/navigation/after-v2-2880x1600.webp` | 2880 × 1600 |
| 8 | `media/filters/before-1600.webp` | 1600 × 1600 |
| 9 | `media/filters/after-1600.webp` | 1600 × 1600 |
| 10 | `media/filters/result-v2-2880x1800.webp` | 2880 × 1800 |
| 11 | `media/favorites/card-v2-2880x1600.webp` | 2880 × 1600 |
| 12 | `media/favorites/schedule-b-1600.webp` | 1600 × 1600 |
| 13 | `media/favorites-list/favorites-b-2880x1600.webp` | 2880 × 1600 |
| 14 | `media/gallery/filters-1400x1680.webp` | 1400 × 1680 |
| 15 | `media/gallery/pin-1400x864.webp` | 2100 × 1296 |
| 16 | `media/gallery/icons-1792x864.webp` | 2688 × 1296 |
| 17 | `media/gallery/saved-b-1400x1680.webp` | 1400 × 1680 |
| 18 | `media/gallery/categories-1200x904.webp` | 900 × 678 |
| 19 | `media/gallery/card-700x840.webp` | 2100 × 2520 |

`2` — широкий кадр, `3` — его отдельный мобильный вариант в `<picture>`
для экранов до 699 px. `4` / `5` — концепты, `6` / `7` — навигация
до и после изменений, `8` / `9` — фильтры до и после изменений.
`17` — крупный кадр избранного после результатов, `18` — иконки категорий
слева от него, `19` — карточка пункта в маленьком вертикальном кадре.

Раскладка и пропорции сохранены; атрибуты `width` / `height` соответствуют
новым файлам. Нового отдельного вертикального файла обложки ленты Главной
в этой поставке нет; её независимый слот сохранён.

PNG преобразуются существующим `scripts/prepare-images.js` в lossless WebP
с сохранением разрешения и прозрачности. Исходные PNG остаются во внешних
папках пользователя; в проект копируются готовые WebP.

Проверены все 38 файлов: RGBA-пиксели и размеры полностью совпадают с PNG.
Общий вес уменьшен с 35.48 до 20.93 МиБ (41.0%).
