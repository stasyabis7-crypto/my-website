# Баннер с персонажами

Утверждённая Главная с Anastasia, Stasy и Stas. Источник разметки — `template.html`, статическая копия в `index.html` между маркерами `component:hero-mood`.

Синхронизация: `node scripts/hero-mood-component.js --sync`.
Проверка: `node scripts/hero-mood-component.js`.

`baseline.json` фиксирует SHA-256 шаблона, стилей и поведения. Обновлять только после явного запроса на изменение баннера и проверки мобильной/десктопной раскладки.

Рендер: `styles/mood-companion.js` (Canvas 2D). Контакты и мобильная шапка: `styles/site-chrome.js` и `.css`. Все кнопки из `styles/buttons.css`, типографика из `styles/typography.css`, палитры из `styles/theme.css`.

В галерее персонаж превращается в спутника; поддерживает касания, клавиатуру, паузу и prefers-reduced-motion. Выбор темы сохраняется локально и применяется к интерфейсу страницы проекта. Изображения проектов не перекрашиваются. Загрузка — анимация глаз.
