import { defineConfig } from 'vitest/config'

/**
 * 库自己的测试配置 —— 不依赖宿主仓库的任何设置。
 *
 * 这一点是"能单独成 repo"的硬条件:把 packages/engine 整个搬到别处,
 * `bun install && bun test` 就该能跑起来,而不是"得先有一个 Vue 工程"。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    testTimeout: 20000
  }
})
