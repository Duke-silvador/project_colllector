/* DebateBase – Service Worker
 *
 * Aufgabe: Die App-Dateien auf dem Gerät zwischenspeichern, damit DebateBase
 * nach dem ersten Laden ohne Internet startet. Deine Daten liegen NICHT hier,
 * sondern in IndexedDB (db.js). Der Service Worker sieht sie nie.
 *
 * Bei jeder neuen Version wird VERSION erhöht. Chrome lädt dann die neuen
 * Dateien im Hintergrund; die App zeigt „Neue Version verfügbar“ an.
 */
'use strict';

/* Datenbank-Funktionen, damit geteilte Beiträge sicher zwischengespeichert werden können */
importScripts('./db.js');

var VERSION = '3.2.0';
var APP_CACHE = 'debatebase-app-' + VERSION;
var FONT_CACHE = 'debatebase-fonts-v1';
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Schibsted+Grotesk:wght@500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap';

/* Alle Dateien, die die App zum Starten braucht (relativ zum Ordner der App) */
var APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './migrate.js',
  './analyse.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(APP_CACHE).then(function (cache) {
      /* cache: 'reload' umgeht den Browser-Cache, damit wirklich die neue Version geladen wird */
      return Promise.all(APP_FILES.map(function (url) {
        return fetch(new Request(url, { cache: 'reload' })).then(function (res) {
          if (!res.ok) throw new Error(url + ': ' + res.status);
          return cache.put(url, res);
        });
      }));
    })
  );
  /* Kein skipWaiting hier: Die neue Version wartet, bis du in der App „Neu laden“ tippst. */
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('debatebase-app-') === 0 && k !== APP_CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Lädt die Schrift-Beschreibung von Google Fonts und alle darin genannten Schriftdateien
   einmalig in den Zwischenspeicher. Danach sind die Schriften auch offline da. */
function cacheFonts() {
  return caches.open(FONT_CACHE).then(function (cache) {
    return cache.match(FONT_CSS).then(function (hit) {
      if (hit) return;
      return fetch(FONT_CSS, { mode: 'cors' }).then(function (res) {
        if (!res.ok) return;
        return res.clone().text().then(function (css) {
          var urls = (css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g) || []).map(function (u) { return u.slice(4, -1); });
          return Promise.all(urls.map(function (u) {
            return fetch(u, { mode: 'cors' }).then(function (r) { if (r.ok) return cache.put(u, r); });
          })).then(function () { return cache.put(FONT_CSS, res); });
        });
      });
    });
  }).catch(function () { /* ohne Internet: Systemschrift wird verwendet */ });
}

self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
  /* Die App bittet nach dem Start darum, die Schriften offline zu speichern (darf scheitern) */
  if (event.data === 'cacheFonts') event.waitUntil(cacheFonts());
  if (event.data === 'version' && event.source) event.source.postMessage({ type: 'version', version: VERSION });
});

/* ---------- Android-Teilen (Web Share Target) ----------
   Android schickt geteilte Inhalte als Formular (POST) an ./teilen.
   Wir speichern sie UNVERÄNDERT im Eingang (inbox) und öffnen dann die App.
   Erst dort entscheidest du, ob und wie gespeichert wird. */
function receiveShare(req) {
  var scope = self.registration.scope;
  return req.formData().then(function (fd) {
    var raw = {};
    fd.forEach(function (v, k) { if (typeof v === 'string') (raw[k] = raw[k] || []).push(v); });
    var get = function (k) { return raw[k] ? raw[k].join('\n') : ''; };
    var item = {
      id: 'in_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      received: Date.now(),
      title: get('title'), text: get('text'), url: get('url'),
      raw: raw
    };
    return DB.write({ put: { inbox: [item] } }).then(function () {
      return Response.redirect(new URL('./?geteilt=' + item.id, scope).href, 303);
    });
  }).catch(function () {
    return Response.redirect(new URL('./?teilenfehler=1', scope).href, 303);
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);
  if (req.method === 'POST' && url.origin === self.location.origin && /\/teilen\/?$/.test(url.pathname)) {
    event.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== 'GET') return;

  /* Schriften: zuerst Zwischenspeicher, sonst Internet (und dann merken) */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          return hit || fetch(req).then(function (res) {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          });
        });
      }).catch(function () { return Response.error(); /* ohne Internet und ohne Kopie: Systemschrift */ })
    );
    return;
  }

  /* Andere Webseiten (z. B. Quellen-Links) nicht anfassen */
  if (url.origin !== self.location.origin) return;

  /* Seitenaufrufe: immer die gespeicherte App-Seite (auch mit ?quelle=app) */
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(APP_CACHE).then(function (cache) {
        return cache.match('./index.html').then(function (hit) {
          return hit || fetch(req);
        });
      }).catch(function () { return fetch(req); })
    );
    return;
  }

  /* App-Dateien: zuerst Zwischenspeicher, sonst Internet */
  event.respondWith(
    caches.open(APP_CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req);
      });
    })
  );
});
