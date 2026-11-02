/* Crown & Kingdoms — offline shell cache.
   HTML/JS/CSS/JSON use network-first so deployments refresh immediately online.
   Local painted art uses cache-first after its first successful download.
   Cross-origin Supabase traffic and non-GET requests are never intercepted. */
'use strict';

const ART_REVISION = '551728807e5899f11f8f068fb798b9a11177a3e7c684604d2292e1e1e6e88450';
const CACHE_NAME = 'ck-shell-v135-effects-art-ownership-' + ART_REVISION;
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './assets/atlas-manifest.json',
  './assets/art-revisions.json',
  './assets/painted-units-v2.webp',
  './assets/painted-buildings.webp',
  './assets/painted-house-ages.webp',
  './assets/painted-town-centre-ages.webp',
  './assets/painted-terrain.webp',
  './assets/painted-resources.webp',
  './assets/painted-scarce-resources.webp',
  './assets/painted-environment.webp',
  './assets/painted-fishtraps.webp',
  './assets/painted-wildlife-deer.webp',
  './assets/painted-wildlife-fish.webp',
  './assets/painted-motion-mil.webp',
  './assets/painted-motion-knight.webp',
  './assets/painted-motion-vil.webp',
  './assets/painted-motion-arc.webp',
  './assets/painted-motion-xbow.webp',
  './assets/painted-motion-spear.webp',
  './assets/painted-motion-scout.webp',
  './assets/painted-motion-skirm.webp',
  './assets/painted-motion-mon.webp',
  './assets/painted-motion-axe.webp',
  './assets/painted-motion-lbow.webp',
  './assets/painted-motion-woad.webp',
  './assets/painted-motion-bers.webp',
  './assets/painted-motion-saml.webp',
  './assets/painted-motion-tk.webp',
  './assets/painted-motion-huskarl.webp',
  './assets/painted-motion-jaguar.webp',
  './assets/painted-motion-kamayuk.webp',
  './assets/painted-motion-shotel.webp',
  './assets/painted-motion-jan.webp',
  './assets/painted-motion-genoa.webp',
  './assets/painted-motion-plumed.webp',
  './assets/painted-motion-gbeto.webp',
  './assets/painted-motion-chuko.webp',
  './assets/painted-motion-hcan.webp',
  './assets/painted-motion-camel.webp',
  './assets/painted-motion-mamel.webp',
  './assets/painted-motion-mgd.webp',
  './assets/painted-motion-cata.webp',
  './assets/painted-motion-conq.webp',
  './assets/painted-motion-boyar.webp',
  './assets/painted-motion-tarkan.webp',
  './assets/painted-motion-huszar.webp',
  './assets/painted-motion-fish.webp',
  './assets/painted-motion-gal.webp',
  './assets/painted-motion-trn.webp',
  './assets/painted-motion-cog.webp',
  './assets/painted-motion-cart.webp',
  './assets/painted-motion-king.webp',
  './assets/painted-motion-eled.webp',
  './assets/painted-motion-ele.webp',
  './assets/painted-motion-ram.webp',
  './assets/painted-motion-bomb.webp',
  './assets/painted-motion-treb.webp',
  './assets/painted-motion-mang.webp',
  './assets/painted-motion-scor.webp',
  './assets/painted-motion-wagon.webp',
  './js/config.js',
  './js/state.js',
  './js/mapgen.js',
  './js/audio.js',
  './js/save.js',
  './js/input.js',
  './js/render.js',
  './js/render-terrain.js',
  './js/render-resources.js',
  './js/render-buildings.js',
  './js/render-procedural-units.js',
  './js/render-troops.js',
  './js/render-effects.js',
  './js/ui.js',
  './js/simulation-combat-bonuses.js',
  './js/simulation-victory.js',
  './js/simulation-logistics.js',
  './js/simulation-resource-routing.js',
  './js/simulation-production-queues.js',
  './js/simulation-research.js',
  './js/simulation-building-production.js',
  './js/simulation-building-updates.js',
  './js/simulation.js','./js/simulation-unit-behaviour.js','./js/simulation-separation.js','./js/ai-policy.js','./js/ai-economy.js','./js/ai-defence.js','./js/ai-maritime.js','./js/ai-offence.js','./js/ai-construction.js','./js/ai.js','./js/pathfinding.js','./js/kingdom.js','./js/entities.js','./js/campaign.js','./js/economy.js','./js/formations.js','./js/menus.js','./js/minimap.js', './js/assets.js',
  './js/engine-graphics-benchmark.js',
  './js/engine-picture.js',
  './engine.js',
  './persistence.js',
  './js/network-sync.js',
  './js/network-commands.js',
  './js/network-delivery.js',
  './js/network-uplink.js',
  './js/network-transport.js',
  './js/network-supabase.js',
  './js/network-webrtc.js',
  './js/network-startup.js',
  './js/network-session.js',
  './js/network-unit-map.js',
  './js/network-lobby.js',
  './multiplayer.js',
];

