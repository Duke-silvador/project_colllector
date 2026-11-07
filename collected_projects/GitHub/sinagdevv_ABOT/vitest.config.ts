import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@abot/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@abot/agent": fileURLToPath(new URL("./packages/agent/src/index.ts", import.meta.url)),
    },
  },
});
