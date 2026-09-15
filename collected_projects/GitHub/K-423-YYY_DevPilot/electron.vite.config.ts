import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: resolve(__dirname, 'electron/main.ts') },
      outDir: 'out/main',
      reportCompressedSize: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      // 预加载脚本必须是 CJS（沙箱渲染进程要求），externalizeDepsPlugin 保持零依赖
      lib: { entry: resolve(__dirname, 'electron/preload.ts') },
      outDir: 'out/preload',
      reportCompressedSize: false
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/index.html') },
      outDir: 'out/renderer',
      reportCompressedSize: false
    },
    plugins: [react()]
  }
})
