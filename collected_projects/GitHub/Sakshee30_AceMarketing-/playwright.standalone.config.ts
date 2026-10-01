import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'standalone-frontends.spec.ts',
  timeout:30_000,
  expect:{timeout:8_000},
  fullyParallel:false,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?1:0,
  workers:1,
  reporter:process.env.CI?[['line'],['html',{outputFolder:'playwright-report-standalone',open:'never'}]]:'list',
  use:{trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'},
  projects:[
    {name:'public-desktop',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5175'}},
    {name:'public-mobile',use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5175'}},
    {name:'customer-desktop',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5174'}},
    {name:'customer-mobile',use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5174'}},
    {name:'control-desktop',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5176'}},
    {name:'control-mobile',use:{...devices['Pixel 7'],baseURL:'http://127.0.0.1:5176'}}
  ],
  webServer:[
    {command:'npm run dev:public-site -- --host 127.0.0.1',url:'http://127.0.0.1:5175',reuseExistingServer:!process.env.CI,timeout:120_000,stdout:'pipe',stderr:'pipe'},
    {command:'npm run dev:customer-app -- --host 127.0.0.1',url:'http://127.0.0.1:5174',reuseExistingServer:!process.env.CI,timeout:120_000,stdout:'pipe',stderr:'pipe'},
    {command:'npm run dev:platform-admin -- --host 127.0.0.1',url:'http://127.0.0.1:5176',reuseExistingServer:!process.env.CI,timeout:120_000,stdout:'pipe',stderr:'pipe'}
  ]
})
