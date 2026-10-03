import { defineConfig, devices } from "@playwright/test";

// E2E layer: boots the PRODUCTION standalone server on an isolated port
// with its own scratch database (db/e2e.db, schema-pushed + seeded by the
// global setup), then drives the real UI in Chromium.
//
// Prerequisites: `bun run build` (the standalone server must exist).
// Run with: `bun run test:e2e`.
//
// Specs sign in through the real /login form where an authenticated
// surface is under test — the auth flow itself is part of the coverage.
//
// The unit layer stays in Vitest (see vitest.config.ts — it matches
// *.test.ts only, so these *.spec.ts files are never picked up twice).

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const E2E_DATABASE_URL = "file:../db/e2e.db";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // one worker: the specs share a single seeded SQLite file
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "bun .next/standalone/server.js",
    url: `${BASE_URL}/api/health`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "playwright-e2e-session-secret",
    } as Record<string, string>,
  },
});
