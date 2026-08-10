import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SIGHTPLAY_E2E_EXTERNAL_BASE_URL ?? 'http://127.0.0.1:1';

export default defineConfig({
  testDir: './e2e',
  testMatch: /preview\.smoke\.spec\.ts/,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/preview-junit.xml' }],
    ['./scripts/e2e-ai-reporter.ts'],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure-and-retries',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
