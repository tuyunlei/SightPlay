import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite/vitest Plugin type mismatch
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '.github/**',
        'scripts/**',
        'vite.config.ts',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
