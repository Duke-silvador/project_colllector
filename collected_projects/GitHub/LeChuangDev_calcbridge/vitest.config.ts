import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * 全仓库单测入口。
 * 这里只配置路径别名与测试范围；业务代码零依赖测试框架，packages 与 apps 共享同一套配置。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'apps/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
