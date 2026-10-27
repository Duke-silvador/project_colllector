importScripts('./runtime/settings.js?v=13', './runtime/storage.js?v=10', './runtime/vendor/engine/index.js?v=10');
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const base = new URL('./', self.location.href);
const engineReady = xyferPrepareStorage(base.pathname).then(() => new ScramjetServiceWorker());
let configured;
function configuredEngine() {
  if (!configured) configured = engineReady.then(async engine => {
    // A config message sets the instance property but does not initialize the
    // engine's module globals. Force the documented storage initialization path.
    engine.config = undefined;
    await engine.loadConfig();
    return engine;
  }).catch(error => { configured = null; throw error; });
  return configured;
}
const dataPath = base.pathname + 'runtime/data/';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type === 'xyfer-check') event.ports[0]?.postMessage({ type: 'xyfer-ready' });
});
async function handle(event) {
  const url = new URL(event.request.url);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return fetch(event.request);
  if (url.pathname.startsWith(dataPath)) {
    try {
      const value = url.pathname.slice(dataPath.length).split('').reverse().join('').replaceAll('-', '+').replaceAll('_', '/');
      const target = atob(value + '='.repeat((4 - value.length % 4) % 4));
      if (!xyferSettings.allowedTarget(target)) return new Response('Unable to load.', { status: 403 });
      const engine = await configuredEngine();
      // These are raw file/API requests from the app, not rewritten documents.
      // An ordinary app referrer cannot be decoded as an encoded target URL.
      const request = new Request(event.request, { referrer: '', referrerPolicy: 'no-referrer' });
      return await engine.fetch({ request, clientId: event.clientId });
    } catch { return new Response('Unable to load. Please retry.', { status: 502 }); }
  }
  if (event.request.mode === 'navigate') {
    let file;
    if (url.pathname === base.pathname + 'index.svg' || url.pathname === base.pathname) file = new URL('index.html', base);
    else if (url.pathname.endsWith('/')) file = new URL(url.pathname + 'index.html', base);
    else if (/\.html?$/.test(url.pathname)) file = url;
    if (file) {
      const response = await fetch(file, { cache: 'no-store' });
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Cache-Control', 'no-store');
      headers.delete('Content-Length');
      headers.delete('Content-Encoding');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
  }
  return fetch(event.request);
}
self.addEventListener('fetch', event => event.respondWith(handle(event)));
