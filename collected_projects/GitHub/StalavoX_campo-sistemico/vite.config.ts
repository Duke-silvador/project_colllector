import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/campo-sistemico/' : '/',
  plugins: [vue(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/*.svg', 'icons/*.png', 'twemoji/assets/svg/*.svg'],
    manifest: {
      name: 'Campo Sistémico', short_name: 'Campo Sistémico', description: 'Organización visual de sesiones de trabajo sistémico.',
      theme_color: '#172c36', background_color: '#f4f6f3', display: 'standalone', start_url: './',
      icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' }]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'], navigateFallback: 'index.html', cleanupOutdatedCaches: true }
  })],
  test: { environment: 'node' }
})
