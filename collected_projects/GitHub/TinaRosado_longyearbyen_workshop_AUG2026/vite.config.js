import { defineConfig } from 'vite'

export default defineConfig({
    // Relative base so the build works when served from a subpath
    // (e.g. GitHub Pages at /svalbard-workshop/).
    base: './',
    build: {
        outDir: 'docs',
        emptyOutDir: true,
    },
})
