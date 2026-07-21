/*
  Beautiful — блок "Красивое". Большое фото + лента миниатюр (раскладка —
  строкой на мобильном/планшете, столбиком на десктопе, см. beautiful.css).
  Миниатюры листаются нативным скроллом контейнера (свайп на тач, колесо
  мыши на десктопе) — собственной drag-логики, в отличие от ProjectSlider,
  здесь не нужно. Активная миниатюра переключается кликом или автоплеем и
  всегда держится в поле зрения через scrollIntoView.
*/

const beautifulPhoto = (n) => encodeURI(`assets/beautiful/beautiful chosen ${n}.png`);
export const beautifulPhotos = Array.from({ length: 11 }, (_, i) => beautifulPhoto(i + 1));

const AUTOPLAY_INTERVAL = 4200;

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

  function updateCounter() {
    counter.textContent = `${activeIndex + 1} из ${beautifulPhotos.length}`;
  }

  function goTo(index, { userInitiated = false } = {}) {
    activeIndex = ((index % beautifulPhotos.length) + beautifulPhotos.length) % beautifulPhotos.length;
    photo.src = beautifulPhotos[activeIndex];
    updateCounter();
    thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === activeIndex));
    thumbs[activeIndex].scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
    // Ручное переключение сбрасывает таймер, чтобы автоплей не подхватывал
    // сразу следующий кадр через мгновение после клика пользователя.
    if (userInitiated) startAutoplay();
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
