const CACHE='farrukh-ai-mobile-v4';
const ASSETS=['/','/index.html','/style.css','/app.js','/piper.js','/manifest.webmanifest','/icon-192.svg','/icon-512.svg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.url.includes('/api/')) return;

  const isAppAsset =
    e.request.mode==='navigate' ||
    /\/(app\.js|piper\.js|index\.html|style\.css)$/.test(new URL(e.request.url).pathname);

  if(isAppAsset){
    e.respondWith(
      fetch(e.request)
        .then(r=>{
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy));
          return r;
        })
        .catch(()=>caches.match(e.request))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});