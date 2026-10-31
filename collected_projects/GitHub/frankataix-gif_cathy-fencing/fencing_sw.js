// Service Worker for Cathy Fencing PWA
const CACHE_NAME = 'cathy-fencing-v34';
const ASSETS = [
  './cathy_avatar.jpg',
  './manifest.json',
  './bc_icbc/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => null)
  );
  // 安装完成立即激活，让 PWA 能自动更新
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // 只清理本 App 自己的旧缓存，不碰 sampling/ 等其他 PWA 的缓存
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cathy-fencing-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // 永远不要缓存 Service Worker 自身，保证后续能检查更新
  if (url.pathname.endsWith('fencing_sw.js')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // 报名名单和版本号文件每次都从网络取，避免显示旧名单
  if (url.pathname.includes('cathy_data/entry_counts.json') || url.pathname.includes('cathy_data/version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request))
    );
    return;
  }

  // 不干涉取样 PWA /sampling/ 目录下的请求
  if (url.pathname.includes('/sampling/')) return;

  const isHtml = e.request.mode === 'navigate' || e.request.destination === 'document' || url.pathname.endsWith('.html');

  if (isHtml) {
    // 网页文件：强制走网络（no-store），保证每次打开都拿到最新版本；失败时走缓存
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match('./fencing_tournament_helper.html')))
    );
    return;
  }

  // 其他静态资源：先走缓存，再更新
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
      if (!res || res.status !== 200) return res;
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      return res;
    }))
  );
});
