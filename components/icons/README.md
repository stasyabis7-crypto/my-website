# Иконки

Общий компонент ДС: `icons.css` задаёт размер, цвет через `currentColor`
и модификаторы `.icon--*`. SVG лежат рядом:

- `arrows/` — стрелки и направления;
- `interface/` — действия и навигация;
- `social/` — социальные сети и сервисы.

Подключение: `/components/icons/icons.css`.
Пример: `<span class="icon icon--arrow-right" aria-hidden="true"></span>`.
Для кнопки без подписи доступное название задаётся на кнопке через `aria-label`.

Новая общая иконка добавляется сюда с модификатором в `icons.css`.
Иллюстрации, уникальные для содержания кейса, остаются в `projects/<кейс>/media/`.

LinkedIn: официальный белый знак из [набора LinkedIn](https://brand.linkedin.com/downloads)
(`in-logo.zip`, `InBug-White.png`), подготовленный в `social/linkedin.webp`
общим `npm run images:prepare`. Маска использует тот же размер и `currentColor`,
что и остальные социальные иконки.
