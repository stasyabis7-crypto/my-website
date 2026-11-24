/* RU/EN text, shared English media, and language-aware navigation. */
(function () {
  'use strict';
  var url = new URL(location.href);
  var requested = url.searchParams.get('lang');
  var stored;
  try { stored = localStorage.getItem('portfolio-language'); } catch (error) { /* Storage may be disabled. */ }
  var lang = /^(ru|en)$/.test(requested) ? requested : /^(ru|en)$/.test(stored) ? stored : 'en';
  try { localStorage.setItem('portfolio-language', lang); } catch (error) { /* URL still carries the selection. */ }
  document.documentElement.lang = lang;
  if (/^\/projects\/posts\//.test(url.pathname)) {
    location.replace('/?lang=' + lang);
    return;
  }
  var english = window.siteEnglish || { phrases: {}, pages: {}, projects: {} };
  var russian = window.siteRussian || { phrases: {}, pages: {} };
  var editorial = window.siteEditorialCopy || {};
  var page = url.pathname.replace(/index\.html$/, '');
  var englishCopy = Object.assign({}, english.phrases, english.pages[page] || {});
  var copy = {};
  if (lang === 'en') Object.assign(copy, englishCopy);
  else {
    Object.keys(englishCopy).forEach(function (key) { copy[englishCopy[key]] = key; });
    Object.assign(copy, russian.phrases, (russian.pages || {})[page] || {});
  }
  function editorialText(key) { return editorial[key] && editorial[key][lang]; }
  var menuLabels = editorialText('main page:2');
  if (menuLabels) {
    menuLabels = menuLabels.split(',').map(function (label) { return label.trim(); });
    copy['Статьи'] = menuLabels[0]; copy.Playground = menuLabels[1]; copy['Связаться'] = menuLabels[2];
  }
  copy['CV PDF'] = editorialText('main page:3') || (lang === 'en' ? 'CV PDF' : 'Резюме PDF');
  if (page === '/') {
    copy['Продуктовый дизайнер с опытом 6 лет'] = editorialText('main page:4');
    copy['Смотреть работы'] = editorialText('main page:6');
    var subtitle = editorialText('main page:5');
    if (subtitle) {
      var split = lang === 'en' ? subtitle.indexOf(' undoubtedly') : subtitle.indexOf(' безусловно');
      if (split < 0) split = subtitle.lastIndexOf(' ', Math.ceil(subtitle.length / 2));
      if (split < 0) split = subtitle.length;
      copy['Верю в то, что дизайн, который нас окружает,'] = subtitle.slice(0, split);
      copy['безусловно, отражает качество нашей жизни'] = subtitle.slice(split).trim();
    }
  }
  function copyKey(value) { return value.replace(/[\u00a0\u202f]/g, ' ').replace(/\u2060/g, ''); }
  Object.keys(copy).forEach(function (key) { copy[copyKey(key)] = copy[key]; });
  var assets = window.siteLanguageMedia || {};
  var resumes = {
    en: '/cv-en.pdf',
    ru: '/cv.pdf'
  };
  function t(value) {
    var translated = translateText(value);
    // Typography also observes text changes. Preserve its NBSP/WORD JOINER
    // formatting when the text is already in the selected language.
    return copyKey(translated) === copyKey(value) ? value : translated;
  }
  function translateText(value) {
    var trimmed = value.trim();
    var key = copyKey(trimmed);
    if (copy[key]) return value.replace(trimmed, copy[key]);
    var counter = key.match(/^(\d+)\s+(?:из|of)\s+(\d+)$/);
    if (counter) return counter[1] + (lang === 'en' ? ' of ' : ' из ') + counter[2];
    var match;
    if (lang === 'ru') {
      match = key.match(/^Read article in (English|Russian): (.+)$/);
      if (match) return 'Читать статью на ' + (match[1] === 'English' ? 'английском' : 'русском') + ': ' + t(match[2]);
      match = key.match(/^Article language: (English|Russian)$/);
      if (match) return 'Язык статьи: ' + (match[1] === 'English' ? 'английский' : 'русский');
      match = key.match(/^Open case study: (.+)$/);
      if (match) return 'Открыть кейс «' + t(match[1]) + '»';
      return value;
    }
    match = key.match(/^Открыть (фото|видео) (\d+) из (\d+) на весь экран$/);
    if (match) return 'Open ' + (match[1] === 'фото' ? 'image ' : 'video ') + match[2] + ' of ' + match[3] + ' in full screen';
    match = key.match(/^Фото (\d+) из (\d+)$/);
    if (match) return 'Image ' + match[1] + ' of ' + match[2];
    match = key.match(/^(.+), (\d+) из (\d+)\. Следующая карточка команды$/);
    if (match) return t(match[1]) + ', ' + match[2] + ' of ' + match[3] + '. Next team card';
    match = key.match(/^Открыть кейс «(.+)»$/);
    if (match) return 'Open case study: ' + t(match[1]);
    return value.replace(/^Открыть статью: /, 'Read article: ').replace(/^Открыть /, 'Open ')
      .replace(/Следующая карточка команды/g, 'Next team card').replace(/, (\d+) из (\d+)/g, ', $1 of $2');
  }
  function localURL(value) {
    var target = new URL(value, location.href);
    if (target.origin !== location.origin) return value;
    if (/^\/cv(?:-en)?\.pdf$/.test(target.pathname)) return resumes[lang];
    if (!/\/$|\.html$/.test(target.pathname)) return value;
    target.searchParams.set('lang', lang);
    return target.pathname + target.search + target.hash;
  }
  function mediaURL(value) {
    var target = new URL(value, location.href);
    if (target.origin !== location.origin) return value;
    var slot = assets[target.pathname];
    return slot && slot.en && slot.en !== target.pathname ? slot.en : value;
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
      if (node.parentElement && !node.parentElement.closest('script, style, noscript, [data-language-literal], [data-copy]')) {
        var translated = t(node.nodeValue);
        if (translated !== node.nodeValue) node.nodeValue = translated;
      }
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.tagName)) return;
    if (node.hasAttribute('data-copy')) {
      var edited = editorialText(node.getAttribute('data-copy'));
      if (edited && node.textContent !== edited) node.textContent = edited;
    }
    if (node.hasAttribute('data-language-content')) {
      if (node.getAttribute('data-language-content') === lang) node.removeAttribute('hidden');
      else node.setAttribute('hidden', '');
    }
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
    if (node.tagName === 'A' && node.hasAttribute('href') && !node.getAttribute('href').startsWith('#')) {
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
        node.pause(); node.removeAttribute('src'); node.removeAttribute('data-src'); node.load(); node.replaceWith(still);
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
  var projectRows = { 'customer-segments': 7, 'recycle-map': 8, 'kind-subscription': 9, 'about-company': 10,
    'watches-patches': 11, 'patient-app': 12, 'minimum-price': 13, 'charity-profile': 14, 'wild-animal-help': 15,
    'anti-bullying': 16, 'doctor-dashboard': 17, 'employee-account': 18 };
  window.siteLanguage = {
    current: lang, t: t, url: localURL, media: mediaURL, mediaPair: mediaPair, resume: resumes[lang], editorial: editorialText,
    switchTo: function (next) {
      if (!/^(ru|en)$/.test(next) || next === lang) return;
      try { localStorage.setItem('portfolio-language', next); } catch (error) { /* Keep the URL usable. */ }
      var target = new URL(location.href);
      target.searchParams.set('lang', next);
      location.assign(target.pathname + target.search + target.hash);
    },
    project: function (project) {
      var localized = Object.assign({}, project, lang === 'en' ? english.projects[project.id] || {} : {});
      localized.title = editorialText('main page:' + projectRows[project.id]) || t(localized.title);
      localized.alt = t(localized.alt || '');
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
  document.addEventListener('DOMContentLoaded', function () { translate(document.documentElement); });
})();
