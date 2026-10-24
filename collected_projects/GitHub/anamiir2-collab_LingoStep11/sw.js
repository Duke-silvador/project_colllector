/* ============================================================
   LingoStep — sw.js (service worker)
   Strategy:
   - App shell (HTML/CSS/JS core, icons, manifest): precached,
     refreshed with stale-while-revalidate.
   - Lesson modules (lessons/**) + data manifest: cached on
     first fetch (stale-while-revalidate) so opened lessons work
     offline. "Download all lessons" in Settings fetches every
     lesson once to prime the cache.
   - Never caches cross-origin requests or POST responses.
   Version bump replaces old caches on activate.
   ============================================================ */

const VERSION = 'v2.5.1';
const SHELL_CACHE = `lingostep-shell-${VERSION}`;
const LESSON_CACHE = `lingostep-lessons-${VERSION}`;
const KNOWN_CACHES = [SHELL_CACHE, LESSON_CACHE];

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/themes.css',
  './css/responsive.css',
  './css/ios-duo.css',
  './css/dialogues.css',
  './js/app.js',
  './js/book-dialogues.js',
  './js/dialogues.js',
  './dialogues/dialogue-01.js',
  './dialogues/dialogue-02.js',
  './dialogues/dialogue-03.js',
  './dialogues/dialogue-04.js',
  './dialogues/dialogue-05.js',
  './dialogues/dialogue-06.js',
  './dialogues/dialogue-07.js',
  './dialogues/dialogue-08.js',
  './dialogues/dialogue-09.js',
  './dialogues/dialogue-10.js',
  './dialogues/dialogue-11.js',
  './dialogues/dialogue-12.js',
  './dialogues/dialogue-13.js',
  './dialogues/dialogue-14.js',
  './dialogues/dialogue-15.js',
  './dialogues/dialogue-16.js',
  './dialogues/dialogue-17.js',
  './dialogues/dialogue-18.js',
  './dialogues/dialogue-19.js',
  './dialogues/dialogue-20.js',
  './dialogues/dialogue-21.js',
  './dialogues/dialogue-22.js',
  './dialogues/dialogue-23a.js',
  './dialogues/dialogue-24.js',
  './dialogues/dialogue-25.js',
  './dialogues/dialogue-26.js',
  './dialogues/dialogue-27.js',
  './dialogues/dialogue-28.js',
  './dialogues/dialogue-29.js',
  './dialogues/dialogue-30.js',
  './dialogues/dialogue-31.js',
  './dialogues/dialogue-32.js',
  './dialogues/dialogue-33.js',
  './dialogues/dialogue-34b.js',
  './dialogues/dialogue-35a.js',
  './dialogues/dialogue-36a.js',
  './dialogues/dialogue-37.js',
  './dialogues/dialogue-38.js',
  './dialogues/dialogue-39a.js',
  './dialogues/dialogue-40.js',
  './dialogues/dialogue-41.js',
  './dialogues/dialogue-42.js',
  './dialogues/dialogue-43.js',
  './dialogues/dialogue-44.js',
  './dialogues/lesson-fields.js',
  './js/feedback-fx.js',
  './js/icons.js',
  './js/icon-config.js',
  './assets/icons/icons.svg',
  './assets/icons/home.png',
  './assets/icons/review.png',
  './assets/icons/stats.png',
  './assets/icons/settings.png',
  './assets/icons/language.png',
  './assets/icons/theme.png',
  './assets/icons/basics.png',
  './assets/icons/hourglass.png',
  './assets/icons/grammar.png',
  './js/router.js',
  './js/utils.js',
  './js/i18n.js',
  './js/settings.js',
  './js/storage.js',
  './js/progress.js',
  './js/review.js',
  './js/speech.js',
  './js/grading.js',
  './js/lesson-schema.js',
  './js/lesson-loader.js',
  './js/lesson-engine.js',
  './js/listening-writing-enhancements.js',
  './js/letter-track.js',
  './js/keyboard.js',
  './js/xp.js',
  './js/motivation.js',
  './js/word-cards.js',
  './js/vocabulary.js',
  './data/lesson-manifest.js',
  './data/motivational-messages.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isLessonAsset(url) {
  return url.pathname.includes('/lessons/') || url.pathname.includes('/data/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // navigations: network first, fall back to cached shell (offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // everything else same-origin: stale-while-revalidate
  event.respondWith(
    caches.open(isLessonAsset(url) ? LESSON_CACHE : SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            cache.put(request, copy).catch(() => {});
          }
          return response;
        })
        .catch(() => undefined);
      return cached || network.then((r) => r || new Response('Offline', { status: 503, statusText: 'Offline' }));
    })
  );
});
