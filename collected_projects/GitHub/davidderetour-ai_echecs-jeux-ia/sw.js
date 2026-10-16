/* Échecs & Jeux IA — MAJ 2.1 : réseau d'abord, secours hors ligne. */
const CACHE='echecs-jeux-ia-v3-8-3-fix-20261015';
const PREFIX='echecs-jeux-ia-';
const CORE=['./','./index.html','./go.html','./peace.html','./go.js','./peace.js','./peace-puzzles.json','./app.js','./universal-360.js','./game-clocks.js','./academy-path.js','./shogi-engine.js','./shogi-lessons.js','./shogi-app.js','./engine.js','./mini.js','./coach.js','./extras.js','./backup.js','./nearby.js','./bluetooth-chat.js','./theme-presets.js','./board-view.js','./chess-3d.js','./webgpu-3d.js','./piece-figures.js','./masterclass.js','./atelier.js','./styles.css','./manifest.webmanifest','./assets/icone-v241-192.png','./assets/icone-v241-512.png','./apple-touch-icon.png','./favicon.png','./apple-touch-icon-couleur-241.png','./favicon-couleur-241.png','./assets/icone-couleur-241-192.png','./assets/icone-couleur-241-512.png','./manifest-icone-couleur.webmanifest','./installer-icone-couleur.html','./assets/house-of-chess.jpg'];
const DOCUMENTS=['./docs/Regles_4_joueurs.pdf','./docs/Guide_M800.pdf','./docs/Notice_V24_A4.pdf','./docs/Installation_iPhone_Android_PC_Mac.pdf'];
self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE.map(x=>new Request(x,{cache:'reload'})));
    // Les PDF ne doivent pas empêcher l'installation si le réseau est lent.
    await Promise.allSettled(DOCUMENTS.map(x=>cache.add(new Request(x,{cache:'reload'}))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Recharge les anciennes fenêtres pour sortir du cache V1. Les parties
    // sont dans localStorage, auquel ce service worker ne touche jamais.
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.allSettled(windows.filter(w=>{try{return new URL(w.url).pathname.indexOf('/mise-a-jour.html')<0;}catch{return false;}}).map(w=>w.navigate(w.url)));
  })());
});
const isCore = path => /(?:\/|\/(?:index\.html|go\.html|peace\.html|go\.js|peace\.js|universal-360\.js|peace-puzzles\.json|app\.js|academy-path\.js|shogi-engine\.js|shogi-lessons\.js|shogi-app\.js|engine\.js|mini\.js|coach\.js|extras\.js|backup\.js|nearby\.js|bluetooth-chat\.js|theme-presets\.js|board-view\.js|chess-3d\.js|webgpu-3d\.js|piece-figures\.js|masterclass\.js|atelier\.js|styles\.css|manifest\.webmanifest))$/.test(path);
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||url.pathname.includes('/api/')||url.pathname.endsWith('/sw.js'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // Toujours vérifier le réseau pour l'accueil et les scripts.
    if(req.mode==='navigate'||isCore(url.pathname)){
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh.ok)await cache.put(req,fresh.clone());
        return fresh;
      }catch{
        return await cache.match(req,{ignoreSearch:true}) || (req.mode==='navigate'?await cache.match('./index.html'):undefined) || Response.error();
      }
    }
    const old=await cache.match(req,{ignoreSearch:true});
    if(old)return old;
    try{
      const fresh=await fetch(req);
      if(fresh.ok)await cache.put(req,fresh.clone());
      return fresh;
    }catch{return Response.error();}
  })());
});
