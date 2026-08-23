/*
  Hero-баннер — градиентный фон (чистый CSS, см. hero.css) + анимация
  персонажа: влёт с бриллиантом и облаками при появлении баннера,
  бесконечное лёгкое парение, и разлёт/угасание при скролле вниз.

  Без GSAP (CDN недоступен/заблокирован) или при prefers-reduced-motion —
  секция получает класс .is-static, который CSS переводит сразу в
  конечное состояние (см. .hero.is-static в hero.css) — деградирует
  прилично, ничего не остаётся невидимым/сдвинутым.
*/
(function () {
  // Клик по кнопке "Смотреть работы" — обычный smooth-scroll, БЕЗ
  // прописывания #works-gallery в адресную строку: с хешем в URL
  // каждая следующая перезагрузка страницы сама прыгала бы сразу к
  // галерее вместо hero. Не зависит от GSAP.
  var cta = document.querySelector('.hero__cta');
  var worksGallery = document.getElementById('works-gallery');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cta && worksGallery) {
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      worksGallery.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  var hero = document.getElementById('hero');
  if (!hero) return;

  var figure = hero.querySelector('.hero__figure');
  var brilliant = hero.querySelector('.hero__brilliant');
  var clouds = hero.querySelectorAll('.hero__cloud');
  var title = hero.querySelector('.hero__title');
  var foot = hero.querySelector('.hero__foot');

  if (typeof gsap === 'undefined' || reduceMotion || !figure) {
    hero.classList.add('is-static');
    return;
  }

  var isDesktop = window.matchMedia('(min-width: 900px)').matches;

  // ---- Влёт при появлении баннера ----------------------------------
  // Сам #loading-screen (чашка кофе, см. loading.js) держит страницу
  // прикрытой до 9с на медленной сети/тяжёлой above-fold галерее —
  // если запустить влёт сразу по загрузке hero.js, он на такой сети
  // успевает доиграть и осесть В ФОНЕ, под заглушкой, и пользователь
  // увидит только уже неподвижный финал, а не сам влёт. Поэтому старт
  // ждёт исчезновения заглушки (или запускается сразу, если её уже нет/
  // не будет — см. runEntrance ниже).
  function runEntrance() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to(figure, { opacity: 1, x: 0, rotate: 0, duration: 1.1 }, 0.15)
      .to(
        brilliant,
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' },
        0.75
      )
      .fromTo(
        clouds,
        { scale: 0.7 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1.4,
          ease: 'back.out(1.15)',
          // from: 'edges' — крайние по разметке (левые/правые) облака
          // трогаются первыми и съезжаются к центру, а не просто по
          // очереди слева направо — читается динамичнее.
          stagger: { each: 0.12, from: 'edges' },
        },
        0
      );

    // x у каждого облака берётся из CSS (transform: translateX(±Nvw) —
    // своя сторона на каждом брейкпоинте, см. hero.css) — здесь ничего
    // не переопределяем, иначе на десктопе, где те же классы стоят по
    // другую сторону, облако выезжало бы не с той стороны экрана.

    // ---- Парение (бесконечный лёгкий дрейф) -------------------------
    // delay у каждого тюина подогнан под момент, когда элемент уже
    // виден (см. тайминги влёта выше) — так первый цикл парения не
    // тратится впустую, пока фигура/бриллиант ещё в процессе появления.
    gsap.to(figure, {
      y: -14,
      rotate: 1.2,
      duration: 2.6,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.25,
    });
    gsap.to(brilliant, {
      y: -6,
      rotate: -6,
      duration: 2.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.35,
    });

    clouds.forEach(function (cloud, i) {
      gsap.to(cloud, {
        y: i % 2 ? -10 : 10,
        duration: 4 + i * 0.4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: 1.2,
      });
    });
  }

  var loadingScreen = document.getElementById('loading-screen');
  if (!loadingScreen || loadingScreen.hidden || loadingScreen.classList.contains('is-hidden')) {
    runEntrance();
  } else {
    var loadingObserver = new MutationObserver(function () {
      if (loadingScreen.hidden || loadingScreen.classList.contains('is-hidden')) {
        loadingObserver.disconnect();
        runEntrance();
      }
    });
    loadingObserver.observe(loadingScreen, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  // ---- Разлёт при скролле вниз ---------------------------------------
  // Прогресс 0..1 по первым 70% высоты секции: полностью прочитан текст
  // и картинка уже улетели к моменту, когда баннер уходит из вьюпорта.
  var exitState = { p: 0 };
  var exitTween = gsap.quickTo(exitState, 'p', { duration: 0.25, ease: 'power1.out' });

  function applyExit(p) {
    gsap.set(figure, { x: -140 * p, opacity: 1 - p });
    gsap.set(title, { y: -18 * p, opacity: 1 - p });
    if (isDesktop) {
      gsap.set(foot, { opacity: 1 - p });
    } else {
      gsap.set(foot, { y: -50 * p, opacity: 1 - p });
    }
  }

  function onScroll() {
    var rect = hero.getBoundingClientRect();
    var travel = rect.height * 0.7 || 1;
    var p = Math.min(Math.max(-rect.top / travel, 0), 1);
    exitTween(p);
  }

  gsap.ticker.add(function () {
    applyExit(exitState.p);
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    isDesktop = window.matchMedia('(min-width: 900px)').matches;
    onScroll();
  });
  onScroll();
})();
