const CACHE_VERSION = 'central-shell-v29.0.4-radar-unread-20261007';
const APP_SHELL = [
'./',
'./index.html',
'./manifest.webmanifest',
'./assets/icon.svg',
'./css/app.css',
'./css/ecosystem-v1.css?v=28.1.0',
'./css/catalog-v4.css',
'./css/personalization-v5.css',
'./css/timeline-v8.css',
'./css/pro-v11.css',
'./css/workspace-v24.css',
'./css/workspace-v26.css?v=portfolio-20260930',
'./css/daily-message-v1.css?v=28.7.2',
'./css/workspace-v27.css',
'./css/study-log-v1.css?v=28.8.0',
'./js/app.js?v=29.0.4',
'./js/personalization-v5.js',
'./js/pwa-v6.js',
'./js/timeline-v8.js',
'./js/pro-v11.js?v=29.0.4',
'./js/contracts-v12.js?v=28.9.4',
'./js/manual-refresh-v1.js?v=29.0.4',
'./js/command-context-v1.js?v=28.1.0',
'./js/workspace-v24.js?v=29.0.4',
'./js/study-log-v1.js?v=28.8.0',
'./js/study-dates-v1.js?v=29.0.4',
'./config/projects.json?v=29.0.4',
'./css/daily-workspace-v1.css?v=29.0.4',
'./js/daily-workspace-v1.js?v=28.7.2',
'./config/study-schedule-v1.json?v=28.2.0',
'./mentor/index.html',
'./mentor/mentor.css?v=29.0.4',
'./mentor/mentor.js?v=29.0.4'
];
const RUNTIME_CACHE = 'central-study-runtime-v29.0.4';
const RUNTIME_ASSETS = new Set([
'./css/official-radar-v1.css?v=2',
'./js/official-radar-v1.js?v=7',
'./css/study-dashboard-v1.css?v=29.0.4',
'./js/study-dashboard-v1.js?v=29.0.4',
'./js/study-sync-v1.js?v=28.7.2',
'./js/study-planner-v1.js?v=28.2.0',
'./css/study-planner-v1.css?v=28.2.0',
'./css/home-v1.css?v=home-20260929d',
'./css/home-v2.css?v=28.7.2',
'./config/study-catalog-v1.json?v=28.2.0'
].map((path) => new URL(path, self.registration.scope).href));
self.addEventListener('install', (event) => {
event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', (event) => {
event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => (key.startsWith('central-shell-') && key !== CACHE_VERSION) || (key.startsWith('central-study-runtime-') && key !== RUNTIME_CACHE)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => {
if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
const request = event.request;
if (request.method !== 'GET') return;
const url = new URL(request.url);
const scopeUrl = new URL(self.registration.scope);
if (url.origin !== scopeUrl.origin || !url.pathname.startsWith(scopeUrl.pathname)) return;
if (RUNTIME_ASSETS.has(url.href)) {
event.respondWith(caches.open(RUNTIME_CACHE).then(async (cache) => {
const saved = await cache.match(request);
try {
const response = await fetch(request);
if (response && response.ok) cache.put(request, response.clone());
return response;
} catch {
return saved || new Response('', { status: 503 });
}
}));
return;
}
if (request.mode === 'navigate') {
const mentorNavigation = url.pathname.endsWith('/mentor/') || url.pathname.endsWith('/mentor/index.html');
const fallback = mentorNavigation ? './mentor/index.html' : './index.html';
event.respondWith(fetch(request).then((response) => {
if (response && response.ok) {
const copy = response.clone();
caches.open(CACHE_VERSION).then((cache) => cache.put(fallback, copy));
}
return response;
}).catch(() => caches.match(fallback)));
return;
}
if (!APP_SHELL.some((path) => new URL(path, self.registration.scope).href === url.href)) return;
event.respondWith(fetch(request).then((response) => {
if (response && response.ok) {
const copy = response.clone();
caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
}
return response;
}).catch(() => caches.match(request)));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification?.data?.url || './#official-radar', self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client && client.url !== target) {
          try { await client.navigate(target); } catch {}
        }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
