/* Russian collection stays in HTML; English has its own publication list. */
(function () {
  if (!window.siteLanguage || window.siteLanguage.current !== 'en') return;
  var list = document.querySelector('.articles-grid');
  if (!list) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  list.innerHTML = window.portfolioEnglishArticles.map(function (article) {
    article = window.siteLanguage.mediaPair(article);
    var media = article.video && !reduced
      ? '<video src="' + escape(window.siteLanguage.media(article.video)) + '" poster="' + escape(window.siteLanguage.media(article.image)) + '" muted loop playsinline autoplay preload="metadata" aria-label="' + escape(article.title) + '"></video>'
      : '<img src="' + escape(window.siteLanguage.media(article.image)) + '" width="' + article.width + '" height="' + article.height + '" alt="' + escape(article.title) + '" loading="lazy" decoding="async" />';
    return '<li class="article-tile"><div class="article-tile__media' + (article.portrait ? ' article-tile__media--portrait' : article.crop ? ' article-tile__media--crop' : '') + '" data-action-hover>' + media +
      '<a class="article-tile__action btn btn--fill-glass-round btn--icon-only btn--hit-area btn--icon-diagonal-motion" href="' + escape(article.href) + '" target="_blank" rel="noopener noreferrer" aria-label="Read article: ' + escape(article.title) + '"><span class="icon icon--arrow-diagonal" aria-hidden="true"></span></a></div><h3 class="article-tile__title text-body">' + escape(article.title) + '</h3></li>';
  }).join('');
})();
