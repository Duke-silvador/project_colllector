import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/** A new cache per build; a waiting update activates only after old tabs close. */
function offlineReplay(): Plugin {
  return {
    name: 'snack-sprout-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle);
      const digest = createHash('sha256');
      for (const file of Object.values(bundle)) digest.update(file.type === 'chunk' ? file.code : file.source);
      for (const file of ['manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png']) {
        digest.update(readFileSync(`public/${file}`));
      }
      const version = digest.digest('hex').slice(0, 12);
      const assets = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', ...files.filter((file) => file !== 'index.html').map((file) => `/${file}`)];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'snack-sprout-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('snack-sprout-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('/index.html'))));
  } else if (ASSETS.includes(url.pathname)) {
    // Static files are identical for every Origin; Vite preview sends Vary: Origin.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname, { ignoreVary: true }).then(cached => cached || fetch(event.request))));
  }
});
` });
    },
  };
}

export default defineConfig({
  plugins: [offlineReplay()],
  build: { target: ['es2022', 'safari16'], assetsInlineLimit: 0 },
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
});
