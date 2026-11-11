import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { sitePages, sitePageNames } from './src/build/site.ts';

export default defineConfig({
  base: './',
  appType: 'mpa',
  publicDir: false,
  plugins: [sitePages()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    rolldownOptions: { input: Object.fromEntries(sitePageNames.map(name => [name,resolve(`${name}-dev.html`)])) },
  },
  server: { watch: { ignored: ['**/archive/**', '**/runs/**', ...sitePageNames.map(name => resolve(`${name}.html`)), `${resolve('assets')}/**`] } },
});
