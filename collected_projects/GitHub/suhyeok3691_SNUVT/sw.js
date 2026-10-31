/* SNUVT 서비스 워커
 * - 앱 화면(index.html 등)은 네트워크 먼저, 안 되면 저장해 둔 것 → 연결이 없어도 앱이 열림
 * - 버전이 붙은 스크립트(js/app.js?v=194)는 내용이 바뀌면 주소가 바뀌므로 저장해 둔 것 먼저 → 다시 열 때 빠름
 * - CDN 스크립트·글꼴은 저장해 둔 것 먼저
 * - Supabase(데이터) 요청은 건드리지 않음 (오프라인 기록은 앱이 따로 모아 뒀다가 올림)
 * - 알림(push) 표시 · 알림을 누르면 앱 열기 */
const CACHE = "snuvt-v9";
const SHELL = ["./", "index.html", "js/config.js", "js/picker.js", "js/program.js", "js/guide.js", "js/library.js", "js/campus.js", "js/court.js", "js/live.js", "js/app.js", "img/logo.png", "img/logo-white.png", "img/favicon.png", "img/icon-192.png", "manifest.webmanifest"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname)) return;
  if (url.origin === location.origin && url.searchParams.has("v")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      // 새 버전을 넣으면서 같은 파일의 옛 버전은 지움
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(async c => { for (const k of await c.keys()) { const u = new URL(k.url); if (u.pathname === url.pathname && u.search !== url.search) c.delete(k); } c.put(req, copy); }); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(r => r || caches.match("index.html"))));
    return;
  }
  if (/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
  }
});
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "SNUVT", {
    body: d.body || "", icon: "img/icon-192.png", badge: "img/icon-192.png", tag: d.tag || "snuvt", data: { url: d.url || "./#home" },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./#home";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) { c.navigate(target).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
