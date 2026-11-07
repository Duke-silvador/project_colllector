import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import runtime from './vite.runtime.config.ts';

export default defineConfig(
    mergeConfig(runtime, {
        build: {
            rolldownOptions: {
                input: {
                    server: fileURLToPath(new URL('scripts/api-server.ts', import.meta.url)),
                },
            },
        },
    }),
);
