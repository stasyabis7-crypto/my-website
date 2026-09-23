# Главная

Публичный вход остаётся в `/index.html`, поэтому адрес сайта не меняется.

- `data/projects.js` — опубликованные кейсы Главной и система тегов для фильтра.
- `data/avito.js`, `data/ozon.js` — содержимое подборок проектов.
- `assets/avito/`, `assets/ozon/` — изображения этих подборок и размеры для `srcset`.

Механика и оформление находятся в общих компонентах `components/hero-mood/`,
`components/project-feed/`, `components/chip-scroller/`, `components/breadcrumbs/`. Иллюстрации отдельных
страниц и обложки разделов лежат рядом с ними в `projects/<раздел>/assets/`.
