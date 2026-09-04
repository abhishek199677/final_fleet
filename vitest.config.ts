import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Playwright e2e specs run separately via `pnpm test:e2e`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
