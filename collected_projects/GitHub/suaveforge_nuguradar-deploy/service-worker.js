const CACHE='nugu-radar-shell-v2';
const PRECACHE=['/','/index.html','/styles.css','/offline.html','/manifest.webmanifest','/assets/pwa/icon-192.png','/assets/pwa/icon-512.png','/assets/pwa/maskable-512.png','/assets/pwa/apple-touch-icon.png','/watch.html','/watch.css','/watch-reels.css','/topkku.html','/community.html','/room.html','/fan-board.html','/hall-of-fame.html'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const res=await fetch(req);
      if(res&&res.ok){
        const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
      }
      return res;
    }catch{
      const cached=await caches.match(req);
      if(cached)return cached;
      if(req.mode==='navigate')return (await caches.match('/offline.html'))||(await caches.match('/index.html'));
      throw new Error('offline');
    }
  })());
});
