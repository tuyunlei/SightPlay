import { test, expect } from '@playwright/test';

test.describe('Logout Flow', () => {
  test('should logout to login screen and remain logged out after refresh', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/api/auth/session', (route) => {
      const cookie = route.request().headers()['cookie'] || '';
      const hasAuthCookie = cookie.includes('auth_token=');

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: hasAuthCookie,
          hasPasskeys: true,
        }),
      });
    });

    await page.route('**/api/auth/passkeys', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'pk-1', name: 'Main Device', createdAt: Date.now() },
          { id: 'pk-2', name: 'Backup Device', createdAt: Date.now() - 86400000 },
        ]),
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /manage passkeys|管理 passkey/i }).click();
    const logoutButton = page.getByRole('button', { name: /logout|退出登录/i });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page.getByTestId('login-screen')).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByTestId('login-screen')).toBeVisible({ timeout: 10000 });
  });
});
