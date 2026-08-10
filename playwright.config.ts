import { defineConfig, devices } from '@playwright/test';

import { DEFAULT_E2E_PORT, LOOPBACK_HOST, resolvePort } from './scripts/server-config';

const e2ePort = resolvePort('SIGHTPLAY_E2E_PORT', DEFAULT_E2E_PORT);
const e2eBaseUrl = `http://${LOOPBACK_HOST}:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    env: {
      ...process.env,
      SIGHTPLAY_DEV_HOST: LOOPBACK_HOST,
      SIGHTPLAY_DEV_PORT: String(e2ePort),
    },
    url: e2eBaseUrl,
    reuseExistingServer: false,
  },
});
