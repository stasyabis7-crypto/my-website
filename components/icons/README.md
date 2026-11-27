# Иконки

Общий компонент ДС: `icons.css` задаёт размер, цвет через `currentColor`
и модификаторы `.icon--*`. SVG лежат рядом:

- `arrows/` — стрелки и направления;
- `interface/` — действия и навигация;
- `social/` — социальные сети и сервисы.

Подключение: `/components/icons/icons.css`.
Пример: `<span class="icon icon--arrow-right" aria-hidden="true"></span>`.
Для кнопки без подписи доступное название задаётся на кнопке через `aria-label`.

`.icon--up` — шеврон навигации; `.icon--arrow-upward` — прямая стрелка
со стержнем для роста показателя в результатах кейсов.

Новая общая иконка добавляется сюда с модификатором в `icons.css`.
Иллюстрации, уникальные для содержания кейса, остаются в `projects/<кейс>/media/`.

Канал Telegram: `social/telegram-channel.webp` — цветной логотип из исходника
`324719956.png`, подготовленный штатным lossless-импортом. Модификатор
`.icon--social-telegram-channel` показывает его в круге с общим размером иконок.
В контактах ссылка «Мой канал в Telegram» идёт после личного Telegram
и открывается в новой вкладке. Логотип включён в версионирование CDN.

LinkedIn: `social/linkedin-round.svg` — круглая маска с уменьшенным знаком `in`,
как у остальных социальных иконок. Вектор знака взят из
[Bootstrap Icons](https://github.com/twbs/icons/blob/main/icons/linkedin.svg),
лицензия MIT — `social/bootstrap-icons-license.txt`. Размер и цвет задаются общим
компонентом. Официальный исходник `social/linkedin.webp` сохранён.
