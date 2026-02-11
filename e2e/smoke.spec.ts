import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the page title is set
    await expect(page).toHaveTitle(/SightPlay/);

    // Check that the page has loaded by verifying a key element exists
    // Adjust the selector based on your actual app structure
    await expect(page.locator('body')).toBeVisible();
  });
});
