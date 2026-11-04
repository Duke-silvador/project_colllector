/* Offline cache for the main landing page only.
   Sub-apps (alarm/, relax/, sounds/, ...) have their own service workers with
   narrower scopes; this worker never touches their files, so it just lets those
   requests go straight to the network. */
var CACHE = "rg-home-v72";
var FILES = ["./", "index.html", "home-dnd.js?v=36", "about/", "about/index.html", "shared/rg-account.js", "shared/rg-topbar.js", "shared/fonts/heebo.css", "shared/rg-site.css", "shared/fonts/heebo-hebrew.woff2", "shared/fonts/heebo-latin.woff2", "shared/fonts/heebo-latin-ext.woff2", "assets/avatar.jpg", "manifest.json", "app-icon.svg", "app-icon-192.png", "app-icon-512.png", "app-icon-maskable-192.png", "app-icon-maskable-512.png", "apple-touch-icon.png", "favicon-32.png", "favicon.ico"];
var BASE = new URL("./", self.location).pathname;          // e.g. /ron-gershinsky-site/
var OWN = FILES.map(function (f) { return new URL(f, self.location).pathname; });

function isHomeDoc(url, req) {
  if (url.pathname === BASE || url.pathname === BASE + "index.html") return true;
  return req.mode === "navigate" && OWN.indexOf(url.pathname) !== -1;
}
// GitHub Pages sends Cache-Control: max-age=600. A normal fetch() would keep serving
// that cached index.html after a deploy. Revalidate these documents on every load.
function fresh(req, url) {
  if (!isHomeDoc(url, req)) return fetch(req);
  return fetch(url.href, { cache: "no-cache", credentials: "same-origin", redirect: "follow" });
}
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-home-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    return self.clients.matchAll({ type: "window" });
  }).then(function (list) {
    // The page already on screen may be the pre-deploy HTML. Reload just the home
    // document so the new markup shows without a manual cache clear. Sub-app
    // windows are controlled by their own workers and are not in this list.
    return Promise.all(list.map(function (client) {
      var path = "";
      try { path = new URL(client.url).pathname; } catch (err) { return null; }
      if (path !== BASE && path !== BASE + "index.html") return null;
      if (typeof client.navigate !== "function") return null;
      return client.navigate(client.url).catch(function () { return null; });
    }));
  }));
});
// Network first so updates show up; fall back to cache when offline.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                          // never touch POSTs (waitlist)
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // waitlist worker, FormSubmit, etc.
  if (OWN.indexOf(url.pathname) === -1) return;              // sub-apps and anything else: not ours
  e.respondWith(fresh(req, url).then(function (r) {
    if (r.ok) {
      var copy = r.clone();
      var key = isHomeDoc(url, req) ? url.href : req;
      caches.open(CACHE).then(function (c) { return c.put(key, copy); }).catch(function () {});
    }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (m) {
      return m || (url.pathname === BASE || req.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
