// Y2Fit portal service worker: makes the portal installable on phones.
// It never stores client data — every request goes to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
