import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// BASE_PATH permet l'hébergement dans un sous-dossier (ex. GitHub Pages : /shiny-tracker/).
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  build: { chunkSizeWarningLimit: 700 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Shiny Hunter Pro',
        short_name: 'Shiny Hunter',
        description: 'Pokédex shiny, compteur de rencontres, journal et statistiques de chasse aux Pokémon chromatiques.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#020617',
        theme_color: '#020617',
        categories: ['games', 'utilities'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Compteur de chasse', short_name: 'Chasses', url: `${base}?tab=hunts`, icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Pokédex shiny', short_name: 'Pokédex', url: `${base}?tab=dex`, icons: [{ src: 'icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Les bibliothèques de l'assistant IA (≈ 600 Ko) ne sont téléchargées qu'à la première utilisation.
        globIgnores: ['**/assets/claude-*.js', '**/assets/gemini-*.js'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/(claude|gemini)-[\w-]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'assistant', expiration: { maxEntries: 10 } }
          },
          {
            urlPattern: ({ url }) => url.hostname === 'raw.githubusercontent.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'sprites',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
