import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// Tests unitaires (logique de l'app). Les tests mobiles de bout en bout sont dans tests/e2e (Playwright).
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    include: ['tests/unit/**/*.test.{js,jsx}'],
    environment: 'node',
    testTimeout: 20000
  }
});
