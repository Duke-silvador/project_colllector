import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/**/*.test.ts'],environment:'node',setupFiles:['./tests/offline-setup.ts']},resolve:{alias:{'server-only':fileURLToPath(new URL('./tests/server-only.ts',import.meta.url))}}});
