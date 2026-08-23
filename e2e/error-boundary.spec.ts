import { expect, identitySuccess, test } from './fixtures/app-test';

test.describe('ErrorBoundary degraded UI', () => {
  test('renders fallback UI instead of blank screen and retry recovers', async ({
    page,
    diagnostics,
  }) => {
    diagnostics.allowPageError();
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: identitySuccess({ authenticated: true, hasPasskeys: true }),
      });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem('__sightplay_force_render_error', '1');
    });

    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /something went wrong|出了点问题/i })
    ).toBeVisible();
    await expect(page.getByText(/unexpected error occurred|发生了意外错误/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry|重试/i })).toBeVisible();

    await page.evaluate(() => {
      window.localStorage.removeItem('__sightplay_force_render_error');
    });

    await page.getByRole('button', { name: /retry|重试/i }).click();

    await expect(page.getByRole('heading', { name: /sight-reading course|识谱课程/i })).toBeVisible(
      { timeout: 10000 }
    );
  });
});
