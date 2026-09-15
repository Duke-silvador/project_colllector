import { defineConfig } from '@playwright/test'

/**
 * 二期阶段 2：默认让 E2E 里的 Electron **不读真实 `~/.codex/sessions`**。
 *
 * 理由（两条都很实在）：
 *   1. 测量类用例（冷启动 / 帧间隔 / 风暴停顿）不能被"开发机上的历史日志回扫"干扰读数；
 *   2. 测试不该依赖开发机恰好存在的会话文件，否则就是环境依赖型的假绿。
 * 需要验证日志数据源的用例（`tests/e2e/codex-log.spec.ts`）会自己覆盖这个变量，
 * 指向它自己造的临时会话目录。
 */
process.env['DEVPILOT_CODEX_LOG_SOURCE'] = 'off'

/**
 * E2E 配置（对话二搭骨架，对话三补齐剧本 A–E / 图表联动 / 诊断 / 压测 / Smoke）。
 *
 * **为什么 workers=1**：本套 E2E 里有多个**测量墙钟时间**的用例——
 *   - `perf.spec.ts` ①风暴事件循环停顿、②帧间隔 p95、③冷启动、④FS→UI 延迟
 *   - `smoke.spec.ts` 步骤1 冷启动 <3s
 * 它们各自启动一个真实 Electron 并跑重负载（2000 fs 事件/s、10 万节点、250 文件写入）。
 * 并发执行时 CPU 争用会让这些读数**直接失真**（实测：并发下冷启动 3.2s、帧间隔 p95 40ms，
 * 单独跑分别是 0.6s / 7.6ms）。并发跑通过、串行跑失败（反之亦然）都不算证据，
 * 所以这里默认串行，保证读数与判定可复现。
 *
 * 只跑功能性用例（不含 perf/smoke）时可以加 `--workers=4` 提速。
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  // 测量类用例必须独占机器（见上）；功能性用例可用 --workers=4 覆盖
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    trace: 'off'
  }
})
