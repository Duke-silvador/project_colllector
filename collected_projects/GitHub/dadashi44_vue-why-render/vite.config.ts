import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [vue()],
    build: {
        target: 'es2022',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'VueWhyRender',
            formats: ['es', 'cjs'],
            fileName: format => (format === 'es' ? 'index.js' : 'index.cjs'),
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                globals: { vue: 'Vue' },
                // Пакет отдаёт и default, и именованные экспорты.
                exports: 'named',
            },
        },
        // Стили панели инлайнятся через ?inline и уезжают в JS — отдельный css не нужен.
        cssCodeSplit: false,
        // Сорсмапы не публикуем: бандл после постобработки читаемый,
        // а тащить карты к переписанному файлу смысла нет.
        sourcemap: false,
        // Комментарии из бандла вырезаются намеренно: они у нас на кириллице,
        // а переписывающие код плагины (тот же @rollup/plugin-commonjs)
        // считают смещения в байтах — из-за многобайтных символов вставки
        // уезжают и на выходе получается битый синтаксис. Ломалась прод-сборка
        // приложения-потребителя. Имена не мангрим, sourcemap прилагается.
        minify: false,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        // Без этого vitest подсовывает пустышку вместо panel.css?inline,
        // и проверить инъекцию стилей в shadow DOM нечем.
        css: true,
        setupFiles: ['./test/setup.ts'],
        include: ['test/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,vue}'],
            exclude: ['src/shims.d.ts', 'src/types.ts'],
        },
    },
})
