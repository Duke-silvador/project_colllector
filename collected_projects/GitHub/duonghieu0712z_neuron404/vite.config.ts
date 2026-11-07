import process from 'node:process';

import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'NEURON404_');
    for (const name of [
        'NEURON404_DATA_DIR',
        'NEURON404_AUTH_TOKEN',
        'NEURON404_READ_TOKEN',
        'NEURON404_PUBLIC_URL',
    ]) {
        if (env[name] && !process.env[name]) {
            process.env[name] = env[name];
        }
    }

    return {
        build: {
            minify: true,
            sourcemap: false,
        },
        plugins: [
            tailwindcss(),
            sveltekit({
                compilerOptions: {
                    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
                    runes: ({ filename }) =>
                        filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
                },

                adapter: adapter(),
            }),
        ],
    };
});
