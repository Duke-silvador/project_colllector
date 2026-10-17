import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.DEPLOY_TARGET === 'github-pages' ? '/turoasis.com/' : '/',
  server: {
    proxy: {
      '/api': {
        target: 'https://turoasis.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})