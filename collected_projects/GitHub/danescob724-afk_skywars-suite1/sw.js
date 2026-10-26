// Service Worker for Skywars Suite Studio PWA
const CACHE_NAME = 'skywars-suite-v1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=5.1',
  './app.js',
  './skywars_body.js',
  './obfuscator.js',
  './lua-runner.js',
  './manifest.json',
  './assets/logo.jpg',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for dynamic github API / raw lua, cache fallback for static app shell
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Don't cache GitHub API calls or external live endpoints
  if (url.hostname.includes('api.github.com') || url.hostname.includes('raw.githubusercontent.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
