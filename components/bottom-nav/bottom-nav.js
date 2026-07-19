/*
  Логика BottomNav: клик переключает data-state на кнопках
  и уведомляет остальную страницу через CustomEvent "navchange",
  чтобы позже можно было повесить реальный роутинг/скролл к секции.

  На мобилке/планшете сюда же добавляется схлопывание панели при скролле
  (см. initCollapse) — на десктопе оно ничего не делает визуально, т.к.
  CSS-правила для .bottom-nav-collapsed заведены только под max-width:1100px.
*/

const initializedNavs = new WeakSet();

// Сколько нужно проскроллить от самого верха, прежде чем панель схлопнётся
// в кнопки — небольшой запас, чтобы не дёргалось от resize/bounce-скролла у
// самого верха страницы.
const COLLAPSE_SCROLL_THRESHOLD = 24;
const MOBILE_TABLET_QUERY = "(max-width: 1100px)";

function initCollapse(wrap) {
  if (!wrap) return;

  const nav = wrap.querySelector(".bottom-nav");
  const menuBtn = wrap.querySelector('[data-nav-action="menu"]');
  const topBtn = wrap.querySelector('[data-nav-action="top"]');
  if (!nav || !menuBtn || !topBtn) return;

  const mql = window.matchMedia(MOBILE_TABLET_QUERY);

  const setState = (state) => {
    wrap.dataset.navState = state;
    const isOpen = state === "collapsed-open";
    menuBtn.setAttribute("aria-expanded", String(isOpen));
    // Класс, а не hidden-атрибут/свойство на самих <svg> — у SVGElement
    // оно не переключает рендер так же надёжно, как у HTML-элементов
    // (см. .bottom-nav-collapsed__btn.is-open в bottom-nav.css).
    menuBtn.classList.toggle("is-open", isOpen);

    // На планшете открытая панель "прибита" к левому краю (см.
    // .bottom-nav.is-pinned-left в bottom-nav.css). При открытии — сразу;
    // при закрытии крестиком снятие класса откладываем до конца fade-out
    // (см. слушатель transitionend ниже) — иначе align-items родителя
    // мгновенно вернулся бы в center ДО того, как панель успеет погаснуть,
    // и она бы видимо прыгала влево-в-центр посреди анимации.
    if (isOpen) nav.classList.add("is-pinned-left");
  };

  nav.addEventListener("transitionend", (event) => {
    if (event.target !== nav || event.propertyName !== "opacity") return;
    if (wrap.dataset.navState !== "collapsed-open") {
      nav.classList.remove("is-pinned-left");
    }
  });

  const syncWithScroll = () => {
    if (!mql.matches) return;
    if (window.scrollY <= COLLAPSE_SCROLL_THRESHOLD) {
      // У самого верха страницы — всегда полная панель, даже если перед
      // этим меню было открыто вручную.
      setState("expanded");
      return;
    }
    // Пока меню открыто вручную (collapsed-open), дальнейший скролл его не
    // закрывает сам по себе — только явный клик по крестику или возврат к
    // самому верху страницы (см. выше).
    if (wrap.dataset.navState !== "collapsed-open") {
      setState("collapsed");
    }
  };

  menuBtn.addEventListener("click", () => {
    setState(wrap.dataset.navState === "collapsed-open" ? "collapsed" : "collapsed-open");
  });

  topBtn.addEventListener("click", () => {
    setState("expanded");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", syncWithScroll, { passive: true });

  // Переключение между моб./планшетом и десктопом (например, поворот
  // экрана или ресайз окна) — на десктопе панель всегда полная.
  mql.addEventListener("change", () => {
    syncWithScroll();
    if (!mql.matches) setState("expanded");
  });

  setState(mql.matches && window.scrollY > COLLAPSE_SCROLL_THRESHOLD ? "collapsed" : "expanded");
}

export function initBottomNav(root = document) {
  const nav = root.querySelector(".bottom-nav");
  if (!nav || initializedNavs.has(nav)) return;

  initializedNavs.add(nav);

  initCollapse(root.querySelector(".bottom-nav-wrap"));

  const items = Array.from(nav.querySelectorAll(".bottom-nav__item"));
  const labels = items.map((item) => item.querySelector(".bottom-nav__label"));

  // create indicator element if missing
  let indicator = nav.querySelector('.bottom-nav__indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'bottom-nav__indicator';
    nav.insertBefore(indicator, nav.firstChild);
  }

  // Все пункты — одинаковой ширины: по самому длинному лейблу + 6px
  // с каждой стороны (см. bottom-nav.css, --nav-item-content-width).
  // На ≥800px CSS сам переключает пункты на ширину кнопки в хедере —
  // это значение здесь просто перестаёт использоваться.
  const equalizeItemWidths = () => {
    const maxLabelWidth = Math.max(...labels.map((label) => label.getBoundingClientRect().width));
    const pad = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.375; // 6px при 390px
    nav.style.setProperty("--nav-item-content-width", `${Math.ceil(maxLabelWidth + pad * 2)}px`);
  };

  const moveIndicator = (item) => {
    // use offsetLeft/offsetWidth (measured relative to nav) for robust positioning
    const left = Math.round(item.offsetLeft);
    const width = Math.round(item.offsetWidth);
    // clamp within nav bounds so indicator never overflows
    const maxLeft = Math.max(0, nav.clientWidth - width);
    const clampedLeft = Math.max(0, Math.min(left, maxLeft));
    nav.style.setProperty("--indicator-left", `${clampedLeft}px`);
    nav.style.setProperty("--indicator-width", `${Math.min(width, nav.clientWidth)}px`);
  };

  const resizeObserver = new ResizeObserver(() => {
    equalizeItemWidths();
    const current = items.find((item) => item.dataset.state === "active");
    if (current) moveIndicator(current);
  });
  resizeObserver.observe(nav);
  // also observe individual items (their sizes can change as images/fonts load)
  items.forEach((it) => resizeObserver.observe(it));

  const activeItem = items.find((item) => item.dataset.state === "active") || items[0];
  // initial placement — defer a couple frames and also on window load to avoid jumps
  equalizeItemWidths();
  moveIndicator(activeItem);
  requestAnimationFrame(() => requestAnimationFrame(() => moveIndicator(activeItem)));
  window.addEventListener('load', () => {
    equalizeItemWidths();
    moveIndicator(items.find((item) => item.dataset.state === "active") || items[0]);
  });

  nav.addEventListener("click", (event) => {
    const clicked = event.target.closest(".bottom-nav__item");
    if (!clicked || clicked.dataset.state === "active") return;

    items.forEach((item) => {
      const isClicked = item === clicked;
      item.dataset.state = isClicked ? "active" : "default";
      if (isClicked) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    moveIndicator(clicked);

    nav.dispatchEvent(
      new CustomEvent("navchange", {
        bubbles: true,
        detail: { target: clicked.dataset.navTarget },
      })
    );
  });
}

// Автоинициализация при обычном подключении <script src="bottom-nav.js" type="module">
initBottomNav(document);
