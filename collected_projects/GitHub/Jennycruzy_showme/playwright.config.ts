import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    permissions: ['camera', 'microphone'],
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${resolve('.cache/camera.y4m')}`] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
