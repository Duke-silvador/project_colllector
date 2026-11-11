import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

/** Path dasar GitHub Pages: https://<user>.github.io/instasmart/ */
const BASE = '/instasmart/';

export default defineConfig({
  base: BASE,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Instasmart',
        short_name: 'Instasmart',
        description: 'Smart-scrolling: feed ala Instagram yang isinya ilmu hukum pilihanmu.',
        lang: 'id',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,mp4,webm,woff2}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 700 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
