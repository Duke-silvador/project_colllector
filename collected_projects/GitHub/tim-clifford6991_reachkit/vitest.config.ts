import path from "node:path";
import { defineConfig } from "vitest/config";
import { LIVE_SCHEMA_TESTS } from "./scripts/live-schema-tests.mjs";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    // Node environment by default; jsdom for tests/ui/** except its layout
    // suite, which needs a real browser (ADR-093 rests-on row 1) and so gets
    // its own node-environment project with `browser.ts` as global setup.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          exclude: ["tests/ui/**", "node_modules/**", ...LIVE_SCHEMA_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/ui/**/*.test.{ts,tsx}"],
          exclude: ["tests/ui/layout/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "layout",
          environment: "node",
          include: ["tests/ui/layout/**/*.test.ts"],
          globalSetup: ["tests/ui/layout/browser.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: LIVE_SCHEMA_TESTS,
          fileParallelism: false,
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
