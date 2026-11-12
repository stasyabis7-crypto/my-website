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

LinkedIn: `social/linkedin-round.svg` — круглая маска с уменьшенным знаком `in`,
как у остальных социальных иконок. Вектор знака взят из
[Bootstrap Icons](https://github.com/twbs/icons/blob/main/icons/linkedin.svg),
лицензия MIT — `social/bootstrap-icons-license.txt`. Размер и цвет задаются общим
компонентом. Официальный исходник `social/linkedin.webp` сохранён.
