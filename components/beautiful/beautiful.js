/*
  Beautiful — блок "Красивое". Два независимых UI под разные разрешения
  (см. beautiful.css за переключение видимости по media query):

  - Мобильный (<800px, initSolo): одно большое фото на весь блок, листается
    свайпом пальца в сторону (счётчик "N из M" — в углу поверх фото). Без
    автоплея — только по действию пользователя.
  - Планшет/десктоп (800px+, initSlider): слайдер на N фото в ряд (2 на
    планшете, 3 на десктопе), стрелки всегда активны и листают сразу на N
    карточек (целая "страница" за клик), бесшовно закольцован в обе
    стороны — см. клоны в initSlider. Точки-пагинация сгруппированы по N
    (точка = "страница" из N карточек).

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

// Те же пороги свайпа, что у большого слайдера (slider.js) и мини-слайдера
// карточек "Популярного" (popular-card.js) — держим одинаковое ощущение
// жеста по всему сайту.
const SOLO_DRAG_THRESHOLD = 32; // px — свайп меньше этого возвращает то же фото
const SOLO_DIRECTION_THRESHOLD = 8; // px — до этого не решаем, горизонтальный жест или вертикальный скролл

function initSolo(block) {
  const photoWrap = block.querySelector(".beautiful-block__photo-wrap");
  const photo = block.querySelector(".beautiful-block__photo");
  const counter = block.querySelector(".beautiful-block__counter");

  let activeIndex = 0;
  let switchToken = 0;

  function updateCounter() {
    counter.textContent = `${activeIndex + 1} из ${beautifulPhotos.length}`;
  }

  async function goTo(index) {
    activeIndex = ((index % beautifulPhotos.length) + beautifulPhotos.length) % beautifulPhotos.length;
    // Счётчик переключается сразу, не дожидаясь фото — само фото подхватывает
    // как только готово (обычно мгновенно, см. верх файла), но реакция на
    // свайп не должна ничего ждать.
    updateCounter();

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

  // --- Свайп пальцем листает фото в сторону. Направление жеста решаем
  // только после SOLO_DIRECTION_THRESHOLD px — если вертикаль больше
  // горизонтали, это скролл страницы, и трогать фото не нужно (тот же
  // приём, что в slider.js/popular-card.js). Само фото не тащится за
  // пальцем (в отличие от тех слайдеров) — оно свапается кроссфейдом в
  // goTo(), поэтому здесь только детект направления/порога.
  let isDragging = false;
  let dragDirection = null;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartY = 0;

  photoWrap.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    isDragging = true;
    dragDirection = null;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
  });

  photoWrap.addEventListener("pointermove", (event) => {
    if (!isDragging || event.pointerId !== dragPointerId || dragDirection !== null) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;
    if (Math.abs(deltaX) < SOLO_DIRECTION_THRESHOLD && Math.abs(deltaY) < SOLO_DIRECTION_THRESHOLD) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      dragDirection = "vertical";
      isDragging = false;
      return;
    }
    dragDirection = "horizontal";
    photoWrap.setPointerCapture(dragPointerId);
  });

  function endDrag(event) {
    if (!isDragging || event.pointerId !== dragPointerId || dragDirection !== "horizontal") {
      isDragging = false;
      dragDirection = null;
      return;
    }
    isDragging = false;
    dragDirection = null;
    const deltaX = event.clientX - dragStartX;
    if (Math.abs(deltaX) > SOLO_DRAG_THRESHOLD) goTo(activeIndex - Math.sign(deltaX));
  }

  photoWrap.addEventListener("pointerup", endDrag);
  photoWrap.addEventListener("pointercancel", endDrag);

  goTo(0);
}

/* --- Планшет/десктоп: слайдер на N фото в ряд --- */

// Те же брейкпоинты, что и в beautiful.css (--beautiful-slider-count):
// 800–1100 = 2 фото в ряд, 1101+ = 3.
const sliderDesktopQuery = window.matchMedia("(min-width: 1101px)");

// Длительность "сжатия" карточек при перелистывании — то же ощущение и то
// же число, что у squeeze в большом слайдере (SQUEEZE_DURATION в slider.js).
const SLIDER_SQUEEZE_DURATION = 240;

