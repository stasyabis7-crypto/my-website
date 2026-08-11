(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Horizontal skill deck: native scrolling remains the source of truth, the
     arrows only move to the nearest card. */
  var deck = document.querySelector('.skills-deck__track');
  var slides = deck ? Array.prototype.slice.call(deck.querySelectorAll('.skill-slide')) : [];
  var counter = document.querySelector('.deck-counter');
  var deckIndex = 0;

  function updateDeck(index) {
    if (!slides.length) return;
    deckIndex = Math.max(0, Math.min(slides.length - 1, index));
    slides[deckIndex].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
    if (counter) counter.textContent = String(deckIndex + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
  }

  var prev = document.querySelector('.deck-prev');
  var next = document.querySelector('.deck-next');
  if (prev) prev.addEventListener('click', function () { updateDeck(deckIndex - 1); });
  if (next) next.addEventListener('click', function () { updateDeck(deckIndex + 1); });
  if (deck && 'IntersectionObserver' in window) {
    var deckObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
        deckIndex = slides.indexOf(entry.target);
        if (counter) counter.textContent = String(deckIndex + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      });
    }, { root: deck, threshold: [0.6] });
    slides.forEach(function (slide) { deckObserver.observe(slide); });
  }

  /* Career player. */
  var careerTabs = Array.prototype.slice.call(document.querySelectorAll('.career-rail [data-company]'));
  var detailPeriod = document.querySelector('.career-detail__period');
  var detailCompany = document.querySelector('.career-detail__company');
  var detailRole = document.querySelector('.career-detail__role');
  var detailCopy = document.querySelector('.career-detail__copy');
  var detailMore = document.querySelector('.career-detail__more');

  function selectCompany(tab) {
    careerTabs.forEach(function (item) { item.setAttribute('aria-selected', item === tab ? 'true' : 'false'); });
    if (detailPeriod) detailPeriod.textContent = tab.dataset.period;
    if (detailCompany) detailCompany.textContent = tab.textContent.trim();
    if (detailRole) detailRole.textContent = tab.dataset.role;
    if (detailCopy) detailCopy.textContent = tab.dataset.copy;
    if (detailMore) detailMore.dataset.openCompany = tab.dataset.company;
  }
  careerTabs.forEach(function (tab) { tab.addEventListener('click', function () { selectCompany(tab); }); });

  /* Company detail uses the existing accessible drawer markup and content templates. */
  var backdrop = document.getElementById('panel-backdrop');
  var panel = document.getElementById('company-panel');
  var panelBody = document.getElementById('panel-body');
  var panelPeriod = document.getElementById('panel-period');
  var panelTitle = document.getElementById('panel-title');
  var panelRole = document.getElementById('panel-role');
  var panelClose = document.getElementById('panel-close');

  function openCompany(company) {
    var tab = document.querySelector('.career-rail [data-company="' + company + '"]');
    var template = document.getElementById('company-tpl-' + company);
    if (!tab || !template || !panel || !backdrop || !panelBody) return;
    panelBody.innerHTML = '';
    panelBody.appendChild(template.content.cloneNode(true));
    panelPeriod.textContent = tab.dataset.period;
    panelTitle.textContent = tab.textContent.trim();
    panelRole.textContent = tab.dataset.role;
    panel.style.setProperty('--panel-accent', getComputedStyle(tab).getPropertyValue('--accent'));
    backdrop.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); panel.classList.add('is-open'); });
    document.documentElement.style.overflow = 'hidden';
    if (panelClose) panelClose.focus();
  }

  function closeCompany() {
    if (!panel || !panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    window.setTimeout(function () { panel.hidden = true; backdrop.hidden = true; }, reduceMotion ? 0 : 450);
    if (detailMore) detailMore.focus();
  }

  if (detailMore) detailMore.addEventListener('click', function () { openCompany(detailMore.dataset.openCompany); });
  if (panelClose) panelClose.addEventListener('click', closeCompany);
  if (backdrop) backdrop.addEventListener('click', closeCompany);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeCompany(); });

})();
