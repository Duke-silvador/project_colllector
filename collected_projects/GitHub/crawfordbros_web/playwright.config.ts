import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the real stack: this site's Vite dev server plus the cbes-api Worker
// (with its local D1 and R2) from the sibling checkout. Override with CBES_API_DIR.
const apiDir = process.env.CBES_API_DIR ?? "../api";
// Set E2E_BASE_URL (e.g. http://localhost:4173 after `pnpm build && pnpm preview`) to test the prerendered build.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: `pnpm --dir ${apiDir} db:migrate:local && pnpm --dir ${apiDir} db:seed:local && pnpm --dir ${apiDir} dev`,
      url: "http://localhost:8787/api/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
