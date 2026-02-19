import { expect, Page, test } from '@playwright/test';

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
    });
  });
}

async function openSongLibrary(page: Page) {
  await page.getByRole('button', { name: /song library|曲库/i }).click();
  await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
}

async function getSongProgress(page: Page): Promise<number> {
  const progressText = await page
    .locator('span')
    .filter({ hasText: /^(Progress|进度):\s*\d+%$/ })
    .first()
    .textContent();

  const match = progressText?.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}

async function playCorrectTargetNote(page: Page) {
  const targetMidi = await page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    return api?.getTargetNoteMidi?.() ?? null;
  });

  expect(targetMidi).not.toBeNull();

  await page.evaluate((midi) => {
    const api = (window as any).__sightplayTestAPI;
    api?.simulateMidiNoteOn?.(midi);
  }, targetMidi);

  await page.waitForTimeout(100);

  await page.evaluate((midi) => {
    const api = (window as any).__sightplayTestAPI;
    api?.simulateMidiNoteOff?.(midi);
  }, targetMidi);

  await page.waitForTimeout(300);
}

test.describe('Song Library Practice flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await expect(page.getByText('SightPlay')).toBeVisible();
  });

  test('navigate to library and see songs', async ({ page }) => {
    await openSongLibrary(page);

    await expect(page.getByText('Twinkle Twinkle Little Star')).toBeVisible();
    await expect(page.getByText('Ode to Joy')).toBeVisible();
  });

  test('select song, enter practice, and exit back to library', async ({ page }) => {
    await openSongLibrary(page);

    await page.getByText('Twinkle Twinkle Little Star').click();

    await expect(page.getByText('Twinkle Twinkle Little Star')).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
    await expect(page.getByTestId('piano-display')).toBeVisible();
    await expect(page.getByRole('button', { name: /exit|退出/i })).toBeVisible();

    await page.getByRole('button', { name: /exit|退出/i }).click();
    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
  });

  test('song progress updates after playing notes', async ({ page }) => {
    await openSongLibrary(page);
    await page.getByText('Twinkle Twinkle Little Star').click();

    const initialProgress = await getSongProgress(page);

    await playCorrectTargetNote(page);
    await playCorrectTargetNote(page);
    await playCorrectTargetNote(page);

    const updatedProgress = await getSongProgress(page);
    expect(updatedProgress).toBeGreaterThan(initialProgress);
  });
});
