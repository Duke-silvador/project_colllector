// Service Worker: macht Codeweg offline nutzbar.
// WICHTIG: Bei jeder Veröffentlichung die Versionsnummer erhöhen,
// sonst sehen installierte Apps weiter die alte Fassung.
const CACHE = 'codeweg-v1';

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/style.css',
  './src/app.js',
  './src/store.js',
  './src/ui.js',
  './src/registry.js',
  './src/data/index.js',
  './src/data/grundlagen.js',
  './src/data/web.js',
  './src/data/mobile.js',
  './src/data/desktop.js',
  './src/data/daten.js',
  './src/data/praxis.js',
  './src/views/home.js',
  './src/views/category.js',
  './src/views/lesson.js',
  './src/views/practice.js',
  './src/views/progress.js',
  './src/views/library.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Netz zuerst, Cache als Rückfallebene: so sind Aktualisierungen sofort da,
// und ohne Verbindung läuft die App trotzdem.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopie)).catch(() => {});
        return antwort;
      })
      .catch(() => caches.match(e.request).then((treffer) => treffer || caches.match('./index.html')))
  );
});
