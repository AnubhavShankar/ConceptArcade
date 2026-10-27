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
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
