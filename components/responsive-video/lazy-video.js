/* Attach media only near the viewport; play muted loops only while visible. */
(function () {
  'use strict';
  var videos = Array.from(document.querySelectorAll('video[data-lazy-video]'));
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function poster(video) {
    if (video.hasAttribute('data-poster')) video.poster = video.getAttribute('data-poster');
  }
  function load(video, still) {
    if (video.hasAttribute('data-video-attached')) return;
    video.setAttribute('data-video-attached', '');
    poster(video);
    [video].concat(Array.from(video.querySelectorAll('source[data-src]'))).forEach(function (node) {
      if (node.hasAttribute('data-src')) node.setAttribute('src', node.getAttribute('data-src'));
    });
    video.muted = true;
    video.preload = still ? 'metadata' : 'auto';
    video.load();
  }
  function sync(video) {
    if (video.hasAttribute('data-video-visible')) poster(video);
    if (!video.hasAttribute('data-video-visible') || reduced.matches || document.hidden) {
      // Clips without a poster still expose their first frame in reduced motion.
      if (video.hasAttribute('data-video-visible') && reduced.matches && !video.poster) load(video, true);
      video.pause();
      return;
    }
    load(video);
    var playing = video.play();
    if (playing) playing.catch(function () { /* The poster remains visible if autoplay is unavailable. */ });
  }
  function syncAll() { videos.forEach(sync); }
  if (!('IntersectionObserver' in window)) {
    videos.forEach(function (video) { load(video); video.setAttribute('data-video-visible', ''); });
    syncAll();
  } else {
    var ahead = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          poster(entry.target);
          if (!reduced.matches) { load(entry.target); ahead.unobserve(entry.target); }
        }
      });
    }, { rootMargin: '50% 0px' });
    var visible = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.toggleAttribute('data-video-visible', entry.isIntersecting);
        sync(entry.target);
      });
    });
    videos.forEach(function (video) { ahead.observe(video); visible.observe(video); });
  }
  reduced.addEventListener('change', syncAll);
  document.addEventListener('visibilitychange', syncAll);
})();
