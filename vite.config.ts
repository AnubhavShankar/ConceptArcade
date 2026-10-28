import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { seoPlugin } from './scripts/lib/seo-plugin';

export default defineConfig({
  // Relative base so the site works from https://<user>.github.io/<repo>/
  base: './',
  plugins: [seoPlugin()],
  resolve: {
    alias: { '@core': fileURLToPath(new URL('./src/core', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // Importing the whole catalog and driving canvas games is slow on a busy or cold runner; fail on logic, not on load.
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
