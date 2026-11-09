const V = "sbd-v15";
const CORE = ["./", "index.html", "style.css", "app.js", "handcalc.js", "fragments.js", "archetypes.js", "tools.js", "types.js", "decks-bundled.json", "archetypes-bundled.json", "cards.json", "manifest.webmanifest", "icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// cache-first for images (immutable), network-first for the app shell so updates arrive
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const img = /\/img\//.test(r.url);
  e.respondWith(img
    ? caches.match(r).then(m => m || fetch(r).then(x => { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); return x; }))
    : fetch(r).then(x => { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); return x; }).catch(() => caches.match(r)));
});
