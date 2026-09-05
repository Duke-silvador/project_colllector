/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

// Astro's own Vite pipeline, so `src/data/work.ts` can import images.
export default getViteConfig({
	test: {
		include: ['tests/unit/**/*.test.ts', 'tests/build/**/*.test.ts'],
		environment: 'node',
	},
});
