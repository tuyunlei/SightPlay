import { defineConfig, devices } from '@playwright/test';

import {
  DEFAULT_E2E_PORT,
  DEFAULT_E2E_PREVIEW_PORT,
  LOOPBACK_HOST,
  resolvePort,
} from './scripts/server-config';

const e2ePort = resolvePort('SIGHTPLAY_E2E_PORT', DEFAULT_E2E_PORT);
const e2eBaseUrl = `http://${LOOPBACK_HOST}:${e2ePort}`;
const previewPort = resolvePort('SIGHTPLAY_E2E_PREVIEW_PORT', DEFAULT_E2E_PREVIEW_PORT);
const previewBaseUrl = `http://${LOOPBACK_HOST}:${previewPort}`;
const providerCanaryEnabled = process.env.SIGHTPLAY_PROVIDER_CANARY === '1';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['blob'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['./scripts/e2e-ai-reporter.ts'],
      ]
    : [['line'], ['html', { open: 'never' }], ['./scripts/e2e-ai-reporter.ts']],

  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure-and-retries',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'stable-chromium',
      testIgnore: [
        /.*\.system\.spec\.ts/,
        /.*\.audio\.spec\.ts/,
        /.*\.provider\.spec\.ts/,
        /preview\.smoke\.spec\.ts/,
      ],
      use: { ...devices['Desktop Chrome'], baseURL: e2eBaseUrl },
    },
    {
      name: 'system-chromium',
      testMatch: /.*\.system\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: previewBaseUrl },
    },
    {
      name: 'system-webkit',
      testMatch: /.*\.system\.spec\.ts/,
      use: { ...devices['Desktop Safari'], baseURL: previewBaseUrl },
    },
    {
      name: 'audio-chromium',
      testMatch: /.*\.audio\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: e2eBaseUrl,
        permissions: ['microphone'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--use-file-for-fake-audio-capture=/tmp/sightplay-e2e-a4.wav',
          ],
        },
      },
    },
    ...(providerCanaryEnabled
      ? [
          {
            name: 'provider-canary',
            testMatch: /.*\.provider\.spec\.ts/,
            use: { ...devices['Desktop Chrome'], baseURL: previewBaseUrl },
          },
        ]
      : []),
  ],

  webServer: [
    {
      command: 'pnpm run dev',
      env: {
        ...process.env,
        GEMINI_API_KEY:
          process.env.SIGHTPLAY_E2E_REAL_PROVIDER === '1'
            ? (process.env.GEMINI_API_KEY ?? '')
            : 'sightplay-e2e',
        SIGHTPLAY_E2E_REAL_PROVIDER: process.env.SIGHTPLAY_E2E_REAL_PROVIDER ?? '0',
        SIGHTPLAY_DEV_HOST: LOOPBACK_HOST,
        SIGHTPLAY_DEV_PORT: String(e2ePort),
        SIGHTPLAY_E2E_MODE: '1',
        SIGHTPLAY_E2E_CONTROL_TOKEN: 'sightplay-local-e2e',
      },
      url: e2eBaseUrl,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm run build && pnpm run preview',
      env: {
        ...process.env,
        SIGHTPLAY_E2E_PREVIEW_PORT: String(previewPort),
        SIGHTPLAY_E2E_API_ORIGIN: e2eBaseUrl,
      },
      url: previewBaseUrl,
      reuseExistingServer: false,
    },
  ],
});
