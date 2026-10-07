import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [react()],
  server: { watch: { ignored: ['**/.gstack/**'] } },
  build: { target: ['es2020', 'safari15.4', 'firefox102', 'chrome109', 'edge109'] },
});
