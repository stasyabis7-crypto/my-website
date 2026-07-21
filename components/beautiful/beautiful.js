/*
  Beautiful — блок "Красивое". Два независимых UI под разные разрешения
  (см. beautiful.css за переключение видимости по media query):

  - Мобильный (<800px, initSolo): одно большое фото + лента миниатюр под
    ним, миниатюра выбирается кликом/свайпом. Без автоплея — только по
    действию пользователя.
  - Планшет/десктоп (800px+, initSlider): слайдер на N фото в ряд (2 на
    планшете, 3 на десктопе), листает по одному фото за раз, стрелки
    постоянно лежат поверх крайних видимых фото, точки-пагинация
    сгруппированы по N (точка = "страница" из N карточек).

  Исходники тяжёлые (до ~2 МБ штука) — все фото предзагружаются в фоне
  сразу при инициализации (preload ниже), чтобы переключение в мобильном
  варианте не выглядело как зависание (там смена — это swap src одного
  <img>, а не отдельные картинки, как в слайдере). Слайдер этой проблемы
  не имеет: там всегда N настоящих <img>, драгом/подгрузкой рулит браузер
  (loading="lazy"), которые просто уезжают под трек.
*/

const beautifulPhoto = (n) => encodeURI(`assets/beautiful/beautiful chosen ${n}.png`);
export const beautifulPhotos = Array.from({ length: 11 }, (_, i) => beautifulPhoto(i + 1));

// Промисы вместо просто new Image() — solo-режим ждёт готовности
// конкретного кадра, а не просто "запустили загрузку".
const preloadCache = new Map();
function preload(src) {
  if (!preloadCache.has(src)) {
    preloadCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // не блокируем переключение из-за одной битой картинки
        img.src = src;
      })
    );
  }
  return preloadCache.get(src);
}

const initializedBlocks = new WeakSet();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initBeautiful(root = document) {
  const block = root.querySelector(".beautiful-block");
  if (!block || initializedBlocks.has(block)) return;
  initializedBlocks.add(block);

  // Не ждём — просто запускаем загрузку всех кадров в фоне сразу, пока
  // человек ещё читает заголовок/разглядывает первое фото. Общий кэш —
  // те же URL подхватит и слайдер через обычный HTTP-кэш браузера.
  beautifulPhotos.forEach(preload);

  initSolo(block);
  initSlider(block);
}

/* --- Мобильный: фото + лента миниатюр --- */

function initSolo(block) {
  const photoWrap = block.querySelector(".beautiful-block__photo-wrap");
  const photo = block.querySelector(".beautiful-block__photo");
  const counter = block.querySelector(".beautiful-block__counter");
  const thumbsWrap = block.querySelector(".beautiful-block__thumbs");

  const thumbs = beautifulPhotos.map((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "beautiful-block__thumb";
    button.setAttribute("aria-label", `Фото ${index + 1} из ${beautifulPhotos.length}`);

    const img = document.createElement("img");
    img.className = "beautiful-block__thumb-image";
    img.src = src;
    img.alt = "";
    img.loading = "lazy";

    button.appendChild(img);
    button.addEventListener("click", () => goTo(index));
    thumbsWrap.appendChild(button);
    return button;
  });

  let activeIndex = 0;
  let switchToken = 0;

  function updateCounter() {
    counter.textContent = `${activeIndex + 1} из ${beautifulPhotos.length}`;
  }

  // Скроллим только саму ленту миниатюр (её scrollLeft), а не через
  // scrollIntoView — тот умеет утащить за собой и скролл страницы, если
  // блок целиком не виден.
  function scrollThumbIntoView(thumb) {
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const left = thumb.offsetLeft;
    const right = left + thumb.offsetWidth;
    const viewLeft = thumbsWrap.scrollLeft;
    const viewRight = viewLeft + thumbsWrap.clientWidth;
    if (left < viewLeft) thumbsWrap.scrollTo({ left, behavior });
    else if (right > viewRight) thumbsWrap.scrollTo({ left: right - thumbsWrap.clientWidth, behavior });
  }

  async function goTo(index) {
    activeIndex = ((index % beautifulPhotos.length) + beautifulPhotos.length) % beautifulPhotos.length;
    // Счётчик/подсветка миниатюры переключаются сразу, не дожидаясь фото —
    // само фото подхватывает как только готово (обычно мгновенно, см. верх
    // файла), но реакция на клик не должна ничего ждать.
    updateCounter();
    thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === activeIndex));
    scrollThumbIntoView(thumbs[activeIndex]);

    const src = beautifulPhotos[activeIndex];
    const token = ++switchToken;
    photo.classList.add("is-switching");
    await preload(src);
    if (token !== switchToken) return; // пока грузили, уже переключили дальше
    await new Promise((resolve) => {
      photo.addEventListener("load", resolve, { once: true });
      photo.src = src;
    });
    if (token !== switchToken) return;
    photo.classList.remove("is-switching");
  }

  goTo(0);
}

