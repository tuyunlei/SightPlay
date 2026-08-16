import type { BrowserContext, TestInfo } from '@playwright/test';

import { test as appTest, expect } from './app-test';

type ControlCommand =
  | { action: 'reset' }
  | { action: 'seedInvite'; code: string; expiresAt?: number }
  | { action: 'seedAuthenticatedSession' }
  | {
      action: 'setChatScenario';
      scenario:
        | { kind: 'success'; replyText: string; challengeData?: object | null }
        | { kind: 'upstreamError'; status: number }
        | { kind: 'invalidPayload' };
    };

type SystemControl = {
  runId: string;
  send: (command: ControlCommand) => Promise<void>;
};

const controlUrl = (testInfo: TestInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== 'string') throw new Error('System E2E project requires a baseURL');
  return new URL('/__e2e/control', baseURL).href;
};

const sendControl = async (
  context: BrowserContext,
  testInfo: TestInfo,
  runId: string,
  command: ControlCommand
) => {
  const response = await context.request.post(controlUrl(testInfo), {
    headers: {
      'X-SightPlay-E2E-Run': runId,
      'X-SightPlay-E2E-Control': 'sightplay-local-e2e',
    },
    data: command,
  });
  if (!response.ok()) {
    throw new Error(`E2E control failed (${response.status()}): ${await response.text()}`);
  }
};

export const test = appTest.extend<{ runId: string; system: SystemControl }>({
  runId: async ({}, use, testInfo) => {
    const runId = `${testInfo.project.name}-${testInfo.parallelIndex}-${testInfo.retry}-${crypto.randomUUID()}`;
    testInfo.annotations.push({ type: 'e2e-run-id', description: runId });
    await use(runId);
  },
  context: async ({ browser, runId }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const appOrigin = typeof baseURL === 'string' ? new URL(baseURL).origin : undefined;
    const context = await browser.newContext({
      baseURL: typeof baseURL === 'string' ? baseURL : undefined,
    });
    if (testInfo.project.name === 'system-chromium') {
      await context.credentials.install();
      await context.exposeBinding(
        '__sightplayE2EPublicKey',
        async (_source, credentialId: string) => {
          const credential = (await context.credentials.get({ id: credentialId }))[0];
          if (!credential) throw new Error(`Virtual credential not found: ${credentialId}`);
          return credential.publicKey;
        }
      );
      await context.addInitScript(() => {
        const credentials = navigator.credentials;
        const nativeCreate = credentials.create.bind(credentials);
        const decodeBase64Url = (value: string) => {
          const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
          const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
          return bytes.buffer;
        };
        const testWindow = window as typeof window & {
          __sightplayE2EPublicKey: (credentialId: string) => Promise<string>;
        };

        credentials.create = async (...args) => {
          const credential = await nativeCreate(...args);
          if (credential instanceof PublicKeyCredential) {
            const response = credential.response as AuthenticatorAttestationResponse;
            if (!response.getPublicKey()) {
              const publicKey = await testWindow.__sightplayE2EPublicKey(credential.id);
              Object.defineProperty(response, 'getPublicKey', {
                configurable: true,
                value: () => decodeBase64Url(publicKey),
              });
              Object.defineProperty(response, 'getPublicKeyAlgorithm', {
                configurable: true,
                value: () => -7,
              });
            }
          }
          return credential;
        };
      });
    }
    await context.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url());
      if (appOrigin && requestUrl.origin === appOrigin) {
        await route.continue({
          headers: { ...route.request().headers(), 'X-SightPlay-E2E-Run': runId },
        });
        return;
      }
      await route.continue();
    });
    await use(context);
    await context.close();
  },
  system: async ({ context, runId }, use, testInfo) => {
    const send = (command: ControlCommand) => sendControl(context, testInfo, runId, command);
    await send({ action: 'reset' });
    await use({ runId, send });
    await send({ action: 'reset' });
  },
});

export { expect };
