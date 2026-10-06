import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { cloudflare } from '@cloudflare/vite-plugin'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import errorOverlay from '@visulima/vite-overlay'

const config = defineConfig({
  server: {
    allowedHosts: ['.e2b.app', '.e2b-juliett.dev'],
  },

  resolve: {
    tsconfigPaths: true,
  },

  ...(process.env.DEV_BUILD && {
    build: {
      target: 'esnext',
      minify: false,
      cssMinify: false,
      sourcemap: false,
      reportCompressedSize: false,
      modulePreload: {
        polyfill: false,
      },
    },
  }),

  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),

    devtools({ injectSource: { enabled: false } }),

    errorOverlay({
      forwardConsole: true,
      forwardedConsoleMethods: ['error', 'warn'],
    }),

    tailwindcss(),

    tanstackStart({
      prerender: {
        enabled: !!process.env.DEV_BUILD,
        autoSubfolderIndex: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: false,
        failOnError: true,
      },
    }),

    viteReact(),
  ],
})

export default config
