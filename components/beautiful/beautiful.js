/*
  Beautiful — блок "Красивое". Большое фото + лента миниатюр (раскладка —
  строкой на мобильном/планшете, столбиком на десктопе, см. beautiful.css).
  Миниатюры листаются нативным скроллом контейнера (свайп на тач, колесо
  мыши на десктопе) — собственной drag-логики, в отличие от ProjectSlider,
  здесь не нужно. Активная миниатюра переключается кликом или автоплеем.

  Исходники тяжёлые (до ~2 МБ штука), поэтому все фото предзагружаются в
  фоне сразу при инициализации — иначе клик по миниатюре ждал бы сеть, и
  переключение выглядело бы как зависание. Пока фото не готово, смена
  сопровождается коротким fade (см. .is-switching в beautiful.css), чтобы
  переход всегда выглядел как плавный, а не как рывок.
*/

const beautifulPhoto = (n) => encodeURI(`assets/beautiful/beautiful chosen ${n}.png`);
export const beautifulPhotos = Array.from({ length: 11 }, (_, i) => beautifulPhoto(i + 1));

const AUTOPLAY_INTERVAL = 4200;

// Промисы вместо просто new Image() — goTo() ждёт готовности конкретного
// кадра, а не просто "запустили загрузку".
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
// Стрелки по бокам фото — только десктоп (см. beautiful.css), клик рядом с
// ними по левой/правой половине фото должен листать точно так же.
const desktopQuery = window.matchMedia("(min-width: 1101px)");

export function initBeautiful(root = document) {
  const block = root.querySelector(".beautiful-block");
  if (!block || initializedBlocks.has(block)) return;
  initializedBlocks.add(block);

  const layout = block.querySelector(".beautiful-block__layout");
  const photoWrap = block.querySelector(".beautiful-block__photo-wrap");
  const photo = block.querySelector(".beautiful-block__photo");
  const counter = block.querySelector(".beautiful-block__counter");
  const thumbsWrap = block.querySelector(".beautiful-block__thumbs");
  const prevButton = block.querySelector(".beautiful-block__nav--prev");
  const nextButton = block.querySelector(".beautiful-block__nav--next");

  // Не ждём — просто запускаем загрузку всех кадров в фоне сразу, пока
  // человек ещё читает заголовок/разглядывает первое фото.
  beautifulPhotos.forEach(preload);

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
    button.addEventListener("click", () => goTo(index, { userInitiated: true }));
    thumbsWrap.appendChild(button);
    return button;
  });

  let activeIndex = 0;
  let timer = null;
  let switchToken = 0;

  function updateCounter() {
    counter.textContent = `${activeIndex + 1} из ${beautifulPhotos.length}`;
  }

  // Скроллим только саму ленту миниатюр (её scrollTop/scrollLeft), а не
  // через scrollIntoView — тот умеет утащить за собой и скролл страницы,
  // если блок целиком не виден (ровно то, что не должно происходить при
  // автоплее, см. коммент в initBeautiful ниже).
  function scrollThumbIntoView(thumb) {
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    const isColumn = getComputedStyle(thumbsWrap).flexDirection === "column";
    if (isColumn) {
      const top = thumb.offsetTop;
      const bottom = top + thumb.offsetHeight;
      const viewTop = thumbsWrap.scrollTop;
      const viewBottom = viewTop + thumbsWrap.clientHeight;
      if (top < viewTop) thumbsWrap.scrollTo({ top, behavior });
      else if (bottom > viewBottom) thumbsWrap.scrollTo({ top: bottom - thumbsWrap.clientHeight, behavior });
    } else {
      const left = thumb.offsetLeft;
      const right = left + thumb.offsetWidth;
      const viewLeft = thumbsWrap.scrollLeft;
      const viewRight = viewLeft + thumbsWrap.clientWidth;
      if (left < viewLeft) thumbsWrap.scrollTo({ left, behavior });
      else if (right > viewRight) thumbsWrap.scrollTo({ left: right - thumbsWrap.clientWidth, behavior });
    }
  }

  async function goTo(index, { userInitiated = false } = {}) {
    activeIndex = ((index % beautifulPhotos.length) + beautifulPhotos.length) % beautifulPhotos.length;
    // Счётчик/подсветка миниатюры переключаются сразу, не дожидаясь фото —
    // само фото подхватывает как только готово (обычно мгновенно, см. верх
    // файла), но реакция на клик не должна ничего ждать.
    updateCounter();
    thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === activeIndex));
    scrollThumbIntoView(thumbs[activeIndex]);
    if (userInitiated) startAutoplay();

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

  function next() {
    goTo(activeIndex + 1);
  }

  function startAutoplay() {
    stopAutoplay();
    if (prefersReducedMotion) return;
    timer = window.setInterval(next, AUTOPLAY_INTERVAL);
  }

  function stopAutoplay() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  layout.addEventListener("pointerenter", stopAutoplay);
  layout.addEventListener("pointerleave", startAutoplay);

  prevButton.addEventListener("click", () => goTo(activeIndex - 1, { userInitiated: true }));
  nextButton.addEventListener("click", () => goTo(activeIndex + 1, { userInitiated: true }));

  // Клик рядом со стрелками — по всей левой/правой половине фото, не
  // только по самой кнопке (кнопки же обрабатываются отдельно выше —
  // closest() пропускает клики, которые до них дошли по всплытию).
  photoWrap.addEventListener("click", (event) => {
    if (!desktopQuery.matches || event.target.closest(".beautiful-block__nav")) return;
    const rect = photoWrap.getBoundingClientRect();
    const isLeftHalf = event.clientX - rect.left < rect.width / 2;
    goTo(activeIndex + (isLeftHalf ? -1 : 1), { userInitiated: true });
  });

  // На десктопе высота колонки миниатюр = высоте фото (миниатюр много,
  // внутри своя вертикальная прокрутка) — в CSS такое без circular
  // dependency не выразить, поэтому синхронизируем через ResizeObserver.
  const resizeObserver = new ResizeObserver((entries) => {
    const height = entries[0].contentRect.height;
    layout.style.setProperty("--beautiful-photo-height", `${height}px`);
  });
  resizeObserver.observe(photoWrap);

  goTo(0);
  startAutoplay();
}
