/* Shared desktop/mobile contents for the recycle-map case (window scrolling). */
(() => {
  const root = document.querySelector('.work-toc');
  if (!root) return;
  const toggle = root.querySelector('.work-toc__toggle');
  const panel = root.querySelector('.work-toc__panel');
  const items = [...panel.querySelectorAll('a[href^="#"]')].map(link => ({
    link, section: document.getElementById(link.hash.slice(1)),
    marker: root.querySelector(`[data-toc-marker="${link.hash.slice(1)}"]`)
  })).filter(item => item.section);
  const desktop = matchMedia('(min-width: 1101px) and (hover: hover)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let manualUntil = 0;
  let unlockTimer;
  let current;

  function setActive(item) {
    if (current === item) return;
    current = item;
    items.forEach(entry => {
      if (entry === item) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
      entry.marker.classList.toggle('is-current', entry === item);
    });
  }
  function update() {
    frame = 0;
    if (performance.now() < manualUntil) return;
    const offset = parseFloat(getComputedStyle(items[0].section).scrollMarginTop) + 24;
    let active = items[0];
    for (const item of items) {
      if (item.section.getBoundingClientRect().top <= offset) active = item;
    }
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      active = items.at(-1);
    }
    setActive(active);
  }
  function scheduleUpdate() { if (!frame) frame = requestAnimationFrame(update); }
  function setOpen(open, restoreFocus = false) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть оглавление' : 'Оглавление проекта');
    if (restoreFocus) toggle.focus({ preventScroll: true });
    if (open && current) {
      panel.scrollTop = Math.max(0, current.link.offsetTop - panel.clientHeight / 2);
    }
  }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  root.addEventListener('pointerenter', event => {
    if (desktop.matches && event.pointerType === 'mouse') setOpen(true);
  });
  root.addEventListener('pointerleave', () => {
    if (desktop.matches && !root.contains(document.activeElement)) setOpen(false);
  });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener('pointerdown', event => {
    if (!root.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
  });
  items.forEach(item => item.link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    manualUntil = performance.now() + 1000;
    setActive(item);
    setOpen(false);
    history.pushState(null, '', item.link.hash);
    item.section.focus({ preventScroll: true });
    item.section.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(scheduleUpdate, 1050);
  }));
  function cancelManual() { manualUntil = 0; scheduleUpdate(); }
  window.addEventListener('wheel', cancelManual, { passive: true });
  window.addEventListener('touchstart', cancelManual, { passive: true });
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', cancelManual);
  window.addEventListener('load', scheduleUpdate);
  desktop.addEventListener('change', () => setOpen(false));
  if (!items.length) return;
  root.hidden = false;
  update();
})();
