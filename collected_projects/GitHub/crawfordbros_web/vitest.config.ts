import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
    // Unit tests must not depend on developer credentials or the live challenge service.
    "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(""),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
