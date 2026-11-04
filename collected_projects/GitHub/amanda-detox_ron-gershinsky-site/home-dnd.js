/* Home page order (Ron 2026-10-31, menu 2026-11-03).
   Reorder starts only from the tile menu (להזיז): tiles wiggle, then drag to a new spot.
   A touch on a tile is claimed with touch-action (not a document listener) so the rest of the page still scrolls.
   Order is saved in localStorage "rg-home-order" and synced through RGAccount.syncPrefs when signed in.
   Signed out with no saved order: the default order. A saved order is kept (same storage). */
(function () {
  "use strict";
  var KEY = "rg-home-order";
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && Array.isArray(o.top) && Array.isArray(o.rest) ? o : null; } catch (e) { return null; } }
  function save(o) { try { if (o) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch (e) {} }
  // set = { top: [...apps, maybe {sep}], rest: [...] }. New apps keep their default group, at its end.
  function apply(set) {
    var o = load();
    if (!o) return set;
    var all = set.top.concat(set.rest).filter(function (a) { return a && !a.sep && !a.hidden; });
    var used = [];
    function pick(hrefs) { var g = []; hrefs.forEach(function (h) { all.forEach(function (a) { if (a.href === h && used.indexOf(a) < 0) { g.push(a); used.push(a); } }); }); return g; }
    var top = pick(o.top), rest = pick(o.rest);
    set.top.forEach(function (a) { if (a && !a.sep && !a.hidden && used.indexOf(a) < 0) { top.push(a); used.push(a); } });
    set.rest.forEach(function (a) { if (a && !a.sep && !a.hidden && used.indexOf(a) < 0) { rest.push(a); used.push(a); } });
    return { top: top, rest: rest };
  }
  var rerender = function () {};
  function hrefsOf(ul) { return ul ? Array.prototype.map.call(ul.querySelectorAll("li[data-href]"), function (li) { return li.getAttribute("data-href"); }) : []; }
  function lists() { return [document.getElementById("app-grid"), document.getElementById("more-list")].filter(Boolean); }
  function snapshot() {
    var o = load();
    if (o) return { top: o.top.slice(), rest: o.rest.slice() };
    return { top: hrefsOf(document.getElementById("app-grid")), rest: hrefsOf(document.getElementById("more-list")) };
  }
  function hiddenHrefs() {
    try { var h = JSON.parse(localStorage.getItem("rg-home-hidden") || "[]"); return Array.isArray(h) ? h : []; } catch (e) { return []; }
  }
  function persistFromDom() {
    var o = { top: hrefsOf(document.getElementById("app-grid")), rest: hrefsOf(document.getElementById("more-list")) };
    var prev = load(), hidden = hiddenHrefs();
    // Hidden tiles are not in the DOM. Keep them in the saved order so "החזרה למסך" puts them back.
    function putBack(list, prevList) {
      (prevList || []).forEach(function (href) {
        if (hidden.indexOf(href) !== -1 && list.indexOf(href) === -1) list.push(href);
      });
    }
    if (prev) { putBack(o.top, prev.top); putBack(o.rest, prev.rest); }
    else hidden.forEach(function (href) { if (o.top.indexOf(href) === -1 && o.rest.indexOf(href) === -1) o.rest.push(href); });
    save(o);
  }

  var mode = false, st = null, scrollRaf = 0;
  function paintMode() {
    document.documentElement.classList.toggle("dnd-on", mode);
    var b = document.getElementById("dnd-done");
    if (b) b.hidden = !mode;
  }
  function clearTimer() { if (st && st.timer) { clearTimeout(st.timer); st.timer = 0; } }
  function stopAutoScroll() { if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; } }
  function endDrag(keep) {
    if (!st) return;
    var s = st; st = null; clearTimer(); stopAutoScroll();
    if (s.li && s.id != null) { try { s.li.releasePointerCapture(s.id); } catch (e) {} }
    if (s.ghost) s.ghost.remove();
    if (s.li) s.li.classList.remove("dnd-place");
    document.documentElement.classList.remove("dnd-active");
    if (!s.on) return;
    if (keep) persistFromDom();
    var kill = function (ev) {
      if (ev.target.closest && ev.target.closest("#app-grid li[data-href], #more-list li[data-href], #tile-menu")) {
        ev.preventDefault(); ev.stopPropagation();
      }
    };
    window.addEventListener("click", kill, true);
    setTimeout(function () { window.removeEventListener("click", kill, true); }, 400);
    if (!keep) { rerender(); return; } // pointercancel: drop the unsaved shuffle
    rerender();
  }
  function onDown(e) {
    if (!mode || st || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (e.target.closest && e.target.closest("#dnd-done, #tile-menu, #hidden-apps")) return;
    var li = e.target.closest && e.target.closest("li[data-href]");
    if (!li || lists().indexOf(li.parentNode) < 0) return;
    st = { li: li, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false, timer: 0 };
    // Capture so the drag keeps receiving moves when the finger slides onto another tile.
    try { li.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function start() {
    var li = st.li, r = li.getBoundingClientRect();
    st.on = true; clearTimer();
    var g = li.cloneNode(true);
    g.className = "dnd-ghost"; g.removeAttribute("data-href"); g.style.pointerEvents = "none";
    g.style.width = r.width + "px"; g.style.height = r.height + "px";
    st.dx = st.x - r.left; st.dy = st.y - r.top;
    document.body.appendChild(g); st.ghost = g;
    li.classList.add("dnd-place");
    document.documentElement.classList.add("dnd-active");
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    moveGhost();
  }
  function moveGhost() { st.ghost.style.transform = "translate(" + (st.x - st.dx) + "px," + (st.y - st.dy) + "px) scale(1.06)"; }
  // Hold near the top or bottom edge to reach tiles that are off screen, without a document touch listener.
  function autoScroll() {
    scrollRaf = 0;
    if (!st || !st.on) return;
    var edge = 72, y = st.y, dy = 0;
    if (y < edge) dy = -Math.ceil((edge - y) / 5);
    else if (y > window.innerHeight - edge) dy = Math.ceil((y - (window.innerHeight - edge)) / 5);
    if (dy) window.scrollBy(0, dy);
    scrollRaf = requestAnimationFrame(autoScroll);
  }
  function placeAt(x, y) {
    var el = document.elementFromPoint(x, y); if (!el || !st) return;
    var t = el.closest && el.closest("li[data-href]"), ul;
    if (t && t !== st.li && lists().indexOf(t.parentNode) > -1) {
      var r = t.getBoundingClientRect(), rtl = getComputedStyle(t.parentNode).direction === "rtl";
      var after = (y > r.bottom - r.height / 4) || (y >= r.top + r.height / 4 && (rtl ? x < r.left + r.width / 2 : x > r.left + r.width / 2));
      var ref = after ? t.nextSibling : t;
      if (ref === st.li) return;
      t.parentNode.insertBefore(st.li, ref);
    } else if ((ul = el.closest && el.closest("#app-grid, #more-list, #more-apps")) && !t) {
      if (ul.id === "more-apps") ul = document.getElementById("more-list");
      if (ul && (st.li.parentNode !== ul || ul.lastElementChild !== st.li)) ul.appendChild(st.li);
    }
  }
  function onMove(e) {
    if (!st || e.pointerId !== st.id) return;
    st.x = e.clientX; st.y = e.clientY;
    if (!st.on) {
      if (Math.abs(st.x - st.x0) + Math.abs(st.y - st.y0) > 6) start();
      else return;
    }
    moveGhost();
    placeAt(st.x, st.y);
    if (!scrollRaf) scrollRaf = requestAnimationFrame(autoScroll);
  }
  function onUp(e) {
    if (!st || e.pointerId !== st.id) return;
    var cancel = e.type === "pointercancel";
    endDrag(!cancel);
  }

  document.addEventListener("pointerdown", onDown);
  // Passive on purpose: a non-passive pointer/touch listener on document makes every scroll wait for JS.
  // Tile drags are claimed with touch-action: none on the tiles (html.dnd-on), not with preventDefault.
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
  document.addEventListener("dragstart", function (e) { if (e.target.closest && e.target.closest("#app-grid, #more-list")) e.preventDefault(); });
  document.addEventListener("click", function (e) {
    if (mode && e.target.closest && e.target.closest("#app-grid li[data-href], #more-list li[data-href]")) {
      e.preventDefault(); e.stopPropagation();
    }
  }, true);

  function pin(href) {
    if (!href) return;
    var o = snapshot();
    o.top = o.top.filter(function (h) { return h !== href; });
    o.rest = o.rest.filter(function (h) { return h !== href; });
    o.top.unshift(href);
    save(o);
    rerender();
  }

  window.RGHomeDnd = {
    KEY: KEY, apply: apply,
    hasCustom: function () { return !!load(); },
    reset: function () { save(null); rerender(); },
    setRender: function (f) { rerender = f; },
    moving: function () { return mode; },
    enabled: function () { return mode; },
    startMove: function () { mode = true; paintMode(); },
    stopMove: function () { endDrag(!!(st && st.on)); mode = false; paintMode(); },
    pin: pin
  };
})();
