(function () {
  var videos = document.querySelectorAll('.works-grid__video');
  var visible = new WeakSet();

  function sync(video) {
    if (visible.has(video) && !document.hidden && video.getAttribute('src')) {
      video.play().catch(function () {});
    } else {
      video.pause();
    }
  }

  function load(video) {
    if (!video.dataset.src) return;
    video.src = video.dataset.src;
    delete video.dataset.src;
    video.load();
    sync(video);
  }

  if (typeof IntersectionObserver === 'undefined') return;

  // Fetch shortly before the card enters the viewport; play only while visible.
  var loadObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      load(entry.target);
      loadObserver.unobserve(entry.target);
    });
  }, { rootMargin: '300px 0px' });

  var playObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
      sync(entry.target);
    });
  }, { rootMargin: '0px', threshold: 0 });

  videos.forEach(function (video) {
    video.muted = true;
    loadObserver.observe(video);
    playObserver.observe(video);
  });

  document.addEventListener('visibilitychange', function () {
    videos.forEach(sync);
  });
})();
