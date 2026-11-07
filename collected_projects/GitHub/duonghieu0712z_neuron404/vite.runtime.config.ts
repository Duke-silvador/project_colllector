import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
    tsconfig: './tsconfig.runtime.json',
    publicDir: false,
    resolve: {
        alias: {
            '#lib': fileURLToPath(new URL('src/lib', import.meta.url)),
        },
    },
    build: {
        ssr: true,
        target: 'node24',
        outDir: 'dist',
        emptyOutDir: true,
        minify: true,
        sourcemap: false,
        rolldownOptions: {
            input: {
                'docker-init': fileURLToPath(new URL('scripts/docker-init.ts', import.meta.url)),
                server: fileURLToPath(new URL('scripts/server.ts', import.meta.url)),
                neuron: fileURLToPath(new URL('scripts/neuron.ts', import.meta.url)),
                maintenance: fileURLToPath(new URL('scripts/maintenance.ts', import.meta.url)),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name]-[hash].js',
            },
        },
    },
});
