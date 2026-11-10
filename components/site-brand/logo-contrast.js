/* Keep the signature readable even when it straddles a photo and the page. */
(function () {
  'use strict';
  var mark = document.querySelector('.site-header__logo-mark');
  if (!mark) return;
  var regions = Array.from(document.querySelectorAll('[data-logo-light-region], .mood-hero--video .mood-stage'));
  var scheduled = false;
  function update() {
    scheduled = false;
    var logo = mark.getBoundingClientRect();
    var clip = 'inset(0 100% 0 0)';
    for (var i = 0; i < regions.length; i++) {
      var area = regions[i].getBoundingClientRect();
      var left = Math.max(logo.left, area.left), right = Math.min(logo.right, area.right);
      var top = Math.max(logo.top, area.top), bottom = Math.min(logo.bottom, area.bottom);
      if (right <= left || bottom <= top) continue;
      var underneath = document.elementsFromPoint((left + right) / 2, (top + bottom) / 2).find(function (element) {
        return !element.closest('.site-header, .site-socials, .contact-dialog');
      });
      if (!underneath || !regions[i].contains(underneath)) continue;
      clip = 'inset(' + (top - logo.top) + 'px ' + (logo.right - right) + 'px ' + (logo.bottom - bottom) + 'px ' + (left - logo.left) + 'px)';
      break;
    }
    mark.style.setProperty('--logo-light-clip', clip);
    document.documentElement.setAttribute('data-logo-adaptive', '');
  }
  function queue() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  addEventListener('pageshow', queue);
  addEventListener('load', queue, { once: true });
  document.fonts.ready.then(queue);
  var observer = new ResizeObserver(queue);
  observer.observe(mark);
  regions.forEach(function (region) { observer.observe(region); });
  var header = document.querySelector('.site-header');
  if (header) header.addEventListener('transitionend', queue);
  update();
})();
