import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'] },
  build: { rollupOptions: { output: { manualChunks: { map: ['maplibre-gl'], excel: ['xlsx'] } } }, chunkSizeWarningLimit: 1200 },
});
