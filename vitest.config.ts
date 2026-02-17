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
        'playwright.config.ts',
        'e2e/**', // E2E test scripts — not unit test targets
        'index.tsx', // App entry/mount — no business logic
        'features/auth/AuthProvider.tsx', // Context Provider shell — no logic
        'features/auth/authContext.ts', // Context definition — no logic
        'features/auth/useAuthContext.ts', // useContext wrapper — no logic
        'features/ai/ChatMessageList.tsx', // Pure message rendering
        'features/ai/QuickActions.tsx', // Pure button rendering
        'components/staff/StaffHeader.tsx', // Pure SVG rendering
        'features/practice/ChallengeProgress.tsx', // Pure progress display
        'features/practice/PracticeRangeSelector.tsx', // Pure option rendering
        'features/practice/TargetInfo.tsx', // Display-only formatting
        'features/controls/TopBar.tsx', // Top bar display + event passthrough
        'features/auth/LoginScreen.tsx', // UI shell — auth logic in useAuth.ts
        'features/auth/RegisterScreen.tsx', // UI shell — auth logic in useAuth.ts
      ],
      thresholds: {
        lines: 76,
        functions: 60,
        branches: 80,
        statements: 76,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
