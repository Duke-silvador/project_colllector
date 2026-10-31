import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Racine de l'interface : ui/. Les polices (assets/fonts) sont servies sous /fonts.
export default defineConfig({
  root: "ui",
  publicDir: "../assets",
  plugins: [svelte()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true, target: "chrome120", chunkSizeWarningLimit: 2000 },
  test: { include: ["src/**/*.test.ts"] },
});
