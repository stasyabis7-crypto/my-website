/*
  Логика ProjectSlider: строит слайды из projectCards, центрирует активную
  карточку через translateX на треке, автоплей с паузой при наведении/
  перетаскивании, точки-пагинация, свайп/drag мышью и тачем, стрелки клавиатуры.
*/

import { projectCards, createProjectCard } from "../project-card/project-card.js";

const AUTOPLAY_INTERVAL = 4200;
const DRAG_THRESHOLD = 40; // px — минимальный свайп, чтобы переключить слайд
const CLICK_SUPPRESS_THRESHOLD = 6; // px — после этого сдвига клик по карточке считается драгом

const initializedSliders = new WeakSet();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initProjectSlider(root = document) {
  const slider = root.querySelector(".project-slider");
  if (!slider || initializedSliders.has(slider)) return;
  initializedSliders.add(slider);

  const viewport = slider.querySelector(".project-slider__viewport");
  const track = slider.querySelector(".project-slider__track");
  const dotsWrap = slider.querySelector(".project-slider__dots");

  const slides = projectCards.map((card) => {
    const li = document.createElement("li");
    li.className = "project-slide";
    li.appendChild(createProjectCard(card));
    track.appendChild(li);
    return li;
  });

  const dots = projectCards.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "project-slider__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Слайд ${index + 1} из ${projectCards.length}`);
    dot.addEventListener("click", () => goTo(index, { userInitiated: true }));
    dotsWrap.appendChild(dot);
    return dot;
  });

  let activeIndex = 0;
  let autoplayTimer = null;
  let isDragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;

  function measure() {
    // offsetWidth — это layout-размер до применения transform (rotate/translate
    // у is-left/is-right не должен искажать замер), в отличие от
    // getBoundingClientRect(), которая вернула бы повёрнутый bounding box.
    const slideWidth = slides[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    return { slideWidth, step: slideWidth + gap };
  }

  function translateForIndex(index) {
    const { slideWidth, step } = measure();
    return viewport.clientWidth / 2 - slideWidth / 2 - index * step;
  }

  function applyTransform(x, withTransition = true) {
    track.style.transition = withTransition && !prefersReducedMotion ? "" : "none";
    track.style.transform = `translateX(${x}px)`;
  }

  function updateStates() {
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-center", index === activeIndex);
      slide.classList.toggle("is-left", index === activeIndex - 1);
      slide.classList.toggle("is-right", index === activeIndex + 1);
    });
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.dataset.state = isActive ? "active" : "default";
      dot.setAttribute("aria-selected", String(isActive));
    });
  }

  function goTo(index, { userInitiated = false } = {}) {
    activeIndex = (index + slides.length) % slides.length;
    applyTransform(translateForIndex(activeIndex));
    updateStates();
    if (userInitiated) restartAutoplay();
  }

  function next() {
    goTo(activeIndex + 1);
  }

  function startAutoplay() {
    stopAutoplay();
    if (prefersReducedMotion) return;
    autoplayTimer = window.setInterval(next, AUTOPLAY_INTERVAL);
  }

  function stopAutoplay() {
    if (autoplayTimer) window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function restartAutoplay() {
    startAutoplay();
  }

  // --- Drag / свайп ---
  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    isDragging = true;
    dragMoved = false;
    dragStartX = event.clientX;
    dragStartTranslate = translateForIndex(activeIndex);
    track.setPointerCapture(event.pointerId);
    stopAutoplay();
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) > CLICK_SUPPRESS_THRESHOLD) dragMoved = true;
    applyTransform(dragStartTranslate + delta, false);
  }

  function onPointerUp(event) {
    if (!isDragging) return;
    isDragging = false;
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      goTo(activeIndex - Math.sign(delta));
    } else {
      goTo(activeIndex);
    }
    restartAutoplay();
  }

  track.addEventListener("pointerdown", onPointerDown);
  track.addEventListener("pointermove", onPointerMove);
  track.addEventListener("pointerup", onPointerUp);
  track.addEventListener("pointercancel", onPointerUp);

  // Не даём клику по ссылке-стрелке сработать сразу после драга
  track.addEventListener(
    "click",
    (event) => {
      if (dragMoved) {
        event.preventDefault();
        event.stopPropagation();
        dragMoved = false;
      }
    },
    { capture: true }
  );

  slider.addEventListener("pointerenter", stopAutoplay);
  slider.addEventListener("pointerleave", () => {
    if (!isDragging) startAutoplay();
  });

  slider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1, { userInitiated: true });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1, { userInitiated: true });
    }
  });

  const resizeObserver = new ResizeObserver(() => applyTransform(translateForIndex(activeIndex), false));
  resizeObserver.observe(viewport);

  updateStates();
  applyTransform(translateForIndex(activeIndex), false);
  startAutoplay();
}
