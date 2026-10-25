import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // served through the Cloudflare tunnel; Vite rejects unknown Host headers
    allowedHosts: ['.clipboard-share.com']
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: ['.clipboard-share.com']
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('postprocessing')) {
              return 'vendor-three-webgl';
            }
            if (id.includes('shiki')) {
              return 'vendor-shiki-lean4';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui-motion';
            }
            if (id.includes('katex')) {
              return 'vendor-katex-math';
            }
            return 'vendor-core';
          }
        }
      }
    }
  }
});
