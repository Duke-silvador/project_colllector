window.MathJax = {
  tex: {
    inlineMath: [['`$', '$`']],
    displayMath: [['`$$', '$$`']],
    processEscapes: true
  },
  svg: {
    fontCache: 'global'
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'code'],
  }
};

(function () {
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
  script.defer = true;
  document.head.appendChild(script);
})();