/* --- Планшет/десктоп: слайдер на N фото в ряд --- */

// Те же брейкпоинты, что и в beautiful.css (--beautiful-slider-count):
// 800–1100 = 2 фото в ряд, 1101+ = 3.
const sliderDesktopQuery = window.matchMedia("(min-width: 1101px)");

function initSlider(block) {
  const viewport = block.querySelector(".beautiful-block__slider-viewport");
  const track = block.querySelector(".beautiful-block__slider-track");
  const dotsWrap = block.querySelector(".beautiful-block__dots");
  const prevButton = block.querySelector(".beautiful-block__nav--prev");
  const nextButton = block.querySelector(".beautiful-block__nav--next");

  beautifulPhotos.forEach((src, index) => {
    const item = document.createElement("div");
    item.className = "beautiful-block__slider-item";

    const img = document.createElement("img");
    img.className = "beautiful-block__slider-image";
    img.src = src;
    img.alt = index === 0 ? "Красивое, но невыпущенное" : "";
    if (index > 2) img.loading = "lazy"; // первые несколько — сразу видны, дальше подгружает браузер

    item.appendChild(img);
    track.appendChild(item);
  });

  const items = Array.from(track.children);
  let visibleCount = getVisibleCount();
  let startIndex = 0;
  let dots = [];

  function getVisibleCount() {
    return sliderDesktopQuery.matches ? 3 : 2;
  }

  function maxStart() {
    return Math.max(0, beautifulPhotos.length - visibleCount);
  }

  function buildDots() {
    dotsWrap.innerHTML = "";
    const dotCount = Math.ceil(beautifulPhotos.length / visibleCount);
    dots = Array.from({ length: dotCount }, (_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "beautiful-block__dot";
      dot.setAttribute("aria-label", `Страница ${i + 1} из ${dotCount}`);
      dot.addEventListener("click", () => goTo(i * visibleCount));
      dotsWrap.appendChild(dot);
      return dot;
    });
  }

  function measureStep() {
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    return items[0].offsetWidth + gap;
  }

  function applyTransform(withTransition = true) {
    track.style.transition = withTransition && !prefersReducedMotion ? "" : "none";
    track.style.transform = `translateX(${-startIndex * measureStep()}px)`;
  }

  function updateNav() {
    prevButton.disabled = startIndex <= 0;
    nextButton.disabled = startIndex >= maxStart();
  }

  function updateDots() {
    const dotCount = dots.length;
    const active = Math.min(dotCount - 1, Math.round(startIndex / visibleCount));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
  }

  function goTo(index, withTransition = true) {
    startIndex = Math.max(0, Math.min(maxStart(), index));
    applyTransform(withTransition);
    updateNav();
    updateDots();
  }

  prevButton.addEventListener("click", () => goTo(startIndex - 1));
  nextButton.addEventListener("click", () => goTo(startIndex + 1));

  buildDots();
  goTo(0, false);

  // Смена брейкпоинта (2 ↔ 3 в ряд) и просто resize внутри одной зоны —
  // в обоих случаях step (ширина карточки) меняется, а при смене N ещё и
  // maxStart/точки надо пересобрать.
  const resizeObserver = new ResizeObserver(() => {
    const nextVisibleCount = getVisibleCount();
    if (nextVisibleCount !== visibleCount) {
      visibleCount = nextVisibleCount;
      buildDots();
    }
    goTo(startIndex, false);
  });
  resizeObserver.observe(viewport);
}
