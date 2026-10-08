import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Production includes the Storefront, Operations ERP, LIC Agent Portal, and Admin Portal.
  // Relative asset URLs keep all standalone portals working on custom domains.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        agentPortal: 'agent-portal/index.html',
        adminInsurance: 'admin-portal/index.html',
        apps: 'apps/index.html'
      }
    }
  }
})
