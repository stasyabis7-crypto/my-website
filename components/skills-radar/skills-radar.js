/* A native SVG profile, click-to-explore desktop popover and mobile dialog. */
(function () {
  'use strict';
  var section = document.querySelector('.skills-radar');
  if (!section) return;
  var skills = [{"title":"Продуктовое мышление","description":"Формулирую проблемы, расставляю приоритеты и связываю дизайн-решения с результатами бизнеса."},{"title":"Исследования и проверка","description":"Провожу интервью и юзабилити-тесты, проверяю прототипы, чтобы понимать людей и оценивать идеи."},{"title":"Интерфейсы и взаимодействие","description":"Создаю понятные сценарии и продуманные интерфейсы для веба и мобильных приложений."},{"title":"Дизайн-системы","description":"Использую и развиваю компоненты и токены, помогаю продуктам становиться согласованнее."},{"title":"AI-продукты и инструменты","description":"Проектирую AI-сценарии, ассистентов и интерфейсы, вызывающие доверие. Использую AI в работе: прототипирование, Claude Code, Codex, Kling и ChatGPT."},{"title":"Данные и метрики","description":"Определяю метрики успеха, интерпретирую A/B-тесты и измеряю влияние дизайна."},{"title":"Доступность","description":"Один из лидеров направления доступности в Авито: помогаю делать продукты удобнее для большего числа людей."},{"title":"Команда и влияние","description":"Работаю с продакт-менеджерами и разработчиками, представляю решения стейкхолдерам и помогаю дизайнерам развиваться."}];
  if (window.siteLanguage) skills = skills.map(function (skill) { return { title: window.siteLanguage.t(skill.title), description: window.siteLanguage.t(skill.description) }; });
  var mobile = matchMedia('(max-width: 699px)');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var plot = section.querySelector('.skills-radar__svg');
  var popover = section.querySelector('#skills-popover');
  var sheet = section.querySelector('#skills-sheet');
  var triggers = Array.from(section.querySelectorAll('[data-skill]'));
  var active = null, trigger = null, closeTimer;
  function populate(container, skill) {
    container.querySelector('[data-skill-title]').textContent = skill.title;
    container.querySelector('[data-skill-description]').textContent = skill.description;
  }
  function mark(index, expanded) {
    triggers.forEach(function (button) {
      var selected = expanded && Number(button.dataset.skill) === index;
      button.setAttribute('aria-expanded', String(selected));
      button.setAttribute('aria-controls', mobile.matches ? 'skills-sheet' : 'skills-popover');
      button.setAttribute('aria-haspopup', 'dialog');
    });
  }
  function placePopover() {
    if (!trigger || !popover.matches(':popover-open')) return;
    var anchor = trigger.getBoundingClientRect();
    var box = popover.getBoundingClientRect();
    var left = Math.max(16, Math.min(innerWidth - box.width - 16, anchor.left + anchor.width / 2 - box.width / 2));
    var top = anchor.bottom + 14;
    if (top + box.height > innerHeight - 16) top = anchor.top - box.height - 14;
    top = Math.max(16, Math.min(innerHeight - box.height - 16, top));
    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
  }
  function reset() { mark(-1, false); active = null; }
  function closeSheet() {
    if (!sheet.open || sheet.classList.contains('is-closing')) return;
    if (reduced.matches) { sheet.close(); return; }
    sheet.classList.add('is-closing');
    closeTimer = setTimeout(function () { sheet.close(); }, 380);
  }
  function openSkill(button) {
    var index = Number(button.dataset.skill);
    if (!mobile.matches && active === index && popover.matches(':popover-open')) {
      popover.hidePopover(); reset(); return;
    }
    trigger = button;
    active = index;
    mark(index, true);
    if (mobile.matches) {
      clearTimeout(closeTimer);
      sheet.classList.remove('is-closing');
      populate(sheet, skills[index]);
      if (!sheet.open) sheet.showModal();
      document.documentElement.classList.add('skills-sheet-open');
    } else {
      populate(popover, skills[index]);
      if (!popover.matches(':popover-open')) popover.showPopover();
      button.setAttribute('aria-describedby', 'skills-popover');
      placePopover();
    }
  }
  triggers.forEach(function (button) {
    button.addEventListener('click', function () { openSkill(button); });
  });
  popover.addEventListener('toggle', function () {
    if (!popover.matches(':popover-open')) {
      triggers.forEach(function (button) { button.removeAttribute('aria-describedby'); });
      if (!sheet.open) reset();
    }
  });
  popover.querySelector('[data-skill-popover-close]').addEventListener('click', function () {
    popover.hidePopover();
    if (trigger) trigger.focus({ preventScroll: true });
  });
  sheet.querySelector('[data-skill-close]').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', function (event) { event.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', function (event) {
    if (event.target !== sheet) return;
    var bounds = sheet.getBoundingClientRect();
    if (event.clientY < bounds.top || event.clientX < bounds.left || event.clientX > bounds.right) closeSheet();
  });
  sheet.addEventListener('animationend', function (event) {
    if (event.target === sheet && event.animationName === 'skill-sheet-out') sheet.close();
  });
  sheet.addEventListener('close', function () {
    clearTimeout(closeTimer);
    sheet.classList.remove('is-closing');
    document.documentElement.classList.remove('skills-sheet-open');
    reset();
    if (trigger) trigger.focus({ preventScroll: true });
  });
  // A downward swipe from the sheet header closes it; body text keeps native scrolling.
  var touchY = null;
  sheet.addEventListener('touchstart', function (event) {
    var y = event.touches[0].clientY;
    touchY = y - sheet.getBoundingClientRect().top < 100 ? y : null;
  }, { passive: true });
  sheet.addEventListener('touchend', function (event) {
    if (touchY !== null && event.changedTouches[0].clientY - touchY > 70) closeSheet();
    touchY = null;
  }, { passive: true });
  function layout() {
    if (sheet.open) sheet.close();
    if (popover.matches(':popover-open')) popover.hidePopover();
    reset();
    plot.setAttribute('viewBox', mobile.matches ? '200 80 640 640' : '0 0 1040 800');
  }
  mobile.addEventListener('change', layout);
  addEventListener('resize', placePopover, { passive: true });
  addEventListener('scroll', function () {
    if (popover.matches(':popover-open')) popover.hidePopover();
  }, { passive: true });
  layout();
  section.addEventListener('animationend', function (event) {
    if (event.animationName === 'skill-line-in') section.classList.add('is-line-complete');
  });
  section.classList.add('is-ready');
  if (reduced.matches || !('IntersectionObserver' in window)) section.classList.add('is-visible');
  else {
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        section.classList.add('is-visible'); observer.disconnect();
      }
    }, { threshold: .15 });
    observer.observe(section);
  }
})();
