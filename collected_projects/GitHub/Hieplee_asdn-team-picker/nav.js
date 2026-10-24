(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('#section-nav a'));
  function targetOf(a) { return document.getElementById(a.dataset.target); }
  function visible(el) { return el && el.offsetParent !== null; }
  function update() {
    var current = null;
    links.forEach(function (a) {
      var el = targetOf(a);
      var show = visible(el);
      // Chỉ ghi khi giá trị đổi: ghi lại cùng giá trị vẫn sinh mutation record → observer gọi lại update() vô hạn.
      if (a.hidden === show) a.hidden = !show;
      if (show && el.getBoundingClientRect().top <= 140) current = a;
    });
    links.forEach(function (a) {
      var on = a === current;
      if (a.classList.contains('active') !== on) a.classList.toggle('active', on);
    });
  }
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  new MutationObserver(update).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden', 'class'] });
  update();
})();
