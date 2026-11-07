import { defineConfig } from '@playwright/test'

/**
 * Automated UI acceptance suite.
 * Runs against the PRODUCTION build (vite preview) on desktop / tablet / mobile.
 *   npm run test:e2e            → run everything
 *   npm run test:e2e:update     → refresh visual baselines after an intended design change
 *   npm run test:report         → open the HTML report (screenshots, traces, diffs)
 */
// Local Windows: real GPU via ANGLE/D3D11. CI (Linux, no GPU): WebGL off → app uses its Canvas 2D fallback.
const gpu = process.env.CI
  ? ['--disable-webgl', '--disable-3d-apis']
  : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/report' }]],
  outputDir: 'tests/results',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: gpu },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 240_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'laptop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'mobile-small', use: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true } },
  ],
})
