import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this project from /que-comemos-/, not the domain
  // root, so every asset URL needs that prefix in production. Local dev
  // still runs at "/".
  base: process.env.GITHUB_PAGES ? "/que-comemos-/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
