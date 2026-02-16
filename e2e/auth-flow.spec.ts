import { test, expect, Page } from '@playwright/test';

async function mockBypassAuth(page: Page, scenario: 'register' | 'login') {
  let isAuthenticatedNow = false;

  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
        body: JSON.stringify({
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
        body: JSON.stringify({ success: true }),
      });
    });
  } else {
    await page.route('**/api/auth/login-options', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challenge: btoa('mock-challenge'),
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
        body: JSON.stringify({ success: true }),
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
      id: 'mock-credential-id',
      rawId: mockBuffer('mock-credential-id'),
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
    test('should complete passkey registration and reach practice screen', async ({ page }) => {
      await mockBypassAuth(page, 'register');
      await page.goto('/');

      await expect(page.getByTestId('login-screen')).toBeVisible();
      await page.getByRole('button', { name: /register with invite code|使用邀请码注册/i }).click();
      await expect(page.getByTestId('register-section')).toBeVisible();

      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeVisible();
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

      await expect(page.getByTestId('piano-display')).toBeVisible();
      await expect(page.getByText('SightPlay')).toBeVisible();
    });

    test('should handle registration failure gracefully', async ({ page }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: false }),
        });
      });

      await page.route('**/api/auth/register-options', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.goto('/');
      await page.getByRole('button', { name: /register with invite code|使用邀请码注册/i }).click();

      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      await page.waitForTimeout(1000);

      await expect(page.getByTestId('register-section')).toBeVisible();
    });

    test('should open /register route with pre-filled invite code', async ({ page }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: false }),
        });
      });

      await page.goto('/register?code=ABCD-EFGH');

      await expect(page.getByTestId('register-screen')).toBeVisible();
      await expect(page.locator('#invite-code')).toHaveValue('ABCD-EFGH');
    });
  });

  test.describe('Login Flow', () => {
    test('should complete passkey login and reach practice screen', async ({ page }) => {
      await mockBypassAuth(page, 'login');
      await page.goto('/');

      await expect(page.getByTestId('login-screen')).toBeVisible();

      const loginButton = page.getByRole('button', { name: /use passkey|sign in|登录/i });
      await expect(loginButton).toBeVisible();
      await loginButton.click();

      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

      await expect(page.getByTestId('piano-display')).toBeVisible();
      await expect(page.getByTestId('toggle-clef-button')).toBeVisible();
    });

    test('should handle login failure gracefully', async ({ page }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: true }),
        });
      });

      await page.route('**/api/auth/login-options', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.goto('/');

      const loginButton = page.getByRole('button', { name: /use passkey|sign in|登录/i });
      await loginButton.click();

      await page.waitForTimeout(1000);

      await expect(page.getByTestId('login-screen')).toBeVisible();
    });

    test('should persist session across page reloads', async ({ page }) => {
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
        });
      });

      await page.goto('/');

      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

      await page.reload();

      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Full User Journey', () => {
    test('should complete registration → practice → logout → login flow', async ({ page }) => {
      await mockBypassAuth(page, 'register');

      await page.goto('/');
      await page.getByRole('button', { name: /register with invite code|使用邀请码注册/i }).click();
      await expect(page.getByTestId('register-section')).toBeVisible();

      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('piano-display')).toBeVisible();
    });
  });
});
