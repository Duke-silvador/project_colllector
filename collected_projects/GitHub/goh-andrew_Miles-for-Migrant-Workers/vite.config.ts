import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the built deck also opens straight from the file system on the booth laptop.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
