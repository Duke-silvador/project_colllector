import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    port: 5180,
    strictPort: true,
    hmr: { overlay: false },
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true }
    }
  }
});
