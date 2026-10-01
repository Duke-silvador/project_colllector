import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'frontend-matrix.spec.ts',
  timeout:30_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  retries:1,
  workers:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report-matrix',open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:5173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  projects:[
    {name:'chromium-desktop',use:{...devices['Desktop Chrome']}},
    {name:'firefox-desktop',use:{...devices['Desktop Firefox']}},
    {name:'webkit-desktop',use:{...devices['Desktop Safari']}},
    {name:'chromium-mobile',use:{...devices['Pixel 7']}}
  ],
  webServer:{
    command:'npm run dev:frontend -- --host 127.0.0.1',
    url:'http://127.0.0.1:5173',
    reuseExistingServer:false,
    timeout:120_000,
    stdout:'pipe',
    stderr:'pipe'
  }
})
