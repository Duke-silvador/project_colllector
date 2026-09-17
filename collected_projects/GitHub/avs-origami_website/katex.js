(function () {
  var katex = document.createElement('script');
  katex.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
  katex.defer = true;

  var autorender = document.createElement('script');
  autorender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
  autorender.defer = true;

  katex.onload = function () {
    document.head.appendChild(autorender);
  };

  autorender.onload = function () {
    renderMathInElement(document.body, {
      delimiters: [
        {left: '`$$', right: '$$`', display: true},
        {left: '`$', right: '$`', display: false},
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "code", "option"],
      throwOnError: false
    });
  };

  document.head.appendChild(katex);
})();
