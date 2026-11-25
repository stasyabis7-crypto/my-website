/* Native <source media> selects the file; keep its poster and dimensions in
   sync and reselect the source when the viewport crosses a breakpoint. */
(function () {
  'use strict';
  document.querySelectorAll('video[data-responsive-video]').forEach(function (video) {
    var fallback = {
      poster: video.getAttribute('poster'),
      width: video.getAttribute('width'),
      height: video.getAttribute('height')
    };
    var sources = Array.from(video.querySelectorAll('source')).map(function (source) {
      return { node: source, query: source.media ? matchMedia(source.media) : null };
    });
    var active;
    function sync() {
      var selected = sources.find(function (source) { return !source.query || source.query.matches; });
      if (!selected || selected === active) return;
      ['poster', 'width', 'height'].forEach(function (name) {
        var value = selected.node.getAttribute('data-' + name) || fallback[name];
        if (value) video.setAttribute(name, value);
        else video.removeAttribute(name);
      });
      // Initial selection is native, so do not restart its pending request.
      if (active) video.load();
      active = selected;
    }
    sources.forEach(function (source) {
      if (source.query) source.query.addEventListener('change', sync);
    });
    sync();
  });
})();
