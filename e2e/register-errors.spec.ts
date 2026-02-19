import { test, expect, Page } from '@playwright/test';

async function setupRegisterScreen(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: false, hasPasskeys: false }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: /register with invite code|使用邀请码注册/i }).click();
  await expect(page.getByTestId('register-section')).toBeVisible();
}

test.describe('Register invite code error handling', () => {
  test('1.2.4 invalid invite code shows localized error message', async ({ page }) => {
    await page.route('**/api/auth/register-options', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: '邀请码无效' }),
      });
    });

    await setupRegisterScreen(page);

    await page.locator('#invite-code').fill('ABCD-EFGH');
    await page.getByRole('button', { name: /set up passkey|创建 passkey/i }).click();

    await expect(page.getByText('邀请码无效')).toBeVisible();
  });

  test('1.2.5 expired invite code shows localized error message', async ({ page }) => {
    await page.route('**/api/auth/register-options', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invite code has expired' }),
      });
    });

    await setupRegisterScreen(page);

    await page.locator('#invite-code').fill('ABCD-EFGH');
    await page.getByRole('button', { name: /set up passkey|创建 passkey/i }).click();

    await expect(page.getByText('Invite code has expired')).toBeVisible();
  });
});
