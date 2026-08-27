import { expect, identitySuccess, test, type Page } from './fixtures/app-test';

async function mockBypassAuth(page: Page, scenario: 'register' | 'login') {
  let isAuthenticatedNow = false;

  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: identitySuccess({
        authenticated: isAuthenticatedNow,
        hasPasskeys: scenario === 'login' || isAuthenticatedNow,
      }),
    });
  });

  if (scenario === 'register') {
    await page.route('**/api/auth/register-options', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({
          challenge: btoa('mock-challenge'),
          rp: { name: 'SightPlay', id: 'localhost' },
          user: {
            id: btoa('user-123'),
            name: 'test@example.com',
            displayName: 'Test User',
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 60000,
          authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
          },
        }),
      });
    });

    await page.route('**/api/auth/register-verify', (route) => {
      isAuthenticatedNow = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({ completed: true }),
      });
    });
  } else {
    await page.route('**/api/auth/login-options', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({
          challenge: btoa('mock-challenge'),
          rpId: '127.0.0.1',
          allowCredentials: [
            {
              id: btoa('credential-123'),
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'preferred',
          timeout: 60000,
        }),
      });
    });

    await page.route('**/api/auth/login-verify', (route) => {
      isAuthenticatedNow = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({ completed: true }),
      });
    });
  }

  await page.addInitScript(() => {
    if (!window.navigator.credentials) {
      window.navigator.credentials = {};
    }

    const mockBuffer = (str: string) => {
      const encoder = new TextEncoder();
      return encoder.encode(str).buffer;
    };

    const createMockCredential = () => ({
      id: 'AQID',
      rawId: new Uint8Array([1, 2, 3]).buffer,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      response: {
        clientDataJSON: mockBuffer(
          JSON.stringify({
            type: 'webauthn.create',
            challenge: 'mock-challenge',
            origin: window.location.origin,
          })
        ),
        attestationObject: mockBuffer('mock-attestation'),
        getPublicKey: () => mockBuffer('mock-public-key'),
        getAuthenticatorData: () => mockBuffer('mock-auth-data'),
        getPublicKeyAlgorithm: () => -7,
        getTransports: () => ['internal'],
        authenticatorData: mockBuffer('mock-auth-data'),
        signature: mockBuffer('mock-signature'),
        userHandle: mockBuffer('user-123'),
      },
      getClientExtensionResults: () => ({}),
    });

    window.navigator.credentials.create = async () => createMockCredential();
    window.navigator.credentials.get = async () => createMockCredential();
  });
}

test.describe('Authentication Flow E2E', () => {
  test.describe('Registration Flow', () => {
    test('should complete passkey registration and reach the course', async ({ page }) => {
      await mockBypassAuth(page, 'register');
      await page.goto('/');

      await expect(page.getByTestId('register-screen')).toBeVisible();
      await expect(page.getByRole('button', { name: /return to login|返回登录/i })).toHaveCount(0);

      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeVisible();
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      await expect(
        page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should open /register route with pre-filled invite code', async ({ page }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: identitySuccess({ authenticated: false, hasPasskeys: false }),
        });
      });

      await page.goto('/register?code=ABCD-EFGH');

      await expect(page.getByTestId('register-screen')).toBeVisible();
      await expect(page.locator('#invite-code')).toHaveValue('ABCD-EFGH');
    });

    test('keeps invite registration focused at desktop width and usable on mobile', async ({
      page,
    }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: identitySuccess({ authenticated: false, hasPasskeys: false }),
        });
      });

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/register');

      const desktopCard = await page.getByTestId('register-screen').boundingBox();
      expect(desktopCard).not.toBeNull();
      if (!desktopCard) throw new Error('Expected the desktop registration card to be visible');
      expect(desktopCard.width).toBeLessThan(1440 / 2);

      await page.setViewportSize({ width: 390, height: 844 });
      const mobileCard = await page.getByTestId('register-screen').boundingBox();
      expect(mobileCard).not.toBeNull();
      if (!mobileCard) throw new Error('Expected the mobile registration card to be visible');
      expect(mobileCard.width).toBeGreaterThan(390 * 0.85);
      expect(mobileCard.x).toBeGreaterThanOrEqual(0);
      expect(mobileCard.x + mobileCard.width).toBeLessThanOrEqual(390);
    });
  });

  test.describe('Login Flow', () => {
    test('should complete passkey login and reach the course', async ({ page }) => {
      await mockBypassAuth(page, 'login');
      await page.goto('/');

      await expect(page.getByTestId('login-screen')).toBeVisible();

      const loginButton = page.getByRole('button', { name: /use passkey|sign in|登录/i });
      await expect(loginButton).toBeVisible();
      await loginButton.click();

      await expect(
        page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should persist session across page reloads', async ({ page }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: identitySuccess({ authenticated: true, hasPasskeys: true }),
        });
      });

      await page.goto('/');

      await expect(
        page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
      ).toBeVisible({ timeout: 10000 });

      await page.reload();

      await expect(
        page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
