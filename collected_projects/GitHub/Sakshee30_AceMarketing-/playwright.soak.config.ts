import {defineConfig,devices} from '@playwright/test'

export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'frontend-soak.spec.ts',
  timeout:3*60*60*1000,
  expect:{timeout:10_000},
  workers:1,
  reporter:[['line'],['html',{outputFolder:'playwright-report-soak',open:'never'}]],
  use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:5174',trace:'retain-on-failure'},
  projects:[{name:'customer-soak',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev:customer-app -- --host 127.0.0.1',url:'http://127.0.0.1:5174',reuseExistingServer:false,timeout:120_000,stdout:'pipe',stderr:'pipe'}
})
