/**
 * Copyright 2026 swemre (emre@swemre.com). All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 with the Commons Clause
 * License Condition v1.0 (the "License"). Personal use of this code and
 * content is permitted; any commercial gain requires prior written
 * permission from the copyright holder. See the LICENSE file for full terms.
 *
 * Contact: emre@swemre.com
 */

import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import {execFile} from 'node:child_process'
import {existsSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {defineConfig, loadEnv, type Plugin} from 'vite'
import {siteDefaults} from './src/config/siteDefaults.ts'

// Regenerates public/rss.xml when content data changes during `npm run dev`.
function rssPlugin(): Plugin {
  const run = () =>
    execFile(
      process.execPath,
      [
        '--experimental-strip-types',
        '--no-warnings',
        'scripts/generate-rss.mjs',
      ],
      (error, _stdout, stderr) => {
        if (error) console.error(stderr)
      },
    )
  return {
    name: 'swemre-rss',
    apply: 'serve',
    configureServer(server) {
      server.watcher.on('change', file => {
        if (/[\\/]src[\\/](database|config)[\\/]/.test(file)) run()
      })
    },
  }
}

// index.html names this website's URL and language, so one build serves one website
function siteEnvPlugin(mode: string): Plugin {
  const env = {...loadEnv(mode, process.cwd()), ...process.env}
  const siteUrl = (env.VITE_SITE_URL || siteDefaults.siteUrl).replace(
    /\/+$/,
    '',
  )
  const locale = env.VITE_LOCALE || siteDefaults.locale
  return {
    name: 'swemre-site-env',
    transformIndexHtml: html =>
      html
        .replaceAll('%SITE_URL%', siteUrl)
        .replace('<html lang="en">', `<html lang="${locale}">`),
  }
}

// Serves dist/<route>/index.html of scripts/prerender.mjs for /<route> in `vite preview`, like the
// production server; other routes keep the SPA fallback
function prerenderedRoutesPlugin(): Plugin {
  return {
    name: 'swemre-prerendered-routes',
    configurePreviewServer(server) {
      const outDir = server.config.build.outDir
      server.middlewares.use((request, _response, next) => {
        const path = request.url?.split('?')[0] ?? '/'
        if (
          /^\/[a-z0-9/-]+$/i.test(path) &&
          !path.endsWith('/') &&
          existsSync(join(outDir, path, 'index.html'))
        ) {
          request.url = `${path}/index.html`
        }
        next()
      })
    },
  }
}

// The block views shared with swemre-press live next to both projects
const sharedBlocks = fileURLToPath(
  new URL('../swemre-blocks/src/index.ts', import.meta.url),
)

export default defineConfig(({mode}) => ({
  resolve: {
    alias: {'swemre-blocks': sharedBlocks},
    // One React for the site and the shared package
    dedupe: ['react', 'react-dom'],
  },
  server: {fs: {allow: ['..']}},
  plugins: [
    rssPlugin(),
    siteEnvPlugin(mode),
    prerenderedRoutesPlugin(),
    tailwindcss(),
    react(),
    babel({presets: [reactCompilerPreset()]}),
  ],
}))
