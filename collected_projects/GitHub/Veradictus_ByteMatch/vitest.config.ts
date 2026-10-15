import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Database tests need TEST_DATABASE_URL (see CONTRIBUTING.md); they skip themselves without it.
    fileParallelism: false,
  },
});
