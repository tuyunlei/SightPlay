import { test, expect, Page } from '@playwright/test';

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
    });
  });
}

test.describe('Preferences E2E', () => {
  test('5.1 language switch changes key UI text', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /视弹 SightPlay/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /随机练习/i })).toBeVisible();

    // language toggle is the icon button before reset-stats button
    const allButtons = page.locator('nav button');
    await allButtons.nth(2).click();

    await expect(page.getByRole('heading', { name: 'SightPlay' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Random Practice/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Song Library/i })).toBeVisible();
  });

  test.describe('5.2 dark mode + 5.3 light mode CSS variables', () => {
    test.use({ colorScheme: 'dark' });

    test('applies dark variables and dark-styled containers', async ({ page }) => {
      await mockAuthenticatedSession(page);
      await page.goto('/');

      const vars = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return {
          bgPrimary: s.getPropertyValue('--color-bg-primary').trim(),
          textPrimary: s.getPropertyValue('--color-text-primary').trim(),
        };
      });

      expect(vars.bgPrimary).toBe('#020617');
      expect(vars.textPrimary).toBe('#f1f5f9');

      await expect(page.locator('.bg-white.dark\\:bg-slate-900').first()).toBeVisible();
    });
  });

  test.describe('light mode CSS variables', () => {
    test.use({ colorScheme: 'light' });

    test('applies light variables and light-styled containers', async ({ page }) => {
      await mockAuthenticatedSession(page);
      await page.goto('/');

      const vars = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return {
          bgPrimary: s.getPropertyValue('--color-bg-primary').trim(),
          textPrimary: s.getPropertyValue('--color-text-primary').trim(),
        };
      });

      expect(vars.bgPrimary).toBe('#f8fafc');
      expect(vars.textPrimary).toBe('#0f172a');

      await expect(page.getByTestId('staff-display')).toBeVisible();

      const appBg = await page.evaluate(() => {
        const root = document.querySelector('#root > div');
        if (!root) return '';
        return getComputedStyle(root).backgroundColor;
      });
      expect(appBg).toBe('rgb(248, 250, 252)');
    });
  });
});
