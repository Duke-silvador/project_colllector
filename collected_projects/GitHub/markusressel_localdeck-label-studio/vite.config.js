import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5184,
  },
  base: './', // for github pages
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
