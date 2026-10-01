import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root:'frontend/customer-app',
  plugins:[react()],
  build:{outDir:'../../dist/customer-app',emptyOutDir:true,manifest:true},
  server:{port:5174,host:true,proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:true}}},
  preview:{port:4174,host:true}
})
