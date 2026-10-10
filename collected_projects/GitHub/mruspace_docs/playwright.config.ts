import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  workers: process.env.CI ? 4 : 8,
  reporter: process.env.CI ? 'line' : 'list',
  use: { baseURL: 'http://127.0.0.1:4339' },
  webServer: {
    command: 'node scripts/serve.mjs dist 4339',
    url: 'http://127.0.0.1:4339/',
    reuseExistingServer: !process.env.CI,
  },
});
