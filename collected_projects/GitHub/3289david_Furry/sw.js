const CACHE_NAME = 'mochi-puff-cache-purge-v3';
/** @type {any} */
const swSelf = self;

swSelf.addEventListener('install', () => {
  swSelf.skipWaiting();
});

swSelf.addEventListener('activate', (/** @type {any} */ event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => swSelf.clients.claim())
      .then(() => swSelf.registration.unregister())
      .then(() => swSelf.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => {
          if ('navigate' in client) {
            client.navigate(client.url).catch(() => {});
          }
        });
      })
  );
});
