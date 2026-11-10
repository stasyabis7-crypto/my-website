# Изображения кейса CRM: RU / EN

Импорт в `test/bilingual-about` от 10 ноября 2026 года. Исходники:
`~/Desktop/Port/ru/CRM/ru N.png` и `~/Desktop/Port/en/CRM/en N.png`.
Номера экспортов сопоставлены с содержимым, а не с порядком блоков страницы.

В таблице указан общий слот относительно `projects/ozon-crm/customer-segments/`.
Фактические файлы расположены рядом с суффиксами `-ru.webp` и `-en.webp`.
Исходные общие изображения не перезаписываются. Языковой реестр создаётся
через `npm run images:prepare` и подключает соответствующий вариант.

| Номер N в обеих папках | Слот на странице | Размер исходника, px |
| --- | --- | --- |
| 1 | `covers/cover-laptop-2880x1800.webp` | 2880 × 1800 |
| 2 | `media/about/about-v2-3840x1680.webp` | 3840 × 1680 |
| 3 | `media/concepts/preview-700x840.webp` | 2100 × 2520 |
| 4 | `media/concepts/bento-1-v2.webp` | 4272 × 4272 |
| 5 | `media/concepts/bento-4.webp` | 2088 × 2088 |
| 6 | `media/concepts/bento-2.webp` | 1125 × 552 |
| 7 | `media/summary/table-v2-3840x1680.webp` | 3840 × 1680 |
| 8 | `media/summary/key-segment-v2-3840x1680.webp` | 3840 × 1680 |
| 9 | `media/setup/recommendation-settings-v2-3840x1680.webp` | 3840 × 1680 |
| 10 | `media/steps/recommendation-slide-1-v2-3840x1680.webp` | 3840 × 1680 |
| 11 | `media/steps/recommendation-slide-2-v2-3840x1680.webp` | 3840 × 1680 |
| 12 | `media/steps/recommendation-slide-3-v2-3840x1680.webp` | 3840 × 1680 |
| 13 | `media/steps/recommendation-slide-4-v2-3840x1680.webp` | 3840 × 1680 |
| 14 | `media/conditions/sending-conditions-1.webp` | 1296 × 1296 |
| 15 | `media/conditions/sending-conditions-2.webp` | 1296 × 1296 |
| 16 | `media/customers/customer-details-v3-3840x1680.webp` | 3840 × 1680 |
| 17 | `media/after-send/campaign-results-v2-3840x1680.webp` | 3840 × 1680 |
| 18 | `media/results/gallery-1-large-2848x2848.webp` | 4272 × 4272 |
| 19 | `media/results/gallery-1-wide-4272x2088.webp` | 4272 × 2088 |
| 20 | `media/results/gallery-1-square-2088x2088.webp` | 2088 × 2088 |
| 21 | `media/results/gallery-2-large-2100x2520.webp` | 4200 × 5040 |
| 22 | `media/results/gallery-2-small-2100x2520.webp` | 2100 × 2520 |
| 23 | `media/results/gallery-2-square-2088x2088.webp` | 2088 × 2088 |

`22` — анонс нового раздела CRM в маленьком вертикальном кадре; `21` — настройки
таблицы в последнем крупном кадре. `19` — календарь, `20` — карточка
покупателя, `23` — список сегментов. Отдельного нового вертикального файла
обложки ленты Главной в этой поставке нет; её самостоятельный слот сохранён.

Конвертация выполняется существующим `scripts/prepare-images.js`:
lossless WebP, с сохранением разрешения, прозрачности и пикселей. Значения
`width` / `height` в HTML обновлены по фактическим размерам; раскладка сохранена.

Проверены все 46 файлов: RGBA-пиксели и размеры совпадают с PNG. Общий вес
уменьшен с 22.82 до 12.04 МиБ (47.2%).
