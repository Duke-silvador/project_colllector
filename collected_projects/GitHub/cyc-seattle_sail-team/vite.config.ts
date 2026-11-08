import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Plugin } from "vite";
import { defineConfig, type TestProjectInlineConfiguration } from "vitest/config";

/** Serves MSW's worker in `mise run dev` only, so it never ships. Scope `/` lets it answer for every page. */
function mockServiceWorker(): Plugin {
  const worker = createRequire(import.meta.url).resolve("msw/mockServiceWorker.js");
  return {
    name: "mock-service-worker",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/_app/mockServiceWorker.js", (_, res) => {
        res.setHeader("Content-Type", "text/javascript");
        res.setHeader("Service-Worker-Allowed", "/");
        res.end(readFileSync(worker));
      });
    },
  };
}

function stories(theme: "light" | "dark", viewport: { width: number; height: number }): TestProjectInlineConfiguration {
  return {
    extends: true,
    plugins: [storybookTest({ configDir: new URL("./.storybook", import.meta.url).pathname })],
    define: { "import.meta.env.VITE_STORY_THEME": JSON.stringify(theme) },
    test: {
      name: `storybook-${theme}`,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        viewport,
        instances: [{ browser: "chromium" }],
      },
    },
  };
}

export default defineConfig({
  // Under one path of its own, so the built files never collide with a page's path.
  build: { assetsDir: "_app" },
  // Before react(), so the route tree exists when React's transform runs.
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss(), mockServiceWorker()],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  // Found up front, so Vite doesn't find them mid-run and reload the story tests.
  optimizeDeps: {
    include: [
      "@base-ui/react/**",
      "@tanstack/react-router",
      "recharts",
      "class-variance-authority",
      "cn",
      "lucide-react",
      "sonner",
      "storybook/test",
    ],
  },
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["test/**/*.test.{ts,tsx}"] } },
      // Every story is a test: it renders in Chromium and must pass axe, light at a laptop's size and dark at a phone's.
      stories("light", { width: 1440, height: 900 }),
      stories("dark", { width: 390, height: 844 }),
    ],
  },
});
