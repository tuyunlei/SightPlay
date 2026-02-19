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

async function completeSongViaTestApi(page: Page) {
  for (let i = 0; i < 200; i++) {
    const completeHeading = page.getByRole('heading', { name: /song complete|完成曲目/i });
    if (await completeHeading.isVisible()) {
      return;
    }

    const targetMidi = await page.evaluate(() => {
      const api = (window as any).__sightplayTestAPI;
      return api?.getTargetNoteMidi?.() ?? null;
    });

    if (targetMidi == null) {
      await page.waitForTimeout(100);
      continue;
    }

    await page.evaluate((midi) => {
      const api = (window as any).__sightplayTestAPI;
      api?.simulateMidiNoteOn?.(midi);
    }, targetMidi);

    await page.waitForTimeout(50);

    await page.evaluate((midi) => {
      const api = (window as any).__sightplayTestAPI;
      api?.simulateMidiNoteOff?.(midi);
    }, targetMidi);

    await page.waitForTimeout(100);
  }

  throw new Error('Song did not complete within expected number of simulated notes');
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

  test('complete a song then return to library from score screen', async ({ page }) => {
    await openSongLibrary(page);
    await page.getByText('Twinkle Twinkle Little Star').click();

    await completeSongViaTestApi(page);

    await expect(page.getByRole('heading', { name: /song complete|完成曲目/i })).toBeVisible();
    await expect(page.getByText(/accuracy|正确率/i).first()).toBeVisible();
    await expect(page.getByText(/correct notes|正确音符/i)).toBeVisible();

    const backToLibraryButton = page.getByRole('button', { name: /back to library|返回曲库/i });
    await backToLibraryButton.evaluate((el: HTMLButtonElement) => el.click());

    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible({
      timeout: 10000,
    });
  });
});
