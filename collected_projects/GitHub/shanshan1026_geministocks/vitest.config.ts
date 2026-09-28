import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Pure-logic tests run in node by default; DOM-dependent test files opt in
    // to a browser-like environment with `// @vitest-environment happy-dom`.
    environment: 'node',
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, './components'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@services': path.resolve(__dirname, './services'),
    },
  },
})
