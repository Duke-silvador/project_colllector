const CACHE='encounter-v4.1-table-40';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=3',
  './table.css?v=10',
  './table.js?v=9',
  './rpg-connect-mj.css?v=26',
  './rpg-connect-mj.js?v=49',
  './creature-icons.js',
  './app.js?v=11',
  './builtins.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './bibliotheque-integree.json',
  './monsters.json',
  './creature-boss-aberration.png',
  './creature-boss-artificiel.png',
  './creature-boss-bete.png',
  './creature-boss-celeste.png',
  './creature-boss-dragon.png',
  './creature-boss-elementaire.png',
  './creature-boss-fee.png',
  './creature-boss-fielon.png',
  './creature-boss-geant.png',
  './creature-boss-humanoide.png',
  './creature-boss-monstruosite.png',
  './creature-boss-mort_vivant.png',
  './creature-boss-plante.png',
  './creature-boss-vase.png',
  './creature-standard-aberration.png',
  './creature-standard-artificiel.png',
  './creature-standard-bete.png',
  './creature-standard-celeste.png',
  './creature-standard-dragon.png',
  './creature-standard-elementaire.png',
  './creature-standard-fee.png',
  './creature-standard-fielon.png',
  './creature-standard-geant.png',
  './creature-standard-humanoide.png',
  './creature-standard-monstruosite.png',
  './creature-standard-mort_vivant.png',
  './creature-standard-plante.png',
  './creature-standard-vase.png',
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('encounter-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const req=event.request;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
    return response;
  })));
});
