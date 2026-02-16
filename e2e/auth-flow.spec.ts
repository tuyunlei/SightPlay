import { test, expect, Page } from '@playwright/test';

/**
 * Mock all auth APIs to bypass WebAuthn completely
 * This simulates a successful authentication flow by mocking all network requests
 */
async function mockBypassAuth(page: Page, scenario: 'register' | 'login') {
  // Use explicit flag to control authentication state
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
    // Mock registration flow
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
      // Mark as authenticated after successful registration
      isAuthenticatedNow = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  } else {
    // Mock login flow
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
      // Mark as authenticated after successful login
      isAuthenticatedNow = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  }

  // Mock WebAuthn APIs with proper response structure matching the library's expectations
  await page.addInitScript(() => {
    if (!window.navigator.credentials) {
      // @ts-expect-error - Mocking API
      window.navigator.credentials = {};
    }

    // Helper to create mock ArrayBuffer
    const mockBuffer = (str: string) => {
      const encoder = new TextEncoder();
      return encoder.encode(str).buffer;
    };

    // Create mock credential with all required methods
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
        // Required methods for registration
        getPublicKey: () => mockBuffer('mock-public-key'),
        getAuthenticatorData: () => mockBuffer('mock-auth-data'),
        getPublicKeyAlgorithm: () => -7,
        getTransports: () => ['internal'],
        // Required for authentication
        authenticatorData: mockBuffer('mock-auth-data'),
        signature: mockBuffer('mock-signature'),
        userHandle: mockBuffer('user-123'),
      },
      getClientExtensionResults: () => ({}),
    });

    // @ts-expect-error - Mocking API
    window.navigator.credentials.create = async () => createMockCredential();
    // @ts-expect-error - Mocking API
    window.navigator.credentials.get = async () => createMockCredential();
  });
}

test.describe('Authentication Flow E2E', () => {
  test.describe('Registration Flow', () => {
    test('should complete passkey registration and reach practice screen', async ({ page }) => {
      await mockBypassAuth(page, 'register');
      await page.goto('/');

      // Should show registration screen
      await expect(page.getByTestId('register-screen')).toBeVisible();

      // Fill invite code and click register button
      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeVisible();
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      // Wait for navigation to practice screen
      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

      // Verify practice UI elements are present
      await expect(page.getByTestId('piano-display')).toBeVisible();
      await expect(page.getByText('SightPlay')).toBeVisible();
    });

    test('should handle registration failure gracefully', async ({ page }) => {
      // Mock session - no passkeys
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: false }),
        });
      });

      // Mock registration failure
      await page.route('**/api/auth/register-options', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.goto('/');

      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      // Should show error - wait a bit for error state
      await page.waitForTimeout(1000);

      // Button should not be stuck in loading state
      // (In real app, should show error message - this is a basic check)
      await expect(page.getByTestId('register-screen')).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test('should complete passkey login and reach practice screen', async ({ page }) => {
      await mockBypassAuth(page, 'login');
      await page.goto('/');

      // Should show login screen
      await expect(page.getByTestId('login-screen')).toBeVisible();

      // Click login button
      const loginButton = page.getByRole('button', { name: /use passkey|sign in/i });
      await expect(loginButton).toBeVisible();
      await loginButton.click();

      // Wait for navigation to practice screen
      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

      // Verify practice UI elements
      await expect(page.getByTestId('piano-display')).toBeVisible();
      await expect(page.getByTestId('toggle-clef-button')).toBeVisible();
    });

    test('should handle login failure gracefully', async ({ page }) => {
      // Mock session - has passkeys but not authenticated
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: true }),
        });
      });

      // Mock login failure
      await page.route('**/api/auth/login-options', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.goto('/');

      const loginButton = page.getByRole('button', { name: /use passkey|sign in/i });
      await loginButton.click();

      // Wait for error state
      await page.waitForTimeout(1000);

      // Should still be on login screen
      await expect(page.getByTestId('login-screen')).toBeVisible();
    });

    test('should persist session across page reloads', async ({ page }) => {
      // Mock authenticated session from the start
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
        });
      });

      await page.goto('/');

      // Should directly show practice screen
      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

      // Reload page
      await page.reload();

      // Should still show practice screen (session persisted)
      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Full User Journey', () => {
    test('should complete registration → practice → logout → login flow', async ({ page }) => {
      await mockBypassAuth(page, 'register');

      // Step 1: Register
      await page.goto('/');
      await expect(page.getByTestId('register-screen')).toBeVisible();

      await page.locator('#invite-code').fill('ABCD-EFGH');
      const registerButton = page.getByRole('button', { name: /passkey/i });
      await expect(registerButton).toBeEnabled();
      await registerButton.click();

      // Step 2: Practice screen
      await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('piano-display')).toBeVisible();

      // TODO: Implement logout functionality and continue this test
      // For now, we've verified registration → practice flow works
    });
  });
});
