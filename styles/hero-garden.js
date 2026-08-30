/*
  Баннер-сад: тянет посаженные цветы из api/flowers.php и раскидывает их
  по баннеру. Модель (2026-08-29): 6 фиксированных видов цветов, у каждого
  своё место / размер / наклон на баннере (styles/garden-zones.json, снят
  из Figma-макета). Баннер показывает по одному, самому свежему, цветку
  каждого вида. Посадка сильно упрощена: гость получает случайный цветок,
  может «сгенерировать другой», пишет короткое послание и сажает — без
  выбора вида и без настройки наклона.

  Каталог видов и валидация ключей — общий flowers-catalog.json (его же
  читает PHP).
*/
(function () {
  'use strict';

  var API = 'api/flowers.php';
  var CATALOG_URL = 'flowers-catalog.json?v=4';
  var ZONES_URL = 'styles/garden-zones.json?v=3';
  var LS_KEY = 'gardenFlowerId';
  var NOTE_MAX = 160;

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Экран загрузки (loading.js) ждёт этот промис — держит котика, пока
     цветы сада не отрисованы и их картинки не загрузились. Предохранитель
     7с — раньше 9с-таймаута самого экрана, чтобы сад его не блокировал
     навсегда при сбое. */
  var gardenReadyDone;
  window.__gardenReady = new Promise(function (res) { gardenReadyDone = res; });
  setTimeout(function () { gardenReadyDone(); }, 7000);

  /* Блокировка скролла фона под попапом/шторкой — просто overflow:hidden
     на html+body (см. .gd-scroll-lock в hero-garden.css). Без
     position:fixed / сохранения scrollY: страница остаётся ровно там,
     где была, ничего не «прыгает». */
  function lockScroll() {
    root.classList.add('gd-scroll-lock');
  }
  function unlockScroll() {
    root.classList.remove('gd-scroll-lock');
  }

  /* Закрытие любого попапа/шторки сада с анимацией: вешаем .is-closing
     (CSS проигрывает gd-picker-out / gd-sheet-out на .garden-picker__panel),
     после её конца прячем и чистим. Предохранитель на случай, если
     animationend не прилетит. */
  function closeModal(el, done) {
    if (!el || el.hidden || el.classList.contains('is-closing')) return;
    if (reduceMotion) { el.hidden = true; if (done) done(); return; }
    el.classList.add('is-closing');
    var panel = el.querySelector('.garden-picker__panel') || el;
    var t;
    var finish = function (e) {
      if (e && e.animationName && !/-out$/.test(e.animationName)) return;
      panel.removeEventListener('animationend', finish);
      clearTimeout(t);
      el.hidden = true;
      el.classList.remove('is-closing');
      if (done) done();
    };
    panel.addEventListener('animationend', finish);
    t = setTimeout(finish, 450);
  }

  /* ---------- chrome: pinned-on-scroll ---------- */
  function updatePinned() {
    root.classList.toggle('chrome--pinned', window.scrollY > 20);
  }
  updatePinned();
  var pinTicking = false;
  window.addEventListener('scroll', function () {
    if (pinTicking) return;
    pinTicking = true;
    requestAnimationFrame(function () { updatePinned(); pinTicking = false; });
  }, { passive: true });

  /* ---------- соцсети ---------- */
  (function socials() {
    var wrap = document.getElementById('site-socials');
    if (!wrap) return;
    var toggle = document.getElementById('site-socials-toggle');

    /* Мобилка (≤899px): переносим блок ВНУТРЬ .site-header (кнопка справа
       от «Резюме PDF», раскладка — hero-garden.css). Десктоп: возвращаем
       обратно в body сразу после хедера — там это position:fixed ряд в
       правом верхнем углу, а внутри плашки с backdrop-filter fixed
       считался бы от самой плашки. */
    var headerEl = document.querySelector('.site-header');
    var socialsMq = window.matchMedia('(max-width: 899px)');
    function placeSocials() {
      if (!headerEl) return;
      if (socialsMq.matches) {
        if (wrap.parentElement !== headerEl) headerEl.appendChild(wrap);
      } else if (wrap.previousElementSibling !== headerEl) {
        headerEl.insertAdjacentElement('afterend', wrap);
      }
    }
    placeSocials();
    (socialsMq.addEventListener
      ? socialsMq.addEventListener('change', placeSocials)
      : socialsMq.addListener(placeSocials));

    var EMAIL = 'stasyabis7@gmail.com';
    var ITEMS = [
      { label: 'Написать в tg', img: '/assets/socials/Telegram.svg', href: 'https://t.me/stasyabis' },
      { label: 'Написать на почту', img: '/assets/socials/Google.svg', copy: EMAIL },
      { label: 'Dribbble', img: '/assets/socials/Dribbble.svg', href: 'https://dribbble.com/Stasyabis' },
      { label: 'Figma community', img: '/assets/socials/Figma.svg', href: 'https://www.figma.com/@stasyabis' },
      { label: 'Medium', img: '/assets/socials/Medium.svg', href: 'https://medium.com/@stasyabis' },
      { label: 'Habr', img: '/assets/socials/Habr.svg', href: 'https://habr.com/ru/users/stasyabis/' }
    ];

    function copyText(text, done) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        // Фолбэк (не-secure-контекст). textarea фиксируем в углу вьюпорта
        // и прозрачным — иначе .select() проскроллит страницу к нему.
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { ta.setSelectionRange(0, text.length); } catch (e) {}
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    }

    // desktop-ряд: копирование почты + тост
    var toast;
    function showCopied() {
      if (!toast) {
        toast = document.createElement('span');
        toast.className = 'site-socials__copied';
        toast.textContent = 'Почта скопирована';
        wrap.appendChild(toast);
      }
      toast.hidden = false;
      clearTimeout(showCopied._t);
      showCopied._t = setTimeout(function () { if (toast) toast.hidden = true; }, 1600);
    }
    wrap.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () { copyText(btn.getAttribute('data-copy'), showCopied); });
    });

    // мобилка: круглая кнопка → шторка снизу
    var sheet;
    function closeSheet() {
      closeModal(sheet, function () {
        unlockScroll();
        if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
      });
    }
    function openSheet() {
      if (!sheet) {
        sheet = document.createElement('div');
        sheet.className = 'garden-picker garden-socials-sheet';
        sheet.hidden = true;
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-label', 'Соцсети');
        var head = '<div class="garden-picker__backdrop" data-close></div>' +
          '<div class="garden-picker__panel"><div class="garden-picker__head">' +
          '<h2 class="garden-picker__title">Связаться</h2>' +
          '<button type="button" class="garden-picker__close" data-close aria-label="Закрыть">×</button>' +
          '</div><div data-rows></div></div>';
        sheet.innerHTML = head;
        var rows = sheet.querySelector('[data-rows]');
        ITEMS.forEach(function (it) {
          var el;
          if (it.copy) {
            el = document.createElement('button');
            el.type = 'button';
            el.addEventListener('click', function () {
              copyText(it.copy, function () {});
              // Не закрываем шторку — показываем подтверждение и через
              // пару секунд возвращаем подпись.
              el.lastChild.textContent = 'Почта скопирована';
              clearTimeout(el._t);
              el._t = setTimeout(function () { el.lastChild.textContent = it.label; }, 1800);
            });
          } else {
            el = document.createElement('a');
            el.href = it.href;
            el.target = '_blank';
            el.rel = 'noopener noreferrer';
            el.addEventListener('click', function () { setTimeout(closeSheet, 60); });
          }
          el.className = 'garden-socials__row';
          el.innerHTML = '<span class="garden-socials__chip"><span class="garden-socials__ico" style="--i:url(\'' + it.img + '\')"></span></span>';
          el.appendChild(document.createTextNode(it.label));
          rows.appendChild(el);
        });
        sheet.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeSheet); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet && !sheet.hidden) closeSheet(); });
        document.body.appendChild(sheet);
      }
      sheet.hidden = false;
      lockScroll();
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      var c = sheet.querySelector('.garden-picker__close');
      if (c) c.focus();
    }
    if (toggle) toggle.addEventListener('click', function (e) { e.stopPropagation(); openSheet(); });
  })();

  /* ---------- сад ---------- */
  var flowersEl = document.getElementById('garden-flowers');
  var counterEl = document.getElementById('garden-counter');
  var plantBtn = document.getElementById('garden-plant');
  var helpBtn = document.getElementById('garden-help');
  if (!flowersEl) { gardenReadyDone(); return; }

  /* Резолвим __gardenReady, когда все отрисованные цветы (их <img>)
     загрузились. Нет цветов — сразу. */
  function whenFlowersLoaded() {
    var imgs = flowersEl.querySelectorAll('img');
    if (!imgs.length) { gardenReadyDone(); return; }
    var left = imgs.length;
    var tick = function () { if (--left <= 0) gardenReadyDone(); };
    imgs.forEach(function (im) {
      if (im.complete && im.naturalWidth > 0) { tick(); return; }
      im.addEventListener('load', tick, { once: true });
      im.addEventListener('error', tick, { once: true });
    });
  }

  var stage = flowersEl.parentElement; // .garden__stage
  var bloomingEl = counterEl && counterEl.querySelector('[data-count="blooming"]');
  var plantedEl = counterEl && counterEl.querySelector('[data-count="planted"]');

  var catalog = null;         // { slots, flowers:[{key,name,meaning,variants:[{id,img,w,h}]}] }
  var catByKey = {};
  var zones = null;           // styles/garden-zones.json — места видов по брейкпоинтам
  var flowers = [];           // из API, newest-first
  var plantedCount = 0;
  var canPlant = true;
  var rendered = {};          // id -> element (чтобы не переанимировать на resize)

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sr(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function variantOf(key) {
    var f = catByKey[key];
    return f && f.variants && f.variants[0] ? f.variants[0] : null;
  }

  // Набор мест под текущую ширину вьюпорта.
  function slotsForViewport() {
    var bps = (zones && zones.breakpoints) || [];
    var vw = window.innerWidth;
    for (var i = 0; i < bps.length; i++) {
      if (vw >= (bps[i].minWidth || 0)) return bps[i];
    }
    return bps[bps.length - 1] || null;
  }

  function layout() {
    if (!catalog) return;
    var bp = slotsForViewport();
    if (!bp || !bp.slots) { if (bloomingEl) bloomingEl.textContent = '0'; return; }

    var b0 = stage.getBoundingClientRect();
    var W = b0.width, H = b0.height;
    if (!W || !H) return;

    // По одному, самому свежему, цветку каждого вида. flowers[] — newest-first.
    var seen = {};
    var show = [];
    for (var i = 0; i < flowers.length; i++) {
      var fl = flowers[i];
      if (seen[fl.key]) continue;
      if (!bp.slots[fl.key] || !catByKey[fl.key]) continue; // вид не из нового каталога
      seen[fl.key] = 1;
      show.push(fl);
    }

    var showIds = {};
    show.forEach(function (fl) {
      var v = variantOf(fl.key);
      if (!v) return;
      var s = bp.slots[fl.key];
      showIds[fl.id] = 1;
      placeFlower(fl, v, s.cx * W, s.cy * H, s.w * W, s.h * H, s.rot || 0);
    });

    Object.keys(rendered).forEach(function (id) {
      if (!showIds[id]) { rendered[id].remove(); delete rendered[id]; }
    });
    if (bloomingEl) bloomingEl.textContent = String(show.length);
  }

  // cx/cy — центр бокса в px, w/h — размер невращённого бокса, rot — наклон.
  function placeFlower(fl, v, cx, cy, w, h, rot) {
    var el = rendered[fl.id];
    if (!el) {
      el = document.createElement('button');
      el.type = 'button';
      el.className = 'garden-flower' + (fl.mine ? ' garden-flower--mine' : '');
      el.setAttribute('data-id', fl.id);
      var name = (catByKey[fl.key] && catByKey[fl.key].name) || 'Цветок';
      el.setAttribute('aria-label', 'Цветок: ' + name + (fl.mine ? ' (ваш)' : '') + '. Открыть заметку');
      var img = document.createElement('img');
      img.className = 'garden-flower__img';
      img.src = v.img;
      img.alt = '';
      img.loading = 'lazy';
      el.appendChild(img);
      el.style.setProperty('--gd-sway-delay', (-sr(fl.id) * 6).toFixed(2) + 's');
      // Клик обрабатывает делегат на flowersEl (см. ниже) — по БЛИЖАЙШЕМУ
      // к точке цветку, а не по прямоугольной хит-зоне: соседние цветки
      // сильно перекрываются, и верхний прямоугольник иначе крал бы клики.
      if (reduceMotion) el.style.animation = 'none';
      flowersEl.appendChild(el);
      rendered[fl.id] = el;
    }
    el.style.left = cx.toFixed(1) + 'px';
    el.style.top = cy.toFixed(1) + 'px';
    el.style.width = w.toFixed(1) + 'px';
    el.style.height = h.toFixed(1) + 'px';
    el.style.setProperty('--gd-rot', (rot || 0).toFixed(2) + 'deg');
  }

  /* ---------- карточка цветка / справка ---------- */

  function daysAgoLabel(iso) {
    var t = new Date(iso);
    if (isNaN(t.getTime())) return '';
    // Разница в КАЛЕНДАРНЫХ днях по локальному времени зрителя: сравниваем
    // полночь даты посадки с сегодняшней полночью, а не «прошло 24 часа».
    var now = new Date();
    var planted = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var d = Math.round((today - planted) / 86400000);
    if (d <= 0) return 'сегодня';
    if (d === 1) return 'вчера';
    var m10 = d % 10, m100 = d % 100;
    var word = (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'дня' : 'дней';
    return d + ' ' + word + ' назад';
  }

  /* Содержимое карточки открытого цветка — один порядок и для десктопного
     попапа, и для мобильной шторки:
       подзаголовок (значение вида, цветом заголовка)
       → фото цветка
       → послание гостя во фрейме-«сообщении» с хвостиком (если есть),
         дата — внутри этого фрейма под текстом
       → если послания нет — дата в отдельном светлом чипе. */
  function fillFlowerInfo(box, fl, f) {
    box.innerHTML = '';
    var v = variantOf(fl.key);
    var metaText = (fl.mine ? 'ваш цветок · ' : '') + (daysAgoLabel(fl.createdAt) || '');

    var meaning = f.meaning ? String(f.meaning).replace(/[.\s]+$/, '') : '';
    if (meaning) {
      var m = document.createElement('p');
      m.className = 'garden-flower-info__meaning';
      m.textContent = meaning;
      box.appendChild(m);
    }

    var pic = document.createElement('div');
    pic.className = 'garden-flower-info__pic';
    var img = document.createElement('img');
    img.alt = '';
    if (v) img.src = v.img;
    pic.appendChild(img);
    box.appendChild(pic);

    if (fl.note) {
      var msg = document.createElement('div');
      msg.className = 'garden-flower-info__msg';
      var t = document.createElement('p');
      t.className = 'garden-flower-info__msg-text';
      t.textContent = fl.note;
      msg.appendChild(t);
      if (metaText) {
        var d = document.createElement('span');
        d.className = 'garden-flower-info__msg-date';
        d.textContent = metaText;
        msg.appendChild(d);
      }
      box.appendChild(msg);
    } else if (metaText) {
      var chip = document.createElement('div');
      chip.className = 'garden-flower-info__date';
      chip.textContent = metaText;
      box.appendChild(chip);
    }
  }

  /* Карточка открытого цветка — оболочка .garden-picker: на десктопе
     центрированный попап (как «Как устроен сад»), на мобилке — шторка
     снизу. Контент один и тот же (fillFlowerInfo). */
  var fmodal, fmodalEls = {};

  function buildFlowerModal() {
    fmodal = document.createElement('div');
    fmodal.className = 'garden-picker garden-flower-sheet';
    fmodal.hidden = true;
    fmodal.setAttribute('role', 'dialog');
    fmodal.setAttribute('aria-modal', 'true');
    fmodal.setAttribute('aria-label', 'Цветок');
    fmodal.innerHTML = [
      '<div class="garden-picker__backdrop" data-close></div>',
      '<div class="garden-picker__panel">',
      '  <div class="garden-picker__head">',
      '    <h2 class="garden-picker__title" data-name></h2>',
      '    <button type="button" class="garden-picker__close" data-close aria-label="Закрыть">×</button>',
      '  </div>',
      '  <div class="garden-flower-info" data-body></div>',
      '</div>'
    ].join('');
    document.body.appendChild(fmodal);
    fmodalEls.name = fmodal.querySelector('[data-name]');
    fmodalEls.body = fmodal.querySelector('[data-body]');
    fmodal.querySelectorAll('[data-close]').forEach(function (x) {
      x.addEventListener('click', closeFlowerModal);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && fmodal && !fmodal.hidden) closeFlowerModal();
    });
    window.addEventListener('resize', closeFlowerModal);
  }

  function closeFlowerModal() {
    closeModal(fmodal, unlockScroll);
  }

  function openFlowerModal(fl) {
    var f = catByKey[fl.key] || {};
    if (!fmodal) buildFlowerModal();
    fmodalEls.name.textContent = f.name || 'Цветок';
    fillFlowerInfo(fmodalEls.body, fl, f);
    fmodal.hidden = false;
    lockScroll();
    var c = fmodal.querySelector('.garden-picker__close');
    if (c) c.focus();
  }

  /* Делегированный клик по цветку: мышь/тап — по БЛИЖАЙШЕМУ к точке
     цветку среди тех, чей бокс накрыл точку (прямоугольные хит-зоны
     соседних цветков перекрываются); клавиатура (Enter/Space на кнопке,
     e.detail === 0) — по цветку с фокусом. */
  function flowerById(id) {
    for (var i = 0; i < flowers.length; i++) {
      if (String(flowers[i].id) === String(id)) return flowers[i];
    }
    return null;
  }

  flowersEl.addEventListener('click', function (e) {
    var chosen = null;
    var focusBtn = e.target.closest('.garden-flower');
    if (e.detail === 0 && focusBtn) {
      chosen = focusBtn;
    } else {
      var best = Infinity;
      Object.keys(rendered).forEach(function (id) {
        var el = rendered[id];
        var r = el.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var d = dx * dx + dy * dy;
        if (d < best) { best = d; chosen = el; }
      });
      if (!chosen) chosen = focusBtn;
    }
    if (!chosen) return;
    var fl = flowerById(chosen.getAttribute('data-id'));
    if (fl) openFlowerModal(fl);
  });

  /* «?» у счётчика — попап (desktop) / шторка (mobile) с пояснением. */
  var helpModal;
  function closeHelp() {
    closeModal(helpModal, function () {
      unlockScroll();
      if (helpBtn) helpBtn.focus();
    });
  }
  function openHelp() {
    if (!helpModal) {
      helpModal = document.createElement('div');
      helpModal.className = 'garden-picker garden-help';
      helpModal.hidden = true;
      helpModal.setAttribute('role', 'dialog');
      helpModal.setAttribute('aria-modal', 'true');
      helpModal.setAttribute('aria-label', 'Как устроен сад');
      helpModal.innerHTML = [
        '<div class="garden-picker__backdrop" data-close></div>',
        '<div class="garden-picker__panel garden-help__panel">',
        '  <div class="garden-picker__head">',
        '    <h2 class="garden-picker__title">Как устроен сад</h2>',
        '    <button type="button" class="garden-picker__close" data-close aria-label="Закрыть">×</button>',
        '  </div>',
        '  <div class="garden-help__text">',
        '    <p><b>Цветёт</b> — то, что вы видите на баннере прямо сейчас.</p>',
        '    <p><b>Посажено</b> — сколько всего людей оставили здесь свой след за всё время.</p>',
        '    <p>Посадить можно <b>только один цветок</b> — он останется на баннере с вашим коротким посланием.</p>',
        '  </div>',
        '</div>'
      ].join('');
      document.body.appendChild(helpModal);
      helpModal.querySelectorAll('[data-close]').forEach(function (el) {
        el.addEventListener('click', closeHelp);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && helpModal && !helpModal.hidden) closeHelp();
      });
    }
    helpModal.hidden = false;
    lockScroll();
    var c = helpModal.querySelector('.garden-picker__close');
    if (c) c.focus();
  }

  if (helpBtn) {
    helpBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openHelp();
    });
  }

  /* ---------- посадка: попап / шторка ---------- */
  var picker, pickerState = { key: null };
  var pickerEls = {};

  function randomKey(exclude) {
    var keys = catalog.flowers.map(function (f) { return f.key; });
    if (exclude && keys.length > 1) keys = keys.filter(function (k) { return k !== exclude; });
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function setPreview(key) {
    pickerState.key = key;
    var f = catByKey[key];
    var v = f && f.variants[0];
    if (pickerEls.preview && v) {
      pickerEls.preview.src = v.img;
      pickerEls.preview.alt = f.name || '';
    }
    if (pickerEls.name) pickerEls.name.textContent = (f && f.name) || '';
    if (pickerEls.meaning) {
      pickerEls.meaning.textContent = f && f.meaning
        ? String(f.meaning).replace(/[.\s]+$/, '')
        : '';
    }
  }

  function rerollFlower() {
    setPreview(randomKey(pickerState.key));
  }

  function buildPicker() {
    picker = document.createElement('div');
    picker.className = 'garden-picker garden-picker--plant';
    picker.id = 'garden-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-label', 'Посадить цветок');
    picker.innerHTML = [
      '<div class="garden-picker__backdrop" data-close></div>',
      '<div class="garden-picker__panel">',
      '  <div class="garden-picker__head">',
      '    <h2 class="garden-picker__title">Посадить цветок</h2>',
      '    <button type="button" class="garden-picker__close" data-close aria-label="Закрыть">×</button>',
      '  </div>',
      '  <div class="garden-picker__body">',
      '    <div class="garden-plant__preview">',
      '      <img class="garden-plant__img" data-preview alt="">',
      '    </div>',
      '    <div class="garden-plant__name" data-name></div>',
      '    <p class="garden-plant__meaning" data-meaning></p>',
      '    <button type="button" class="garden-plant__reroll" data-reroll>',
      '      <span class="garden-plant__reroll-mark" aria-hidden="true">↻</span>Сгенерировать другой',
      '    </button>',
      '    <label class="garden-picker__label" for="garden-plant-note">Послание Анастасии или гостям сайта (необязательно)</label>',
      '    <textarea id="garden-plant-note" class="garden-picker__note" data-note maxlength="' + NOTE_MAX + '" rows="2"></textarea>',
      '    <div class="garden-picker__count" data-note-count>0 / ' + NOTE_MAX + '</div>',
      '    <div class="garden-picker__hp"><label>Не заполняйте<input type="text" data-hp tabindex="-1" autocomplete="off"></label></div>',
      '    <div class="garden-picker__error" data-error></div>',
      '  </div>',
      '  <div class="garden-picker__footer">',
      '    <button type="button" class="garden-picker__submit" data-submit>Посадить цветок</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(picker);

    pickerEls.preview = picker.querySelector('[data-preview]');
    pickerEls.name = picker.querySelector('[data-name]');
    pickerEls.meaning = picker.querySelector('[data-meaning]');
    pickerEls.note = picker.querySelector('[data-note]');
    pickerEls.noteCount = picker.querySelector('[data-note-count]');
    pickerEls.hp = picker.querySelector('[data-hp]');
    pickerEls.error = picker.querySelector('[data-error]');
    pickerEls.submit = picker.querySelector('[data-submit]');

    picker.querySelector('[data-reroll]').addEventListener('click', rerollFlower);
    pickerEls.note.addEventListener('input', function () {
      pickerEls.noteCount.textContent = pickerEls.note.value.length + ' / ' + NOTE_MAX;
    });
    picker.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closePicker);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !picker.hidden) closePicker();
    });
    pickerEls.submit.addEventListener('click', submitPlant);

    // Радиальный ховер «от точки входа курсора» — как у кнопок сайта
    // (см. layout-chrome.js для .garden__cta и т.п.).
    pickerEls.submit.addEventListener('pointerenter', function (e) {
      var r = pickerEls.submit.getBoundingClientRect();
      pickerEls.submit.style.setProperty('--hover-x', (e.clientX - r.left) + 'px');
      pickerEls.submit.style.setProperty('--hover-y', (e.clientY - r.top) + 'px');
    });
    pickerEls.submit.addEventListener('focus', function () {
      pickerEls.submit.style.setProperty('--hover-x', '50%');
      pickerEls.submit.style.setProperty('--hover-y', '50%');
    });
  }

  var lastFocus = null;
  function openPicker() {
    if (!catalog) return;
    if (!picker) buildPicker();
    lastFocus = document.activeElement;
    pickerEls.note.value = '';
    pickerEls.noteCount.textContent = '0 / ' + NOTE_MAX;
    pickerEls.error.textContent = '';
    pickerEls.submit.disabled = false;
    pickerEls.submit.textContent = 'Посадить цветок';
    setPreview(randomKey());
    picker.hidden = false;
    lockScroll();
    var closeBtn = picker.querySelector('.garden-picker__close');
    if (closeBtn) closeBtn.focus();
  }

  function closePicker() {
    closeModal(picker, function () {
      unlockScroll();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
  }

  function markPlanted() {
    canPlant = false;
    if (!plantBtn) return;
    plantBtn.textContent = 'Ваш цветок растёт 🌱';
    plantBtn.classList.add('garden__cta--planted');
    plantBtn.disabled = true;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'garden-pop';
    t.style.left = '50%';
    t.style.top = '16px';
    t.style.transform = 'translateX(-50%)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function submitPlant() {
    if (!pickerState.key) return;
    if (pickerEls.hp.value) { closePicker(); return; } // honeypot
    pickerEls.submit.disabled = true;
    pickerEls.submit.textContent = 'Сажаем…';
    pickerEls.error.textContent = '';

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: pickerState.key,
        variant: '1',
        tilt: 0,
        note: pickerEls.note.value,
        website: ''
      })
    }).then(function (res) {
      return res.json().then(function (data) { return { status: res.status, data: data }; });
    }).then(function (r) {
      if (r.status === 201 && r.data.flower) {
        flowers.unshift(r.data.flower);
        plantedCount = r.data.planted || plantedCount + 1;
        if (plantedEl) plantedEl.textContent = String(plantedCount);
        closePicker();
        layout();
        if (!r.data.unlimited) {          // обычный режим — 1 цветок с IP
          try { localStorage.setItem(LS_KEY, String(r.data.flower.id)); } catch (e) {}
          markPlanted();
        }
        return;
      }
      if (r.status === 409) { markPlanted(); closePicker(); toast('Вы уже посадили цветок'); return; }
      if (r.status === 429) { pickerEls.error.textContent = 'Сейчас слишком много посадок, попробуйте позже.'; }
      else if (r.status === 422) { pickerEls.error.textContent = 'Не получилось. Попробуйте другой цветок.'; }
      else { pickerEls.error.textContent = 'Не удалось посадить. Попробуйте позже.'; }
      pickerEls.submit.disabled = false;
      pickerEls.submit.textContent = 'Посадить цветок';
    }).catch(function () {
      pickerEls.error.textContent = 'Нет связи с сервером. Попробуйте позже.';
      pickerEls.submit.disabled = false;
      pickerEls.submit.textContent = 'Посадить цветок';
    });
  }

  if (plantBtn) plantBtn.addEventListener('click', openPicker);

  /* ---------- init ---------- */

  // На десктопе плашка футера живёт в правом верхнем углу (footer.css) —
  // сдвигаем ряд соцсетей левее неё, чтобы не наезжали. На моб/планшете
  // футер снизу → offset 0.
  function measureSocialsOffset() {
    var footer = document.querySelector('.site-footer');
    var off = 0;
    if (footer) {
      var fr = footer.getBoundingClientRect();
      if (fr.width && fr.top < 140 && fr.right > window.innerWidth - 260) {
        off = Math.ceil(fr.width + 12);
      }
    }
    root.style.setProperty('--gd-socials-offset', off + 'px');
  }

  var debounceT;
  window.addEventListener('resize', function () {
    clearTimeout(debounceT);
    debounceT = setTimeout(function () { measureSocialsOffset(); layout(); }, 150);
  });
  measureSocialsOffset();
  setTimeout(measureSocialsOffset, 400); // после того как layout-chrome.js разложит футер
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureSocialsOffset(); layout(); });

  function setCounters() {
    if (plantedEl) plantedEl.textContent = String(plantedCount);
    if (counterEl) counterEl.removeAttribute('data-loading');
  }

  Promise.all([
    fetch(CATALOG_URL).then(function (r) { return r.json(); }),
    fetch(API).then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch(ZONES_URL).then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (out) {
    catalog = out[0];
    zones = out[2];
    (catalog.flowers || []).forEach(function (f) { catByKey[f.key] = f; });

    var data = out[1];
    if (data && data.flowers) {
      flowers = data.flowers.slice().sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      plantedCount = data.planted || flowers.length;
      canPlant = !!data.canPlant;
    } else {
      if (bloomingEl) bloomingEl.textContent = '—';
      plantedCount = 0;
    }
    setCounters();

    if (!(data && data.unlimited)) {
      var savedId = null;
      try { savedId = localStorage.getItem(LS_KEY); } catch (e) {}
      if (!canPlant || savedId) markPlanted();
    }

    layout();
    whenFlowersLoaded();
  }).catch(function () {
    if (counterEl) counterEl.removeAttribute('data-loading');
    if (bloomingEl) bloomingEl.textContent = '—';
    if (plantedEl) plantedEl.textContent = '—';
    gardenReadyDone();
  });
})();
