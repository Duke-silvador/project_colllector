import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri 在 dev 模式下按固定端口加载前端，所以 strictPort 必须为 true，
// 否则端口被占用时 Vite 会静默换端口，导致 Tauri 窗口白屏。
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
