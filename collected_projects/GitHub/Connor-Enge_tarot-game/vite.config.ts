import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the site under /tarot-game/; local dev and preview stay at the root.
  base: (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
