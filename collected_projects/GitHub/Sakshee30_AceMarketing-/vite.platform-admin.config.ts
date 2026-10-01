import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root:'frontend/platform-admin',
  plugins:[react()],
  build:{outDir:'../../dist/platform-admin',emptyOutDir:true,manifest:true},
  server:{port:5176,host:true,proxy:{'/control-api':{target:'http://127.0.0.1:3002',changeOrigin:true}}},
  preview:{port:4176,host:true}
})