function initSlider(block) {
  const sliderEl = block.querySelector(".beautiful-block__slider");
  const viewport = block.querySelector(".beautiful-block__slider-viewport");
  const track = block.querySelector(".beautiful-block__slider-track");
  const dotsWrap = block.querySelector(".beautiful-block__dots");
  const prevButton = block.querySelector(".beautiful-block__nav--prev");
  const nextButton = block.querySelector(".beautiful-block__nav--next");

  const n = beautifulPhotos.length;

  function buildItem(index, isClone) {
    const item = document.createElement("div");
    item.className = "beautiful-block__slider-item";

    const img = document.createElement("img");
    img.className = "beautiful-block__slider-image";
    img.src = beautifulPhotos[index];
    img.alt = !isClone && index === 0 ? "Красивое, но невыпущенное" : "";
    if (isClone || index > 2) img.loading = "lazy"; // видимые с самого начала — сразу, остальное подгружает браузер

    item.appendChild(img);
    return item;
  }

  // Бесшовный бесконечный трек: по полной копии фото-набора с каждой
  // стороны от настоящих карточек (тот же приём, что у ProjectSlider, см.
  // components/slider/slider.js) — уйдя за реальную границу, трек мгновенно
  // (без transition) прыгает обратно в исходный диапазон на клон, который
  // выглядит как настоящая карточка, поэтому скачок не заметен.
  for (let i = 0; i < n; i++) track.appendChild(buildItem(i, true));
  for (let i = 0; i < n; i++) track.appendChild(buildItem(i, false));
  for (let i = 0; i < n; i++) track.appendChild(buildItem(i, true));

  const allItems = Array.from(track.children);
  let visibleCount = getVisibleCount();
  // rawStart — индекс первой видимой карточки, может временно выходить за
  // 0..n-1 (использует клоны по краям), см. scheduleLoopReset.
  let rawStart = 0;
  let dots = [];

  function getVisibleCount() {
    return sliderDesktopQuery.matches ? 3 : 2;
  }

  function wrappedStart() {
    return ((rawStart % n) + n) % n;
  }

  function buildDots() {
    dotsWrap.innerHTML = "";
    const dotCount = Math.ceil(n / visibleCount);
    dots = Array.from({ length: dotCount }, (_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "beautiful-block__dot";
      dot.setAttribute("aria-label", `Страница ${i + 1} из ${dotCount}`);
      dot.addEventListener("click", () => goTo(Math.min(i * visibleCount, Math.max(0, n - visibleCount))));
      dotsWrap.appendChild(dot);
      return dot;
    });
  }

  function measureStep() {
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    return allItems[0].offsetWidth + gap;
  }

  function applyTransform(withTransition = true) {
    track.style.transition = withTransition && !prefersReducedMotion ? "" : "none";
    track.style.transform = `translateX(${-(n + rawStart) * measureStep()}px)`;
  }

  function updateDots() {
    const dotCount = dots.length;
    const active = Math.min(dotCount - 1, Math.round(wrappedStart() / visibleCount));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
  }

  // Как только уехали за пределы настоящего диапазона (используя клоны по
  // краю) — по завершении анимации мгновенно переносим rawStart в
  // эквивалентную позицию внутри 0..n-1. Визуально ничего не дёргается:
  // клон и настоящая карточка на этом месте показывают один и тот же кадр.
  function scheduleLoopReset() {
    if (rawStart >= 0 && rawStart < n) return;
    const onEnd = () => {
      track.removeEventListener("transitionend", onEnd);
      rawStart = wrappedStart();
      applyTransform(false);
    };
    if (prefersReducedMotion) onEnd();
    else track.addEventListener("transitionend", onEnd, { once: true });
  }

  // Лёгкое "сжатие" карточек при перелистывании — как в большом слайдере
  // (playSqueeze/.is-squeezing в slider.js/slider.css): едва заметный
  // scale-даун и обратно, будто карточки и правда переложили.
  function playSqueeze() {
    if (prefersReducedMotion) return;
    sliderEl.classList.remove("is-squeezing");
    void sliderEl.offsetWidth; // reflow, чтобы анимация перезапускалась с нуля
    sliderEl.classList.add("is-squeezing");
    window.setTimeout(() => sliderEl.classList.remove("is-squeezing"), SLIDER_SQUEEZE_DURATION);
  }

  function goTo(index, withTransition = true) {
    rawStart = index;
    applyTransform(withTransition);
    updateDots();
    if (withTransition) playSqueeze();
    scheduleLoopReset();
  }

  // Стрелки всегда активны и листают сразу целую "страницу" (N карточек) —
  // благодаря бесшовному циклу идти можно в любую сторону без ограничений.
  prevButton.addEventListener("click", () => goTo(rawStart - visibleCount));
  nextButton.addEventListener("click", () => goTo(rawStart + visibleCount));

  buildDots();
  goTo(0, false);

  // Смена брейкпоинта (2 ↔ 3 в ряд) и просто resize внутри одной зоны —
  // в обоих случаях step (ширина карточки) меняется, а при смене N ещё и
  // точки надо пересобрать.
  const resizeObserver = new ResizeObserver(() => {
    const nextVisibleCount = getVisibleCount();
    if (nextVisibleCount !== visibleCount) {
      visibleCount = nextVisibleCount;
      buildDots();
    }
    applyTransform(false);
    updateDots();
  });
  resizeObserver.observe(viewport);
}
