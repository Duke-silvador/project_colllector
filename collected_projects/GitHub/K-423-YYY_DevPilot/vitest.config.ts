import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // 单测默认串行起见不强制——但涉及 ~/.devpilot 守卫与临时目录的用例需互相隔离，
    // 用 per-file 随机临时目录（fs-simulator 提供），这里保持默认并发。
    testTimeout: 20000,
    hookTimeout: 20000
  }
})
