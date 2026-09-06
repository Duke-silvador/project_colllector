/* Kvitteringer, mjau mjau - bakgrunnsskript v3.10: nett først, hurtiglager som reserve (samme som NFK Operations 8.10) */
const LAGER = "stine-app-v3-10";
const GRUNN = ["./index.html", "./manifest.webmanifest", "./ikon-192.png", "./ikon-512.png", "./lyd/k01.mp3", "./lyd/k02.mp3", "./lyd/k03.mp3", "./lyd/k04.mp3", "./lyd/k05.mp3", "./lyd/k06.mp3", "./lyd/k15.mp3", "./lyd/k24.mp3", "./lyd/k25.mp3", "./lyd/k27.mp3", "./lyd/k28.mp3", "./lyd/k30.mp3", "./lyd/k31.mp3", "./lyd/k43.mp3", "./lyd/k44.mp3", "./lyd/k45.mp3", "./lyd/k46.mp3", "./lyd/k47.mp3", "./lyd/k49.mp3", "./lyd/k50.mp3", "./lyd/k52.mp3", "./lyd/k53.mp3", "./lyd/k54.mp3", "./lyd/k55.mp3", "./lyd/k56.mp3", "./lyd/k57.mp3", "./lyd/k58.mp3", "./lyd/k59.mp3", "./lyd/k60.mp3"];

self.addEventListener("install", h => {
  h.waitUntil(caches.open(LAGER).then(l => l.addAll(GRUNN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", h => {
  h.waitUntil(
    caches.keys()
      .then(navn => Promise.all(navn.filter(n => n !== LAGER).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", h => {
  const f = h.request;
  if (f.method !== "GET") return;
  const adresse = new URL(f.url);
  if (adresse.origin !== self.location.origin) return;
  h.respondWith(
    fetch(f)
      .then(svar => {
        if (svar && svar.ok){
          const kopi = svar.clone();
          caches.open(LAGER).then(l => l.put(f, kopi)).catch(() => {});
        }
        return svar;
      })
      .catch(() =>
        caches.match(f).then(t => t || (f.mode === "navigate" ? caches.match("./index.html") : undefined))
      )
  );
});

/* Varsler om frister (v3.0): meldingen sendes av jobben i lageret kl. 19 */
self.addEventListener("push", h => {
  let d = {};
  try{ d = h.data ? h.data.json() : {}; }catch{ d = { tekst: h.data ? h.data.text() : "" }; }
  const tittel = d.tittel || "Kvitteringer, mjau mjau";
  h.waitUntil(self.registration.showNotification(tittel, {
    body: d.tekst || "",
    icon: "./ikon-192.png",
    badge: "./ikon-192.png",
    tag: d.tag || "frist",
    data: { url: d.url || "./index.html" }
  }));
});

self.addEventListener("notificationclick", h => {
  h.notification.close();
  const maal = new URL((h.notification.data && h.notification.data.url) || "./index.html", self.location.href).href;
  h.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(liste => {
    for (const k of liste){ if ("focus" in k){ k.navigate(maal).catch(() => {}); return k.focus(); } }
    return self.clients.openWindow(maal);
  }));
});
