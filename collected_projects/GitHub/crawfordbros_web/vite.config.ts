import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_DEV_URL = process.env.CBES_API_DEV_URL ?? "http://localhost:8787";

/** Builds require values from .env.local locally or Render environment variables in production. */
function requireEnv(names: string[]): Plugin {
  return {
    name: "cbes-require-env",
    apply: "build",
    configResolved(config) {
      if (config.mode === "development") return;
      const missing = names.filter((name) => !config.env[name]);
      if (missing.length) {
        throw new Error(
          `Build stopped: set ${missing.join(", ")} in Render's Environment settings, or .env.local for local builds (see .env.example).`,
        );
      }
    },
  };
}

/** Production allows crawling; every other build (staging, local) is noindex. */
function robots(): Plugin {
  let mode = "development";
  return {
    name: "cbes-robots",
    configResolved(config) {
      mode = config.mode;
    },
    generateBundle() {
      const source =
        mode === "production"
          ? "User-agent: *\nAllow: /\nDisallow: /portal\nDisallow: /admin\nDisallow: /report/\n\nSitemap: https://cbenvironments.com/sitemap.xml\n"
          : "User-agent: *\nDisallow: /\n";
      this.emitFile({ type: "asset", fileName: "robots.txt", source });
    },
  };
}

// Local development: http://test.cbenvironments.com:5173 (see README for the DNS or hosts entry).
// /api is proxied to the cbes-api Worker running with `pnpm dev` in that repo.
export default defineConfig({
  // Refuse to ship forms that can never pass the spam check.
  plugins: [react(), tailwindcss(), robots(), requireEnv(["VITE_TURNSTILE_SITE_KEY"])],
  define: { __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()) },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ["test.cbenvironments.com", "localhost"],
    proxy: { "/api": { target: API_DEV_URL } },
  },
  preview: {
    port: 4173,
    allowedHosts: ["test.cbenvironments.com", "localhost"],
    proxy: { "/api": { target: API_DEV_URL } },
  },
});
