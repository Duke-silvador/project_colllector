import vue from '@vitejs/plugin-vue';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { defineConfig, type Plugin } from 'vite';

const client = fileURLToPath(new URL('./client', import.meta.url));
const dist = fileURLToPath(new URL('./dist', import.meta.url));

/** Writes .br and .gz next to each text asset; server/assets.ts picks them by Accept-Encoding. */
function precompress(): Plugin {
  return {
    name: 'precompress',
    apply: 'build',
    closeBundle() {
      const dir = join(dist, 'assets');
      for (const name of readdirSync(dir).filter((f) => /\.(js|css|svg|json)$/.test(f))) {
        const data = readFileSync(join(dir, name));
        writeFileSync(
          join(dir, `${name}.br`),
          brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
        );
        writeFileSync(join(dir, `${name}.gz`), gzipSync(data, { level: 9 }));
      }
    },
  };
}

export default defineConfig({
  root: client,
  plugins: [vue(), precompress()],
  build: {
    outDir: dist,
    emptyOutDir: true,
    // emoji icons are looked up from one eager glob, so inlining the small ones would put them all in the entry chunk
    assetsInlineLimit: (file) => (file.includes('/assets/emoji/') ? false : undefined),
    rollupOptions: {
      input: {
        host: `${client}/host.html`,
        play: `${client}/play.html`,
      },
    },
  },
});
