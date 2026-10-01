import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:30_000,
  expect:{timeout:8_000},
  fullyParallel:true,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?1:0,
  workers:process.env.CI?2:undefined,
  reporter:process.env.CI?[['line'],['html',{outputFolder:'playwright-report',open:'never'}]]:'list',
  use:{
    baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:5173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure'
  },
  projects:[
    {name:'chromium-desktop',use:{...devices['Desktop Chrome']}},
    {name:'chromium-mobile',use:{...devices['Pixel 7']}}
  ],
  webServer:{
    command:'npm run dev:frontend -- --host 127.0.0.1',
    url:'http://127.0.0.1:5173',
    reuseExistingServer:!process.env.CI,
    timeout:120_000,
    stdout:'pipe',
    stderr:'pipe'
  }
})
