import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { defineConfig, type Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Emit the SPA rewrite config into dist/ so the routing rules always travel
 * with the build output. Static deployments of dist (drag-and-drop / CLI
 * upload) then serve /c/:communitySlug/:token — and every other deep link —
 * as index.html instead of Vercel's edge 404, with zero per-community setup.
 */
function emitVercelConfig(): Plugin {
  return {
    name: 'emit-vercel-config',
    apply: 'build',
    generateBundle() {
      try {
        this.emitFile({
          type: 'asset',
          fileName: 'vercel.json',
          source: readFileSync(path.resolve(__dirname, 'vercel.json'), 'utf8'),
        });
      } catch {
        // No vercel.json in the project root — nothing to emit.
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), emitVercelConfig()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
