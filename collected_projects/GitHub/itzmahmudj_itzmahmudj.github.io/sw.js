/* Древо пророков — service worker. При обновлении сайта увеличьте номер версии V. */
const V="ptree-v1",D3="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js",FONTS="https://fonts.googleapis.com/css2?family=Amiri&family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500&display=swap";
const CORE=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png","icons/icon.svg","icons/favicon-32.png","vendor/d3.min.js"];
const pre=async()=>{const c=await caches.open(V);
 await Promise.all(CORE.map(u=>c.add(u).catch(()=>{})));
 await Promise.all([D3,FONTS].map(u=>fetch(new Request(u,{mode:"no-cors"})).then(r=>c.put(u,r)).catch(()=>{})))};
self.addEventListener("install",e=>{e.waitUntil(pre().then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
 if(r.mode==="navigate"){
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put("index.html",cp))}return res}).catch(()=>caches.match("index.html").then(m=>m||caches.match("./"))));
  return}
 if(u.origin===location.origin||/^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.host)){
  e.respondWith(caches.open(V).then(c=>c.match(r).then(m=>{
   const f=fetch(r).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(r,res.clone());return res}).catch(()=>m);
   return m||f})))}});
