import { expect, test as base, type Page, type TestInfo } from '@playwright/test';

type RuntimeEvent =
  | { kind: 'pageError'; message: string }
  | { kind: 'requestFailed'; method: string; url: string; failure: string | null }
  | { kind: 'httpError'; method: string; url: string; status: number }
  | { kind: 'consoleError'; text: string; url: string | null };

type ExpectedHttpError = { pathname: string; status: number };

export type RuntimeDiagnostics = {
  allowPageError: () => void;
  allowHttpError: (pathname: string, status: number) => void;
};

class DiagnosticsController implements RuntimeDiagnostics {
  readonly state: DiagnosticsState = {
    expectedPageErrors: 0,
    expectedConsoleErrors: 0,
    expectedHttpErrors: [],
    events: [],
  };

  allowPageError = () => {
    this.state.expectedPageErrors += 1;
    this.state.expectedConsoleErrors += 1;
  };

  allowHttpError = (pathname: string, status: number) => {
    this.state.expectedHttpErrors.push({ pathname, status });
  };
}

type DiagnosticsState = {
  expectedPageErrors: number;
  expectedConsoleErrors: number;
  expectedHttpErrors: ExpectedHttpError[];
  events: RuntimeEvent[];
};

const attachDiagnostics = async (testInfo: TestInfo, events: RuntimeEvent[]) => {
  if (events.length === 0 && testInfo.status === testInfo.expectedStatus) return;
  await testInfo.attach('runtime-diagnostics.json', {
    body: Buffer.from(JSON.stringify(events, null, 2)),
    contentType: 'application/json',
  });
};

const installDiagnostics = (page: Page, state: DiagnosticsState) => {
  page.on('pageerror', (error) => state.events.push({ kind: 'pageError', message: error.message }));
  page.on('requestfailed', (request) =>
    state.events.push({
      kind: 'requestFailed',
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? null,
    })
  );
  page.on('response', (response) => {
    if (response.status() < 500) return;
    state.events.push({
      kind: 'httpError',
      method: response.request().method(),
      url: response.url(),
      status: response.status(),
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      state.events.push({
        kind: 'consoleError',
        text: message.text(),
        url: message.location().url || null,
      });
    }
  });
};

const unexpectedEvents = (state: DiagnosticsState) => {
  let remainingPageErrors = state.expectedPageErrors;
  let remainingConsoleErrors = state.expectedConsoleErrors;
  return state.events.filter((event) => {
    if (event.kind === 'consoleError') {
      if (remainingConsoleErrors > 0) {
        remainingConsoleErrors -= 1;
        return false;
      }
      if (event.url) {
        const pathname = new URL(event.url).pathname;
        const matchesObservedExpectedHttpError = state.events.some(
          (candidate) =>
            candidate.kind === 'httpError' &&
            new URL(candidate.url).pathname === pathname &&
            state.expectedHttpErrors.some(
              (expected) => expected.pathname === pathname && expected.status === candidate.status
            )
        );
        if (matchesObservedExpectedHttpError) return false;
      }
      return true;
    }
    if (event.kind === 'pageError' && remainingPageErrors > 0) {
      remainingPageErrors -= 1;
      return false;
    }
    if (event.kind === 'pageError') return true;
    if (event.kind === 'requestFailed') {
      // Playwright exposes browser-initiated cancellation only through the protocol error code.
      // StrictMode lifecycle replay intentionally disposes the two read-only capability requests.
      const url = new URL(event.url);
      if (
        event.failure === 'net::ERR_ABORTED' &&
        event.method === 'GET' &&
        (url.pathname === '/api/auth/session' || url.pathname === '/api/auth/passkeys')
      ) {
        return false;
      }
      const hostname = url.hostname;
      return hostname === '127.0.0.1' || hostname === 'localhost';
    }
    const pathname = new URL(event.url).pathname;
    return !state.expectedHttpErrors.some(
      (expected) => expected.pathname === pathname && expected.status === event.status
    );
  });
};

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const test = base.extend<
  { diagnostics: RuntimeDiagnostics; randomValue?: number },
  { _runtimeDiagnostics: void }
>({
  randomValue: [undefined, { option: true }],
  diagnostics: async ({}, use) => {
    await use(new DiagnosticsController());
  },
  _runtimeDiagnostics: [
    async ({ page, diagnostics, randomValue }, use, testInfo) => {
      if (!(diagnostics instanceof DiagnosticsController)) {
        throw new Error('Runtime diagnostics fixture was replaced with an incompatible value');
      }
      const { state } = diagnostics;
      const seed = hashSeed(`${testInfo.project.name}:${testInfo.titlePath.join(':')}`);
      testInfo.annotations.push({ type: 'random-seed', description: String(seed) });
      await page.addInitScript(
        ({ initialSeed, fixedValue }) => {
          if (fixedValue !== undefined) {
            Math.random = () => fixedValue;
            return;
          }
          let current = initialSeed;
          Math.random = () => {
            current += 0x6d2b79f5;
            let value = current;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
          };
        },
        { initialSeed: seed, fixedValue: randomValue }
      );
      installDiagnostics(page, state);
      await use();
      await attachDiagnostics(testInfo, state.events);

      const unexpected = unexpectedEvents(state);
      if (unexpected.length > 0) {
        throw new Error(
          `Unexpected browser runtime failures:\n${JSON.stringify(unexpected, null, 2)}`
        );
      }
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };

export function identitySuccess(data: unknown): string {
  return JSON.stringify({ ok: true, data, requestId: 'e2e-request' });
}

export async function mockAuthenticatedSession(page: Page): Promise<void> {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: identitySuccess({ authenticated: true, hasPasskeys: true }),
    })
  );
}

export async function waitForPracticeInputReady(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.__sightplayTestAPI?.isReadyForInput() ?? false))
    .toBe(true);
}
