import { defineConfig } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// The journeys, in a browser against dev. A scenario tagged @fixme is written but not built yet.
const testDir = defineBddConfig({
  features: "features/*.feature",
  steps: "test/features/*.ts",
  outputDir: ".features-gen",
  missingSteps: "fail-on-run",
});

export default defineConfig({
  testDir,
  // A scenario makes its plans and waits for saved versions' results. One that signs in by emailed link may also wait
  // its turn behind another's. A hang fails the run instead of holding dev, which the merge queue shares.
  timeout: 240_000,
  globalTimeout: 15 * 60_000,
  // Dev is shared and small, and its Authentik is sometimes slow. One retry in Actions keeps that from failing a PR.
  retries: process.env["CI"] ? 1 : 0,
  // Each scenario makes its own visitor and data, so they run side by side. Three keeps dev's small Directus from
  // shedding load while platform's queue shares it. Sign-ins through Authentik still take turns (test/features/fixtures.ts).
  fullyParallel: true,
  workers: 3,
  globalSetup: "./test/features/global-setup.ts",
  expect: { timeout: 30_000 },
  reporter: "list",
  use: {
    baseURL: process.env["SAIL_TEAM_URL"] ?? "https://dev.cycsail.team",
    // A typical laptop (AGENTS.md). A phone scenario sets its own.
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
});
