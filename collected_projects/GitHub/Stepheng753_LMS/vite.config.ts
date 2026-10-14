import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vite blocks unknown Host headers. Allow our domains (a leading dot includes subdomains) so nginx can proxy to it.
    allowedHosts: ['.crossroadstutoring.com', '.stepheng753.com'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