const ART_CATALOG = './assets/art-revisions.json';
const absolute = path => new URL(path,self.location.href).href;
async function digestHex(bytes){
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function verifyArtResponse(response,expected){
 return !!response?.ok&&await digestHex(await response.clone().arrayBuffer())===expected;
}
async function installVerifiedShell(){
 const existed=await caches.has(CACHE_NAME),cache=await caches.open(CACHE_NAME);
 try{
  const response=await fetch(new Request(absolute(ART_CATALOG),{cache:'reload'}));
  if(!response.ok)throw Error('Artwork catalogue unavailable');
  const catalog=await response.clone().json(),images=CORE_ASSETS.filter(p=>p.endsWith('.webp'));
  if(catalog.version!==1||!catalog.files||Array.isArray(catalog.files)||Object.keys(catalog.files).length!==images.length||
     images.some(p=>!Object.prototype.hasOwnProperty.call(catalog.files,p)||!/^[a-f0-9]{64}$/.test(catalog.files[p])))throw Error('Invalid artwork catalogue');
  const files=Object.fromEntries(Object.entries(catalog.files).sort(([a],[b])=>a<b?-1:a>b?1:0));
  if(catalog.revision!==ART_REVISION||await digestHex(new TextEncoder().encode(JSON.stringify({version:1,files})))!==ART_REVISION)throw Error('Artwork catalogue revision mismatch');
  const previous=await Promise.all((await caches.keys()).filter(k=>k.startsWith('ck-shell-')&&k!==CACHE_NAME).map(k=>caches.open(k)));
  // Code and metadata must refresh even when the artwork is identical.
  const mutable=CORE_ASSETS.filter(p=>!p.endsWith('.webp')&&p!==ART_CATALOG);
  await cache.addAll(mutable.map(p=>new Request(absolute(p),{cache:'reload'})));
  let next=0;
  const workers=Array.from({length:Math.min(4,images.length)},async()=>{
   while(next<images.length){
    const path=images[next++],request=new Request(absolute(path),{cache:'reload'}),expected=files[path];let image=null;
    // Verify actual cached bytes; stale names or a damaged cache are not trusted.
    for(const old of previous){const candidate=await old.match(request);if(await verifyArtResponse(candidate,expected)){image=candidate;break}}
    if(!image){image=await fetch(request);if(!await verifyArtResponse(image,expected))throw Error('Artwork integrity failure: '+path)}
    await cache.put(request,image);
   }
  });
  const results=await Promise.allSettled(workers),failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  await cache.put(absolute(ART_CATALOG),response);
 }catch(error){if(!existed)await caches.delete(CACHE_NAME);throw error}
}
self.addEventListener('install',event=>{
 event.waitUntil(installVerifiedShell().then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('ck-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Authenticated relay responses must never enter or fall back to shell caches.
  if (url.pathname.startsWith('/api/multiplayer/') ||
      request.headers.has('Authorization') || request.cache === 'no-store') return;

  const networkFirst = request.mode === 'navigate' ||
    /\.(?:html|js|css|json)$/i.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (networkFirst) {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          await cache.put(request, response.clone());
          return response;
        }
        return await cache.match(request) || response;
      } catch (_) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await cache.match('./index.html') || await cache.match('./');
          if (shell) return shell;
        }
        return Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});

