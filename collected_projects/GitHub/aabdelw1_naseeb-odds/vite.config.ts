import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the root of naseebodds.com (a GitHub Pages custom domain), so no base path.
export default defineConfig({
  plugins: [react()],
})
