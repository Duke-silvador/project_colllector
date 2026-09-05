import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE = (process.env.BASE_PATH ?? '/prero').replace(/\/$/, '');

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'list' : [['list']],
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['iPhone 13'] } },
	],
	// Tests run against the built output, which is what actually ships.
	// `astro preview` daemonises itself without a TTY, so Playwright would see
	// the process exit immediately; this serves dist/ in the foreground instead.
	webServer: {
		command: 'npm run build && node scripts/serve-dist.mjs',
		url: `http://localhost:${PORT}${BASE}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
