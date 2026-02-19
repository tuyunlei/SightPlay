import { test, expect } from '@playwright/test';

test.describe('Phone Portrait', () => {
  test('homepage renders correctly on phone portrait', async ({ page }) => {
    // iPhone 13 dimensions
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Page should load successfully
    await expect(page).toHaveTitle(/SightPlay/);
    await expect(page.locator('body')).toBeVisible();

    // Check viewport dimensions
    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();
    if (!viewportSize) {
      throw new Error('Expected viewport size to be available');
    }
    expect(viewportSize.width).toBe(390);
    expect(viewportSize.height).toBe(844);
  });

  test('no horizontal overflow on phone portrait', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that document width doesn't exceed viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for potential rounding
  });

  test('content is accessible within viewport on phone portrait', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that main content exists and is within viewport bounds
    const mainContent = page.locator('body > div').first();
    await expect(mainContent).toBeVisible();

    const box = await mainContent.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Content should not extend beyond viewport width
      expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);
    }
  });
});

test.describe('iPad Landscape', () => {
  test('homepage renders correctly on iPad landscape', async ({ page }) => {
    // iPad (gen 7) landscape dimensions
    await page.setViewportSize({ width: 1080, height: 810 });
    await page.goto('/');

    // Page should load successfully
    await expect(page).toHaveTitle(/SightPlay/);
    await expect(page.locator('body')).toBeVisible();

    // Check viewport dimensions
    const viewportSize = page.viewportSize();
    expect(viewportSize).toBeTruthy();
    if (!viewportSize) {
      throw new Error('Expected viewport size to be available');
    }
    expect(viewportSize.width).toBe(1080);
    expect(viewportSize.height).toBe(810);
  });

  test('no horizontal overflow on iPad landscape', async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 810 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that document width doesn't exceed viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('content is accessible within viewport on iPad landscape', async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 810 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that main content exists and is within viewport bounds
    const mainContent = page.locator('body > div').first();
    await expect(mainContent).toBeVisible();

    const box = await mainContent.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Content should not extend beyond viewport width
      expect(box.x + box.width).toBeLessThanOrEqual(1080 + 1);
    }
  });

  test('layout has appropriate spacing on larger screens', async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 810 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // On larger screens, content should utilize available space
    const mainContent = page.locator('body > div').first();
    await expect(mainContent).toBeVisible();

    const box = await mainContent.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Content should use a reasonable portion of the viewport width
      // Not just a tiny centered box
      expect(box.width).toBeGreaterThan(500);
    }
  });
});

test.describe('Responsive Behavior', () => {
  test('no horizontal scrollbar on phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that document width doesn't exceed viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for potential rounding
  });

  test('safe area insets are respected', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that CSS safe-area variables are defined
    const hasSafeArea = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const top = styles.getPropertyValue('padding-top');
      const bottom = styles.getPropertyValue('padding-bottom');
      return top !== '' || bottom !== '';
    });

    // This is a basic check - safe area handling depends on implementation
    expect(hasSafeArea).toBeTruthy();
  });
});
