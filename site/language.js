/* Shared RU/EN routing, copy and media. Source HTML always remains Russian. */
(function () {
  'use strict';
  var url = new URL(location.href);
  var requested = url.searchParams.get('lang');
  var saved;
  try { saved = localStorage.getItem('portfolio-language'); } catch (_) {}
  var lang = /^(ru|en)$/.test(requested) ? requested : saved === 'en' ? 'en' : 'ru';
  document.documentElement.lang = lang;
  try { localStorage.setItem('portfolio-language', lang); } catch (_) {}
  if (lang === 'en' && /^\/projects\/posts\//.test(url.pathname)) {
    location.replace('/?lang=en');
    return;
  }
  var english = window.siteEnglish || { phrases: {}, pages: {}, projects: {} };
  var page = url.pathname.replace(/index\.html$/, '');
  var copy = Object.assign({}, english.phrases, english.pages[page] || {});
  Object.keys(copy).forEach(function (key) { copy[key.replace(/[\u00a0\u202f]/g, ' ')] = copy[key]; });
  var assets = window.siteLanguageMedia || {};
  function t(value) {
    if (lang !== 'en') return value;
    var trimmed = value.trim();
    var key = trimmed.replace(/[\u00a0\u202f]/g, ' ');
    if (copy[key]) return value.replace(trimmed, copy[key]);
    var counter = key.match(/^(\d+)\s+из\s+(\d+)$/);
    if (counter) return counter[1] + ' of ' + counter[2];
    var match = key.match(/^Открыть (фото|видео) (\d+) из (\d+) на весь экран$/);
    if (match) return 'Open ' + (match[1] === 'фото' ? 'image ' : 'video ') + match[2] + ' of ' + match[3] + ' in full screen';
    match = key.match(/^Фото (\d+) из (\d+)$/);
    if (match) return 'Image ' + match[1] + ' of ' + match[2];
    match = key.match(/^(.+), (\d+) из (\d+)\. Следующая карточка команды$/);
    if (match) return t(match[1]) + ', ' + match[2] + ' of ' + match[3] + '. Next team card';
    match = key.match(/^Открыть кейс «(.+)»$/);
    if (match) return 'Open case study: ' + t(match[1]);
    return value.replace(/^Открыть кейс «(.+)»$/, 'Open case study: $1')
      .replace(/^Открыть статью: /, 'Read article: ')
      .replace(/^Открыть /, 'Open ')
      .replace(/Следующая карточка команды/g, 'Next team card')
      .replace(/, (\d+) из (\d+)/g, ', $1 of $2');
  }
  function localURL(value) {
    var target = new URL(value, location.href);
    if (target.origin !== location.origin || !/\/$|\.html$/.test(target.pathname)) return value;
    target.searchParams.set('lang', lang);
    return target.pathname + target.search + target.hash;
  }
  function mediaURL(value) {
    var target = new URL(value, location.href);
    if (target.origin !== location.origin) return value;
    var slot = assets[target.pathname];
    return slot && slot[lang] && slot[lang] !== target.pathname ? slot[lang] : value;
  }
  function mediaPair(source) {
    var localized = Object.assign({}, source, { image: mediaURL(source.image) });
    if (source.video) {
      localized.video = mediaURL(source.video);
      if (localized.image !== source.image && localized.video === source.video) delete localized.video;
    }
    return localized;
  }
  function translate(node) {
    if (node.nodeType === 3) {
      if (node.parentElement && !node.parentElement.closest('script, style, noscript, [data-language-literal]')) {
        var translated = t(node.nodeValue);
        if (translated !== node.nodeValue) node.nodeValue = translated;
      }
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.tagName)) return;
    ['alt', 'aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'placeholder'].forEach(function (attr) {
      if (node.hasAttribute(attr)) {
        var value = node.getAttribute(attr), translated = t(value);
        if (value !== translated) node.setAttribute(attr, translated);
      }
    });
    if (node.tagName === 'META' && node.hasAttribute('content')) {
      var content = node.getAttribute('content'), translatedContent = t(content);
      if (content !== translatedContent) node.setAttribute('content', translatedContent);
    }
    if (node.tagName === 'A' && !node.hasAttribute('data-language-switch') && node.hasAttribute('href') && !node.getAttribute('href').startsWith('#')) {
      var href = node.getAttribute('href'), localized = localURL(href);
      if (href !== localized) node.setAttribute('href', localized);
    }
    if (node.tagName === 'VIDEO' && node.hasAttribute('poster')) {
      var originalPoster = node.getAttribute('poster');
      var videoSource = node.getAttribute('src') || node.getAttribute('data-src');
      if (mediaURL(originalPoster) !== originalPoster && (!videoSource || mediaURL(videoSource) === videoSource)) {
        var still = document.createElement('img');
        Array.from(node.attributes).forEach(function (attr) {
          if (!['src', 'data-src', 'poster', 'autoplay', 'loop', 'muted', 'playsinline', 'preload'].includes(attr.name)) still.setAttribute(attr.name, attr.value);
        });
        still.src = mediaURL(originalPoster);
        still.alt = t(node.getAttribute('aria-label') || '');
        node.pause();
        node.removeAttribute('src');
        node.removeAttribute('data-src');
        node.load();
        node.replaceWith(still);
        return;
      }
    }
    if (/^(IMG|VIDEO|SOURCE)$/.test(node.tagName)) {
      ['src', 'poster', 'data-src'].forEach(function (attr) {
        if (!node.hasAttribute(attr)) return;
        var source = node.getAttribute(attr), localized = mediaURL(source);
        if (source !== localized) node.setAttribute(attr, localized);
      });
      if (node.hasAttribute('srcset')) {
        var set = node.getAttribute('srcset');
        var localizedSet = set.split(',').map(function (item) {
          var parts = item.trim().split(/\s+/); parts[0] = mediaURL(parts[0]); return parts.join(' ');
        }).join(', ');
        if (localizedSet !== set) node.setAttribute('srcset', localizedSet);
      }
    }
    Array.from(node.childNodes).forEach(translate);
  }
  window.siteLanguage = {
    current: lang, t: t, url: localURL, media: mediaURL, mediaPair: mediaPair,
    project: function (project) {
      var localized = Object.assign({}, project, lang === 'en' ? english.projects[project.id] || {} : {});
      if (project.feed) localized.feed = mediaPair(project.feed);
      return localized;
    }
  };
  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === 'childList') record.addedNodes.forEach(translate);
      else translate(record.target);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['src', 'poster', 'data-src', 'srcset', 'href', 'alt', 'aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'content'] });
  translate(document.documentElement);
  document.addEventListener('DOMContentLoaded', function () {
    translate(document.documentElement);
    var wrap = document.getElementById('site-socials');
    if (!wrap) return;
    var next = lang === 'ru' ? 'en' : 'ru';
    var target = new URL(location.href);
    if (next === 'en' && /^\/projects\/posts\//.test(target.pathname)) target.pathname = '/';
    target.searchParams.set('lang', next);
    var switcher = document.createElement('a');
    switcher.className = 'site-language btn btn--fill-glass-ui btn--size-chrome';
    switcher.textContent = next.toUpperCase();
    switcher.setAttribute('data-language-literal', '');
    switcher.setAttribute('aria-label', next === 'en' ? 'Switch to English' : 'Переключить на русский');
    switcher.hreflang = next;
    switcher.href = target.pathname + target.search + target.hash;
    // Keep language links intact when all other internal links inherit the locale.
    switcher.setAttribute('data-language-switch', '');
    wrap.insertBefore(switcher, wrap.firstChild);
  });
})();
