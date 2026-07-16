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

  // create indicator element if missing
  let indicator = nav.querySelector('.bottom-nav__indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'bottom-nav__indicator';
    nav.insertBefore(indicator, nav.firstChild);
  }

  const moveIndicator = (item) => {
    // compute position relative to nav
    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const left = Math.round(itemRect.left - navRect.left + nav.scrollLeft);
    const width = Math.round(itemRect.width);
    nav.style.setProperty("--indicator-left", `${left}px`);
    nav.style.setProperty("--indicator-width", `${width}px`);
  };

  const activeItem = items.find((item) => item.dataset.state === "active") || items[0];
  moveIndicator(activeItem);

  const resizeObserver = new ResizeObserver(() => {
    const current = items.find((item) => item.dataset.state === "active");
    if (current) moveIndicator(current);
  });
  resizeObserver.observe(nav);

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
