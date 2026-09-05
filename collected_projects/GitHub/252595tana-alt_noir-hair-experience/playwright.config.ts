import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel: "chrome",
  },
  projects: [
    {
      name: "desktop",
      testMatch: ["**/experience.spec.ts", "**/webgl.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      testMatch: ["**/experience.spec.ts", "**/webgl.spec.ts"],
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
    {
      name: "tablet",
      testMatch: ["**/experience.spec.ts", "**/webgl.spec.ts"],
      use: {
        viewport: { width: 820, height: 1180 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "logic",
      testMatch: ["**/selection.spec.ts", "**/production.spec.ts"],
    },
  ],
});
