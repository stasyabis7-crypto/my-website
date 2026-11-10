# Обложки Главной: RU / EN

Импорт в `test/bilingual-about` от 10 ноября 2026 года: по 11 PNG
из `~/Desktop/Port/ru/main/` и `~/Desktop/Port/en/main/`.

В исходниках языки папок перепутаны. По подтверждению пользователя наборы
подключены по фактическому языку содержимого:

- `en/main/en N.png` — русская обложка, суффикс `-ru.webp`;
- `ru/main/ru N.png` — английская обложка, суффикс `-en.webp`.

Ниже указаны исходные общие слоты. Новые WebP лежат рядом с ними, в `covers/`
соответствующего проекта; общие файлы не перезаписываются. Языковой реестр
обновляется через `npm run images:prepare`.

| Номер N | Проект | Общий слот | Размер, px |
| --- | --- | --- | --- |
| 1 | `customer-segments` | `projects/ozon-crm/customer-segments/covers/feed-cover-frame-2147239075-1800x2400.webp` | 1800 × 2400 |
| 2 | `recycle-map` | `projects/avito-charity/recycle-map/covers/feed-cover-324719910-1500x1800.webp` | 1500 × 1800 |
| 3 | `kind-subscription` | `projects/avito-charity/subscription/covers/feed-cover-324719911-1500x1800.webp` | 1500 × 1800 |
| 4 | `about-company` | `projects/avito-charity/about-company/covers/feed-cover-324719912-1500x1800.webp` | 1500 × 1800 |
| 5 | `patient-app` | `projects/swtec-medical/patient-app/covers/feed-cover-324719913-1500x1800.webp` | 1500 × 1800 |
| 6 | `minimum-price` | `projects/ozon-prices/minimum-price/covers/feed-cover-frame-2147239076-1800x2400.webp` | 1800 × 2400 |
| 7 | `charity-profile` | `projects/avito-charity/charity-profile/covers/feed-cover-324719915-1500x1800.webp` | 1500 × 1800 |
| 8 | `prices-table` | `projects/ozon-prices/prices-table/covers/feed-cover-324719916-1500x1800.webp` | 1500 × 1800 |
| 9 | `gamification` | `projects/avito-charity/gamification/covers/feed-cover-324719917-1500x1800.webp` | 1500 × 1800 |
| 10 | `doctor-dashboard` | `projects/swtec-medical/doctor-dashboard/covers/feed-cover-frame-2147239077-1800x2400.webp` | 1800 × 2400 |
| 11 | `employee-account` | `projects/employee-account/covers/feed-cover-frame-2147239078-1800x2400.webp` | 1800 × 2400 |

На Главной по-прежнему 12 проектов: нового файла для `watches-patches`
в наборе нет, поэтому его существующая общая обложка используется в RU и EN.
Порядок, позиции и пропорции плиток сохранены: крупные 3:4, обычные 5:6.
Это отдельные обложки ленты; первые кадры страниц кейсов не менялись.

Конвертация выполнена существующим `scripts/prepare-images.js`:
lossless WebP с сохранением размеров, прозрачности и пикселей.

Проверены RGBA-пиксели всех 22 файлов. Общий вес уменьшен с 12.40
до 6.88 МиБ (44.5%).

Английская обложка последнего проекта `employee-account` повторно обновлена
из нового `en 11.png` в корне проекта. Локальный импортёр подготовил WebP
без потерь; файл перенесён в соответствующий `covers/`. Размер 1800 × 2400
и русская обложка сохранены.
