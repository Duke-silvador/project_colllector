// Service Worker для «Навчального годинника» (PWA, офлайн-режим)
// Ця версія оновлює сама себе: HTML-сторінка завжди береться зі свіжої мережі
// (і одразу перезаписує кеш), а інші файли оновлюються у фоні при кожному запиті.
// Тому нічого в цьому файлі вручну змінювати більше не потрібно.
// Запити до мережі йдуть з cache:'no-cache' — тобто завжди перевіряються на сервері
// і не беруться зі звичайного HTTP-кешу браузера (GitHub Pages віддає файли з max-age=600).
// Змінюйте номер у CACHE_NAME лише щоб примусово очистити всі старі кеші.
const CACHE_NAME = 'godynnyk-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Встановлення: одразу активуємо нову версію (не чекаємо закриття всіх вкладок)
self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS).catch(function(){ /* якщо якогось файлу нема — не критично */ });
    })
  );
});

// Активація: беремо керування всіма відкритими сторінками одразу
// та видаляємо всі старі кеші з іншими іменами
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; })
                             .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Запити:
// - HTML-сторінку завжди тягнемо першою чергою з мережі (щоб бачити свіжу версію),
//   і лише якщо мережі немає — беремо з кешу (офлайн-режим).
// - Інші файли (іконки, manifest тощо) — спочатку кеш, паралельно оновлюємо його з мережі.
self.addEventListener('fetch', function(event){
  const req = event.request;
  const isHTML = req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1);

  if(isHTML){
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function(res){
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      const network = fetch(req, { cache: 'no-cache' }).then(function(res){
        if(res && res.status === 200){
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
