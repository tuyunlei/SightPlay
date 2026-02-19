import { expect, test } from '@playwright/test';

test.describe('ErrorBoundary degraded UI', () => {
  test('renders fallback UI instead of blank screen and retry recovers', async ({ page }) => {
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
      });
    });

    await page.goto('/?__forceErrorBoundary=1');

    await expect(
      page.getByRole('heading', { name: /something went wrong|出了点问题/i })
    ).toBeVisible();
    await expect(page.getByText(/unexpected error occurred|发生了意外错误/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry|重试/i })).toBeVisible();

    await page.evaluate(() => {
      window.history.replaceState({}, '', '/');
    });

    await page.getByRole('button', { name: /retry|重试/i }).click();

    await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('piano-display')).toBeVisible();
  });
});
