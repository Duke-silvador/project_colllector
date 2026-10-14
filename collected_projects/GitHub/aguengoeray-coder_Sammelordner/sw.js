// Service Worker: hält die App offline verfügbar.
// Holt immer zuerst die neueste Version aus dem Netz und nutzt den Speicher nur, wenn man offline ist.
// Nach größeren Änderungen die Versionsnummer erhöhen.
const CACHE = "sammelordner-v14";
const FILES = ["./", "index.html", "style.css", "app.js", "condition.js", "buys.js", "config.js", "data/sets.json",
               "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;   // Sammlungsdaten nie zwischenspeichern
  // Seite selbst immer beim Server nachfragen, damit neue Versionsnummern sofort greifen
  const net = req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  e.respondWith(
    net.then(res => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
