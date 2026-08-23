import { test, expect, mockAuthenticatedSession } from './fixtures/app-test';

test.describe('Preferences E2E', () => {
  test('5.1 language switch changes key UI text', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /识谱课程/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /自由练习/i })).toBeVisible();

    // language toggle is the icon button before reset-stats button
    await page.getByTitle(/切换语言/i).click();

    await expect(page.getByRole('heading', { name: /Sight-reading Course/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Free Practice/i })).toBeVisible();
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

      await expect(
        page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
      ).toBeVisible();

      const appBg = await page.evaluate(() => {
        const root = document.querySelector('#root > div');
        if (!root) return '';
        return getComputedStyle(root).backgroundColor;
      });
      expect(appBg).toBe('rgb(248, 250, 252)');
    });
  });
});
