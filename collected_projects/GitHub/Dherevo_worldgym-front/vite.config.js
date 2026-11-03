import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({

  envDir: 'src/config/environments',
  envPrefix: '_',

  plugins: [vue()],
  server: {
    open: true,
    host: '0.0.0.0'
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': false,
  }
})