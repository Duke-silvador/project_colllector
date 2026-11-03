// Browser smoke tests (decision 0015): npm run test:e2e. They start the client dev server, or
// reuse one already running, and drive Chromium. Kept out of npm run check, which needs no
// browser; CI runs them in a job of their own.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'apps/client/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
