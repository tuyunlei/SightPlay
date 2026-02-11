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

test.describe('Practice Flow', () => {
  test.describe('Unauthenticated State', () => {
    test('should show register screen when no passkeys exist', async ({ page }) => {
      // Mock the session API to indicate no authentication and no passkeys
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: false }),
        });
      });

      await page.goto('/');

      // Should show the register screen
      await expect(page.getByTestId('register-screen')).toBeVisible();
      await expect(page.getByText('Welcome to SightPlay')).toBeVisible();
      await expect(page.getByText('Set up your passkey to get started')).toBeVisible();
    });

    test('should show login screen when passkeys exist but not authenticated', async ({ page }) => {
      // Mock the session API to indicate no authentication but passkeys exist
      await page.route('**/api/auth/session', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false, hasPasskeys: true }),
        });
      });

      await page.goto('/');

      // Should show the login screen
      await expect(page.getByTestId('login-screen')).toBeVisible();
      await expect(page.getByText('Welcome Back')).toBeVisible();
      await expect(page.getByText('Sign in with your passkey to continue')).toBeVisible();
    });
  });

  test.describe('Authenticated State - Practice UI', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthenticatedSession(page);
      await page.goto('/');
      // Wait for the app to load
      await expect(page.getByText('SightPlay')).toBeVisible();
    });

    test('should display staff and piano keyboard after page loads', async ({ page }) => {
      // Check that the staff display is visible
      await expect(page.getByTestId('staff-display')).toBeVisible();

      // Check that the piano keyboard is visible (initially shown by default)
      await expect(page.getByTestId('piano-display')).toBeVisible();
    });

    test('should toggle piano keyboard visibility', async ({ page }) => {
      const toggleButton = page.getByTestId('toggle-piano-button');
      const pianoDisplay = page.getByTestId('piano-display');
      const pianoContainer = pianoDisplay.locator('..');

      // Piano should be visible initially (check parent container has max-h-40 class)
      await expect(pianoDisplay).toBeVisible();
      await expect(pianoContainer).toHaveClass(/max-h-40/);

      // Click to hide the piano
      await toggleButton.click();
      // Wait for animation and check the container has max-h-0 class
      await expect(pianoContainer).toHaveClass(/max-h-0/, { timeout: 1000 });

      // Click to show the piano again
      await toggleButton.click();
      await expect(pianoContainer).toHaveClass(/max-h-40/, { timeout: 1000 });
    });

    test('should toggle between treble and bass clef', async ({ page }) => {
      const clefButton = page.getByTestId('toggle-clef-button');

      // Initially should show treble clef (𝄞)
      await expect(page.getByTestId('treble-clef-icon')).toBeVisible();

      // Click to switch to bass clef
      await clefButton.click();
      await expect(page.getByTestId('bass-clef-icon')).toBeVisible();
      await expect(page.getByTestId('treble-clef-icon')).not.toBeVisible();

      // Click again to switch back to treble clef
      await clefButton.click();
      await expect(page.getByTestId('treble-clef-icon')).toBeVisible();
      await expect(page.getByTestId('bass-clef-icon')).not.toBeVisible();
    });

    test('should display score counter', async ({ page }) => {
      // Check that score display exists and shows initial value
      const scoreDisplay = page.getByTestId('score-display').first(); // Use first() for desktop view
      await expect(scoreDisplay).toBeVisible();

      // Verify it shows a numeric value (initially 0)
      const scoreText = await scoreDisplay.textContent();
      expect(scoreText).toMatch(/^\d+$/);
    });

    test('should have all key practice UI elements visible', async ({ page }) => {
      // Verify main UI components are present
      await expect(page.getByText('SightPlay')).toBeVisible();
      await expect(page.getByTestId('staff-display')).toBeVisible();
      await expect(page.getByTestId('piano-display')).toBeVisible();
      await expect(page.getByTestId('toggle-clef-button')).toBeVisible();
      await expect(page.getByTestId('toggle-piano-button')).toBeVisible();
    });
  });
});
