// Network-first navigation avoids stale study screens. No offline cache is created.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

// mountain-theme-v2
