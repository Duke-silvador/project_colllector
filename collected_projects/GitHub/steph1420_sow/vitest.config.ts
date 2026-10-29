import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// v0.30.1: same version injection as vite.config.ts so tests see the real package.json version.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'node',
  },
})
