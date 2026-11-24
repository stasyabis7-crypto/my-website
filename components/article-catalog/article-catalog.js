/* Russian readers see all editions; English readers see English articles. */
(function () {
  var list = document.querySelector('.articles-grid');
  if (!list) return;
  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  var locale = window.siteLanguage ? window.siteLanguage.current : 'ru';
  var articles = window.portfolioArticles.map(function (article) {
    var edition = article.editions && article.editions[locale];
    return edition ? Object.assign({}, article, { href: edition, language: locale }) : article;
  }).filter(function (article) {
    return locale === 'ru' || article.language === 'en';
  });
  list.innerHTML = articles.map(function (article) {
    var language = article.language === 'en' ? 'English' : 'Russian';
    var media = '<img src="' + escape(article.image) + '" width="' + article.width + '" height="' + article.height + '" alt="" loading="lazy" decoding="async" />';
    return '<li class="article-tile"><div class="article-tile__media" data-action-hover>' + media +
      '<a class="article-tile__action btn btn--fill-glass-round btn--icon-only btn--hit-area btn--icon-diagonal-motion" href="' + escape(article.href) + '" hreflang="' + article.language + '" target="_blank" rel="noopener noreferrer" aria-label="Read article in ' + language + ': ' + escape(article.title) + '"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a></div><h3 class="article-tile__title text-body">' + escape(article.title) + '</h3></li>';
  }).join('');
})();
