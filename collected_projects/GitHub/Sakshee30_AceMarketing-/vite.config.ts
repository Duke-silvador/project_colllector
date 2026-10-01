import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts=(process.env.VITE_ALLOWED_HOSTS||'localhost,127.0.0.1')
  .split(',')
  .map(value=>value.trim())
  .filter(Boolean)

export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
    manifest: true,
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
        configure(proxy) {
          proxy.on('error', (_error, _req, response) => {
            const res=response as any
            if (res.headersSent || res.destroyed) return
            if (typeof res.writeHead!=='function') {
              if (typeof res.destroy==='function') res.destroy()
              return
            }
            res.writeHead(503, {'Content-Type': 'application/json'})
            if (typeof res.end==='function') res.end(JSON.stringify({error:'Local API is unavailable. Run npm run dev to start the frontend and API together.'}))
          })
        },
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
})
