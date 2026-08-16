import { expect, identitySuccess, test } from './fixtures/app-test';

test.describe('Logout Flow', () => {
  test('should logout to login screen and remain logged out after refresh', async ({ page }) => {
    let authenticated = true;

    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({ authenticated, hasPasskeys: true }),
      });
    });

    await page.route('**/api/auth/logout', (route) => {
      authenticated = false;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({ completed: true }),
      });
    });

    await page.route('**/api/auth/passkeys', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess([
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
