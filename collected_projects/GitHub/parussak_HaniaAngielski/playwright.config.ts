import { defineConfig } from '@playwright/test';
const publishedURL = process.env.HANIA_BASE_URL;
const built = process.env.HANIA_TEST_BUILD === '1';
const localURL = `http://127.0.0.1:5184/${built?'HaniaAngielski/':''}`;
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  use: { baseURL: publishedURL ?? localURL, browserName: 'chromium', channel: process.env.HANIA_BROWSER_CHANNEL || undefined, headless: true, serviceWorkers: 'block' },
  webServer: publishedURL ? undefined : { command: built ? 'node scripts/serve-built.mjs' : `${process.platform==='win32'?'npm.cmd':'npm'} run dev -- --port 5184 --strictPort`, url: localURL, reuseExistingServer: false },
});
