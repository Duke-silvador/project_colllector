/* Hősök tere – service worker
   Verzió: frissítéskor növeld a számot (V), így a diákok eszközén új változat töltődik. */
const V = 'hosok-tere-v1';
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./fonts/barlow-semi-condensed-latin-500-normal.woff2",
  "./fonts/barlow-semi-condensed-latin-600-normal.woff2",
  "./fonts/barlow-semi-condensed-latin-700-normal.woff2",
  "./fonts/barlow-semi-condensed-latin-ext-500-normal.woff2",
  "./fonts/barlow-semi-condensed-latin-ext-600-normal.woff2",
  "./fonts/barlow-semi-condensed-latin-ext-700-normal.woff2",
  "./fonts/literata-latin-400-italic.woff2",
  "./fonts/literata-latin-400-normal.woff2",
  "./fonts/literata-latin-600-normal.woff2",
  "./fonts/literata-latin-ext-400-italic.woff2",
  "./fonts/literata-latin-ext-400-normal.woff2",
  "./fonts/literata-latin-ext-600-normal.woff2"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
