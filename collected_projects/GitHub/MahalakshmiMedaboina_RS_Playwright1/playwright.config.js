// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 4000,
  },
  reporter: 'html',
  use: { 
    // set the browser to use for the tests (chromium, firefox, or webkit)

    browserName: 'chromium',
    // browserName: 'firefox',
    // browserName: 'webkit', 
    headless: Boolean(process.env.CI),
  },
});

