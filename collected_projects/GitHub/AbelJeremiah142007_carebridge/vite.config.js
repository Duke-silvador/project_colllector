import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths allow deployment under a GitHub Pages repository path.
  base: './',
});
