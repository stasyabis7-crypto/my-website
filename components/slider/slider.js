/*
  Логика ProjectSlider: строит слайды из projectCards, центрирует активную
  карточку через translateX на треке, точки-пагинация с заполняющейся
  полоской (автоплей: как заполнится — переключение на следующий слайд),
  пауза при наведении/перетаскивании, свайп/drag мышью и тачем (только по
  горизонтали — вертикальный свайп отдаётся нативному скроллу страницы),
  стрелки клавиатуры, бесшовная бесконечная лента (без перемотки в начало
  на границе) и лёгкое "сжатие" карточек при переключении.
*/

import { projectCards, createProjectCard } from "../project-card/project-card.js";

const AUTOPLAY_INTERVAL = 4200;
const DRAG_THRESHOLD = 40; // px — минимальный горизонтальный свайп, чтобы переключить слайд
const CLICK_SUPPRESS_THRESHOLD = 6; // px — после этого сдвига клик по карточке считается драгом
const DIRECTION_THRESHOLD = 8; // px — сколько нужно сдвинуться, чтобы понять горизонтальный жест или вертикальный
const SQUEEZE_DURATION = 240; // ms — длительность "сжатия" карточек при переключении
const RING_ROTATE_DEG = 15; // на сколько градусов поворачивается каждое следующее кольцо дуги (совпадает с slider.css)
const RING_DROP_REM = 1.25; // на сколько rem каждое кольцо ниже предыдущего (20px при 390px)

// Ручная донастройка отдельных колец дуги — фиксируем поэтапно, кольцо за
// кольцом, вместе с пользователем. У кольца без записи здесь — гладкая
// формула по умолчанию (см. arcPullPercent/arcTranslateY). pullPercent —
// на сколько % от своей ширины кольцо подтянуто к центру (меньше = дальше
// в сторону от центра); extraDropRem — на сколько rem ниже базового
// расчёта опустить кольцо.
const RING_OVERRIDES = {
  2: { pullPercent: 22, extraDropRem: 1.25 },
};

