const C='pentagone-v6',A=['./','index.html','app.js','manifest.json','icon-192.png','icon-512.png','styles.css','jbmono.ttf','brain/','brain/index.html','brain/brain.js','brain/brain.css','brain/brain_model.bin','brain/brain_model.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(u.pathname.endsWith('data.json')||u.pathname.endsWith('brain.json')){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));return}
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
