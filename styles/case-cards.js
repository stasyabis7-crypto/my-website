/*
  Карточки кейсов:
  - Появление при скролле ([data-reveal], см. case-cards.css).
  - Бесконечная горизонтальная карусель (.case-carousel--x): клонирует
    реальный набор карточек до и после, на границе незаметно
    перематывает scrollLeft на ширину одного набора — обычный приём
    "infinite loop carousel", поэтому по бокам никогда нет пустого места.
  - Счётчик "N из M" (.case-carousel__counter) — у каждой карточки,
    включая клоны, проставлен её настоящий номер (data-slide-index),
    IntersectionObserver читает номер видимой карточки, поэтому при
    зацикливании счётчик просто возвращается к 1.
*/
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduced) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.case-card[data-reveal]').forEach(function (el) {
      revealIO.observe(el);
    });
  }

  document.querySelectorAll('.case-carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.case-carousel__track');
    var counterEl = carousel.querySelector('.case-carousel__counter');
    if (!track) return;

    var originals = Array.prototype.slice.call(track.children);
    var count = originals.length;
    if (!count) return;

    originals.forEach(function (el, i) {
      el.setAttribute('data-slide-index', String(i + 1));
    });

    function cloneSet(hidden) {
      return originals.map(function (el) {
        var clone = el.cloneNode(true);
        clone.removeAttribute('data-reveal');
        clone.classList.remove('is-visible');
        if (hidden) clone.setAttribute('aria-hidden', 'true');
        return clone;
      });
    }

    var beforeClones = cloneSet(true);
    var afterClones = cloneSet(true);

    var beforeFrag = document.createDocumentFragment();
    beforeClones.forEach(function (el) { beforeFrag.appendChild(el); });
    track.insertBefore(beforeFrag, track.firstChild);

    var afterFrag = document.createDocumentFragment();
    afterClones.forEach(function (el) { afterFrag.appendChild(el); });
    track.appendChild(afterFrag);

    function edgeOffset(el) {
      return el.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    }

    // Старт — на первой "настоящей" карточке, как будто цикла нет.
    track.scrollLeft = edgeOffset(originals[0]);

    var settleTimer;
    function handleSettled() {
      var realStart = edgeOffset(originals[0]);
      var afterStart = edgeOffset(afterClones[0]);
      var setWidth = afterStart - realStart;
      if (!setWidth) return;
      if (track.scrollLeft < realStart - 1) {
        track.scrollLeft += setWidth;
      } else if (track.scrollLeft >= afterStart - 1) {
        track.scrollLeft -= setWidth;
      }
    }

    track.addEventListener('scroll', function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(handleSettled, 120);
    }, { passive: true });

    if (counterEl && 'IntersectionObserver' in window) {
      counterEl.textContent = '1 из ' + count;
      var allCards = Array.prototype.slice.call(track.children);
      var cardIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          var idx = entry.target.getAttribute('data-slide-index');
          if (idx) counterEl.textContent = idx + ' из ' + count;
        });
      }, { root: track, threshold: [0.6] });
      allCards.forEach(function (card) { cardIO.observe(card); });
    }
  });
})();
