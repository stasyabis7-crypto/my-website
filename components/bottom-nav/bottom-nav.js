/*
  Логика BottomNav: клик переключает data-state на кнопках
  и уведомляет остальную страницу через CustomEvent "navchange",
  чтобы позже можно было повесить реальный роутинг/скролл к секции.
*/

const initializedNavs = new WeakSet();

export function initBottomNav(root = document) {
  const nav = root.querySelector(".bottom-nav");
  if (!nav || initializedNavs.has(nav)) return;

  initializedNavs.add(nav);

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