const initializedSliders = new WeakSet();
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initProjectSlider(root = document) {
  const slider = root.querySelector(".project-slider");
  if (!slider || initializedSliders.has(slider)) return;
  initializedSliders.add(slider);

  slider.style.setProperty("--slider-autoplay-duration", `${AUTOPLAY_INTERVAL}ms`);
  slider.style.setProperty("--slider-squeeze-duration", `${SQUEEZE_DURATION}ms`);

  const viewport = slider.querySelector(".project-slider__viewport");
  const track = slider.querySelector(".project-slider__track");
  const dotsWrap = slider.querySelector(".project-slider__dots");

  function buildSlideLi(card, { isClone = false } = {}) {
    const li = document.createElement("li");
    li.className = "project-slide";
    li.appendChild(createProjectCard(card));
    if (isClone) {
      // клон нужен только чтобы на первом/последнем слайде всегда было что
      // "выглядывать" по краям — из навигации и для скринридеров он исключён
      li.setAttribute("aria-hidden", "true");
      li.querySelectorAll("a, button").forEach((el) => el.setAttribute("tabindex", "-1"));
    }
    return li;
  }

  // Карточки разложены по дуге на основе дистанции до активной (см.
  // slider.css — вся геометрия веера выводится из --arc-offset), так что
  // на широких экранах может быть видно больше 2 колец с каждой стороны.
  // CLONE_RING_COUNT клонов на каждый край трека держат иллюзию бесконечной
  // ленты на всех этих кольцах разом: даже на границе (первый/последний
  // слайд) с обеих сторон всегда есть чем закрыть дугу. Те же клоны нужны
  // и для бесшовной бесконечной прокрутки (см. scheduleLoopReset ниже) —
  // каждому физическому элементу трека присваиваем "логический индекс",
  // каким бы он был в бесконечной ленте.
  const CLONE_RING_COUNT = 4;
  const allSlides = [];
  const n = projectCards.length;

  Array.from({ length: CLONE_RING_COUNT }, (_, i) => n - CLONE_RING_COUNT + i).forEach((cardIndex, i) => {
    const li = buildSlideLi(projectCards[cardIndex], { isClone: true });
    track.appendChild(li);
    allSlides.push({ el: li, logicalIndex: -CLONE_RING_COUNT + i });
  });

  const slides = projectCards.map((card, index) => {
    const li = buildSlideLi(card);
    track.appendChild(li);
    allSlides.push({ el: li, logicalIndex: index });
    return li;
  });

  Array.from({ length: CLONE_RING_COUNT }, (_, i) => i).forEach((cardIndex, i) => {
    const li = buildSlideLi(projectCards[cardIndex], { isClone: true });
    track.appendChild(li);
    allSlides.push({ el: li, logicalIndex: n + i });
  });

  const dots = projectCards.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "project-slider__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Слайд ${index + 1} из ${projectCards.length}`);

    const fill = document.createElement("span");
    fill.className = "project-slider__dot-fill";
    fill.addEventListener("animationend", () => {
      if (index === wrappedIndex()) next();
    });
    dot.appendChild(fill);

    dot.addEventListener("click", () => goToWrapped(index));
    dotsWrap.appendChild(dot);
    return { dot, fill };
  });

  // activeIndex — "сырой", не обёрнутый по модулю индекс: может на один шаг
  // выйти за 0..n-1 (используя крайний клон), после чего scheduleLoopReset
  // бесшовно возвращает его в диапазон без анимации. wrappedIndex() — то же
  // самое, но приведённое к 0..n-1, для точек/автоплея/aria.
  let activeIndex = 0;
  let isDragging = false;
  let dragMoved = false;
  let dragDirection = null; // null | "horizontal" | "vertical"
  let dragStartX = 0;
  let dragStartY = 0;
  let dragPointerId = null;
  let dragStartTranslate = 0;

  function wrappedIndex() {
    return ((activeIndex % slides.length) + slides.length) % slides.length;
  }

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
    // +CLONE_RING_COUNT — перед реальными слайдами в треке стоит столько же
    // клонов (см. allSlides). index может быть "сырым" (например n или -1) —
    // ровно на это и рассчитаны клоны по краям трека.
    return viewport.clientWidth / 2 - slideWidth / 2 - (index + CLONE_RING_COUNT) * step;
  }

  function applyTransform(x, withTransition = true) {
    track.style.transition = withTransition && !prefersReducedMotion ? "" : "none";
    track.style.transform = `translateX(${x}px)`;
  }

  function arcPullPercent(offsetAbs) {
    const override = RING_OVERRIDES[offsetAbs];
    if (override && override.pullPercent != null) return override.pullPercent;
    // Нелинейно (offset²), чтобы дальние кольца заходили друг на друга
    // заметнее, а не просто стояли рядом с шагом побольше.
    return Math.min(85, 10 * offsetAbs * offsetAbs);
  }

  function arcTranslateY(offsetAbs) {
    if (offsetAbs === 0) return 0;
    // Поворот задирает верхний угол карточки вверх заметно сильнее, чем её
    // центр опускается translateY — без компенсации дальние кольца дуги
    // визуально "всплывают" вверх вместо того, чтобы уходить ниже. Считаем,
    // насколько повёрнутый угол поднимается над центром, и добавляем это к
    // сдвигу вниз, чтобы видимый верх карточки реально опускался с каждым
    // кольцом (а не просто её геометрический центр).
    const cardWidth = slides[0].offsetWidth;
    const cardHeight = slides[0].offsetHeight;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const ringDropPx = remPx * RING_DROP_REM;
    const angleRad = (offsetAbs * RING_ROTATE_DEG * Math.PI) / 180;
    const rotationLift = (cardHeight / 2) * Math.cos(angleRad) + (cardWidth / 2) * Math.sin(angleRad) - cardHeight / 2;
    const override = RING_OVERRIDES[offsetAbs];
    const extraDropPx = override && override.extraDropRem ? override.extraDropRem * remPx : 0;
    return offsetAbs * ringDropPx + rotationLift + extraDropPx;
  }

  function updateStates() {
    allSlides.forEach(({ el, logicalIndex }) => {
      const offset = logicalIndex - activeIndex;
      // За пределами CLONE_RING_COUNT колец дуга не продолжает расти (иначе
      // на длинном списке карточки на другом конце трека уходили бы за 90°
      // и рисовались вверх ногами) — такие слайды просто прячем, они и так
      // никогда не должны быть в кадре.
      const clamped = Math.max(-CLONE_RING_COUNT, Math.min(CLONE_RING_COUNT, offset));
      const offsetAbs = Math.abs(clamped);
      const pullPercent = Math.sign(clamped) * -1 * arcPullPercent(offsetAbs);
      el.style.setProperty("--arc-offset", String(clamped));
      el.style.setProperty("--arc-translate-x", `${pullPercent}%`);
      el.style.setProperty("--arc-translate-y", `${arcTranslateY(offsetAbs)}px`);
      el.classList.toggle("is-center", offset === 0);
      el.classList.toggle("is-beyond-arc", Math.abs(offset) > CLONE_RING_COUNT);
    });
    const active = wrappedIndex();
    dots.forEach(({ dot }, index) => {
      const isActive = index === active;
      dot.dataset.state = isActive ? "active" : "default";
      dot.setAttribute("aria-selected", String(isActive));
    });
  }

  function playActiveDotFill() {
    const active = wrappedIndex();
    dots.forEach(({ fill }, index) => {
      fill.classList.remove("is-playing");
      if (index === active && !prefersReducedMotion) {
        // reflow между remove/add, иначе анимация не перезапустится с нуля
        void fill.offsetWidth;
        fill.classList.add("is-playing");
      }
    });
  }

  function playSqueeze() {
    if (prefersReducedMotion) return;
    slider.classList.remove("is-squeezing");
    void slider.offsetWidth; // reflow, чтобы анимация могла перезапуститься
    slider.classList.add("is-squeezing");
    window.setTimeout(() => slider.classList.remove("is-squeezing"), SQUEEZE_DURATION);
  }

  // Бесшовная бесконечная лента: клоны по краям трека позволяют довести
  // анимацию ровно на один шаг за реальную границу (используя клон —
  // визуально это та же самая карточка). Как только translateX-переход
  // заканчивается, если activeIndex вышел за 0..n-1 — мгновенно (без
  // transition) возвращаем его в этот диапазон. Клон и настоящая карточка
  // на этой позиции показывают идентичный контент, поэтому скачок
  // координаты происходит, а видимой "перемотки" нет.
  function scheduleLoopReset() {
    if (activeIndex >= 0 && activeIndex < slides.length) return;
    const wrapped = wrappedIndex();
    const onEnd = () => {
      track.removeEventListener("transitionend", onEnd);
      activeIndex = wrapped;
      applyTransform(translateForIndex(activeIndex), false);
      updateStates();
    };
    if (prefersReducedMotion) {
      onEnd();
    } else {
      track.addEventListener("transitionend", onEnd, { once: true });
    }
  }

  function goTo(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    applyTransform(translateForIndex(activeIndex));
    updateStates();
    playActiveDotFill();
    playSqueeze();
    scheduleLoopReset();
  }

  function next() {
    goTo(activeIndex + 1);
  }

  // Точки передают "обёрнутый" индекс цели (0..n-1) — считаем от текущего
  // (возможно "сырого") activeIndex кратчайший путь по кругу и едем именно
  // им. Без этого клик по дальней точке гнал бы трек по прямой через весь
  // список карточек за одно 560ms-переключение — и если по пути его
  // прерывал ещё один клик, карточки застревали в перепутанных
  // промежуточных положениях (это и была "куча").
  function goToWrapped(targetWrappedIndex) {
    const n = slides.length;
    const diff = targetWrappedIndex - wrappedIndex();
    let shortestDiff = ((diff % n) + n) % n; // приводим к 0..n-1
    if (shortestDiff > n / 2) shortestDiff -= n; // и берём короткую сторону круга
    goTo(activeIndex + shortestDiff);
  }

  // --- Drag / свайп ---
  // Направление жеста определяем только после DIRECTION_THRESHOLD px
  // движения: если вертикаль больше горизонтали — это скролл страницы,
  // отдаём его нативному touch-action:pan-y и не трогаем трек вообще.
  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    isDragging = true;
    dragMoved = false;
    dragDirection = null;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragPointerId = event.pointerId;
    dragStartTranslate = translateForIndex(activeIndex);
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    if (dragDirection === null) {
      if (Math.abs(deltaX) < DIRECTION_THRESHOLD && Math.abs(deltaY) < DIRECTION_THRESHOLD) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // вертикальный жест — отдаём странице, к треку больше не возвращаемся
        dragDirection = "vertical";
        isDragging = false;
        return;
      }
      dragDirection = "horizontal";
      track.setPointerCapture(dragPointerId);
      slider.classList.add("is-paused");
    }

    if (Math.abs(deltaX) > CLICK_SUPPRESS_THRESHOLD) dragMoved = true;
    applyTransform(dragStartTranslate + deltaX, false);
  }

  function onPointerUp(event) {
    if (!isDragging || dragDirection !== "horizontal") {
      isDragging = false;
      dragDirection = null;
      return;
    }
    isDragging = false;
    slider.classList.remove("is-paused");
    const delta = event.clientX - dragStartX;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      goTo(activeIndex - Math.sign(delta));
    } else {
      applyTransform(translateForIndex(activeIndex));
    }
    dragDirection = null;
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

  slider.addEventListener("pointerenter", () => slider.classList.add("is-paused"));
  slider.addEventListener("pointerleave", () => {
    if (!isDragging) slider.classList.remove("is-paused");
  });

  slider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(activeIndex - 1);
    }
  });

  const resizeObserver = new ResizeObserver(() => {
    // Карточки меняют размер по брейкпоинтам — компенсация поворота в дуге
    // (arcTranslateY) от него зависит, пересчитываем вместе с позицией трека.
    updateStates();
    applyTransform(translateForIndex(activeIndex), false);
  });
  resizeObserver.observe(viewport);

  updateStates();
  applyTransform(translateForIndex(activeIndex), false);
  playActiveDotFill();
}
