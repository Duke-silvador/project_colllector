import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Config PWA — manter alinhada a `src/shared/pwa/cachePolicy.ts` (testes de sincronismo).
 * Cacheia shell (HTML/JS/CSS/WASM) + modelo OCR; nunca .cofre / OPFS / blobs do usuário.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Histórico de Veículos',
        short_name: 'Histórico',
        description:
          'Arquive manutenções veiculares no seu dispositivo. Sem login e sem nuvem de dados.',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#1a3a52',
        theme_color: '#1a3a52',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Alinhado a PWA_PRECACHE_GLOB_PATTERNS
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm,webp}'],
        // Alinhado a PWA_NAVIGATE_FALLBACK / public/_redirects
        navigateFallback: 'index.html',
        // Alinhado a PWA_MAX_FILE_SIZE_TO_CACHE_BYTES (sql.js wasm)
        maximumFileSizeToCacheInBytes: 4194304,
        runtimeCaching: [
          {
            // por.traineddata — OCR_MODEL_WORKBOX_URL_PATTERN / cdn.jsdelivr.net/npm/@tesseract.js-data/por/
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tesseract\.js-data\/por\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hvcf-ocr-model',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Nunca adicionar runtimeCaching para .cofre, blob:, OPFS ou PDFs do usuário.
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
