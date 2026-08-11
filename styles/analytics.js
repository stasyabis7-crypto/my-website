(function () {
  'use strict';

  var config = window.SITE_ANALYTICS || {};
  var googleId = String(config.googleMeasurementId || '').trim();
  var yandexId = Number.parseInt(config.yandexMetricaId, 10);
  var googleEnabled = /^G-[A-Z0-9]+$/i.test(googleId);
  var yandexEnabled = Number.isInteger(yandexId) && yandexId > 0;

  if (!googleEnabled && !yandexEnabled) {
    if (config.debug) console.info('[analytics] Add counter IDs in styles/analytics-config.js');
    return;
  }

  function loadScript(src, id) {
    if (id && document.getElementById(id)) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = src;
    if (id) script.id = id;
    document.head.appendChild(script);
  }

  if (googleEnabled) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', googleId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(googleId), 'google-analytics');
  }

  if (yandexEnabled) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      k.id = 'yandex-metrica';
      a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

    window.ym(yandexId, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: config.webvisor !== false
    });
  }

  function cleanParams(params) {
    var result = {};
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== '') result[key] = value;
    });
    return result;
  }

  function track(name, params) {
    var details = cleanParams(params);
    if (googleEnabled) window.gtag('event', name, details);
    if (yandexEnabled) window.ym(yandexId, 'reachGoal', name, details);
    if (config.debug) console.info('[analytics]', name, details);
  }

  window.siteAnalytics = { track: track };

  function textOf(element) {
    return (element.getAttribute('aria-label') || element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    var button = event.target.closest('button');

    if (link) {
      var href = link.href;
      var label = textOf(link);
      var url;
      try { url = new URL(href, window.location.href); } catch (_) { return; }

      if (link.classList.contains('site-header__cta')) {
        track('resume_open', { link_url: href, link_text: label });
      } else if (url.hostname === 't.me') {
        track('telegram_open', { link_url: href, link_text: label });
      } else if (link.classList.contains('hero__cta')) {
        track('works_cta_click', { link_text: label });
      } else if (url.origin !== window.location.origin && /^https?:$/.test(url.protocol)) {
        track('outbound_click', { link_url: href, link_domain: url.hostname, link_text: label });
      }
    }

    if (button && button.classList.contains('site-footer__top-btn')) {
      track('scroll_to_top', { button_location: button.id.indexOf('desktop') > -1 ? 'desktop' : 'mobile' });
    }
  });

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('change', function () {
      track('theme_change', { theme: themeToggle.checked ? 'light' : 'dark' });
    });
  }

  var seenProjects = new Set();
  var projectObserver = 'IntersectionObserver' in window && new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
      var project = entry.target;
      var slot = project.dataset.slot;
      if (seenProjects.has(slot)) return;
      seenProjects.add(slot);
      track('project_impression', {
        project_slot: Number(slot),
        project_name: project.dataset.title
      });
      projectObserver.unobserve(project);
    });
  }, { threshold: 0.5 });

  if (projectObserver) {
    document.querySelectorAll('.works-grid__item[data-slot]').forEach(function (project) {
      projectObserver.observe(project);
    });
  }

  var reachedDepths = new Set();
  var depthMarks = [25, 50, 75, 90];
  var ticking = false;
  function measureScrollDepth() {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    var depth = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 100;
    depthMarks.forEach(function (mark) {
      if (depth >= mark && !reachedDepths.has(mark)) {
        reachedDepths.add(mark);
        track('scroll_depth', { percent_scrolled: mark });
      }
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(measureScrollDepth);
    }
  }, { passive: true });

  window.setTimeout(function () {
    if (document.visibilityState === 'visible') track('engaged_30_seconds');
  }, 30000);
})();
