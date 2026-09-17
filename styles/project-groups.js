/* Extend the existing DS link hit area across its card, with one focus stop. */
(() => {
  const cards = [...document.querySelectorAll('.project-card--linked')];
  const measure = card => {
    const link = card.querySelector('a');
    const rect = card.getBoundingClientRect();
    const action = link.getBoundingClientRect();
    link.style.setProperty('--hit-left', `${rect.left - action.left}px`);
    link.style.setProperty('--hit-top', `${rect.top - action.top}px`);
    link.style.setProperty('--hit-width', `${rect.width}px`);
    link.style.setProperty('--hit-height', `${rect.height}px`);
  };
  const observer = new ResizeObserver(entries => entries.forEach(({ target }) => measure(target)));
  cards.forEach(card => { measure(card); observer.observe(card); });
  document.fonts.ready.then(() => cards.forEach(measure));
})();
