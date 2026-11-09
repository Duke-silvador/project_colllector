/* AI Football Predictor - anonymous audience measurement, no cookies, no storage */
(function () {
  try {
    if (navigator.webdriver || /bot|crawl|spider|headless/i.test(navigator.userAgent)) return;
    var E = "https://afp-blog-production.up.railway.app/api/hit", t0 = Date.now(), mx = 0, sent = 0;
    var id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6), q = new URLSearchParams(location.search);
    function s(o) { o.id = id; var b = JSON.stringify(o); try { if (!navigator.sendBeacon || !navigator.sendBeacon(E, b)) fetch(E, { method: "POST", body: b, keepalive: true, mode: "no-cors" }); } catch (e) {} }
    function depth() { var h = document.documentElement, d = (h.scrollTop || document.body.scrollTop || 0) + innerHeight, t = Math.max(h.scrollHeight, document.body.scrollHeight || 0) || 1; if (d / t > mx) mx = d / t; }
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    s({ k: "pv", p: location.pathname, r: document.referrer, src: q.get("src") || q.get("utm_source") || q.get("ref") || "", l: navigator.language || "", tz: tz, w: screen.width, t: (document.title || "").slice(0, 150) });
    depth(); addEventListener("scroll", depth, { passive: true });
    function end() { if (sent) return; sent = 1; depth(); s({ k: "end", ms: Date.now() - t0, sc: Math.round(Math.min(1, mx) * 100) }); }
    addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") end(); });
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a") : null; if (!a || !a.href) return;
      var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.host && u.host !== location.host) s({ k: "out", p: location.pathname, to: (u.host.replace(/^www\./, "") + u.pathname).slice(0, 110) });
    }, true);
  } catch (e) {}
})();
