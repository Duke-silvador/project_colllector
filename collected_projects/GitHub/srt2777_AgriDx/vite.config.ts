import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { versionHistoryPlugin } from './scripts/version-history.mjs';
import { execFileSync } from 'node:child_process';

// A source archive can still be built locally; unknown builds never auto-reload.
function resolveBuildCommit() {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^[a-f0-9]{40}$/.test(commit) ? commit : '';
  } catch { return ''; }
}
const buildCommit = resolveBuildCommit();

export default defineConfig({
  define: { __AGRIDX_DEV_PREVIEW__: 'false', __AGRIDX_BUILD_COMMIT__: JSON.stringify(buildCommit) },
  plugins: [react(), tailwindcss(), versionHistoryPlugin(__dirname), {
    name: 'agridx-build-identity',
    apply: 'build',
    transformIndexHtml: () => buildCommit ? [{ tag: 'meta', attrs: { name: 'agridx-build-commit', content: buildCommit }, injectTo: 'head' as const }] : [],
  }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/'),
      '@shared': path.resolve(__dirname, './shared/'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('postprocessing') || id.includes('@react-three/postprocessing')) return 'postfx';
          if (id.includes('node_modules/three/') || id.includes('three-stdlib')) return 'three';
          if (id.includes('@react-three/')) return 'r3f';
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
