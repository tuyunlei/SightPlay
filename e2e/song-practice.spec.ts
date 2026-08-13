import {
  expect,
  Page,
  test,
  mockAuthenticatedSession,
  waitForPracticeInputReady,
} from './fixtures/app-test';

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
  await waitForPracticeInputReady(page);
  const targetMidi = await page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    return api?.getTargetNoteMidi?.() ?? null;
  });

  expect(targetMidi).not.toBeNull();

  const scoreBefore = await page.evaluate(
    () => (window as any).__sightplayTestAPI?.getScore() ?? 0
  );
  await page.evaluate(async (midi) => {
    const api = (window as any).__sightplayTestAPI;
    api?.simulateMidiNoteOn?.(midi);
    await new Promise((resolve) => setTimeout(resolve, 100));
    api?.simulateMidiNoteOff?.(midi);
  }, targetMidi);
  await expect
    .poll(() => page.evaluate(() => (window as any).__sightplayTestAPI?.getScore() ?? 0))
    .toBeGreaterThan(scoreBefore);
}

async function completeSongViaTestApi(page: Page) {
  for (let i = 0; i < 200; i++) {
    const completeHeading = page.getByRole('heading', { name: /song complete|完成曲目/i });
    if (await completeHeading.isVisible()) {
      return;
    }

    const targetMidi = await page.evaluate(
      () => (window as any).__sightplayTestAPI?.getTargetNoteMidi?.() ?? null
    );
    if (targetMidi === null) {
      await expect
        .poll(async () => {
          if (await completeHeading.isVisible()) return 'complete';
          const nextTarget = await page.evaluate(
            () => (window as any).__sightplayTestAPI?.getTargetNoteMidi?.() ?? null
          );
          return nextTarget === null ? 'waiting' : 'ready';
        })
        .not.toBe('waiting');
      continue;
    }
    await playCorrectTargetNote(page);
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

    await expect(page.getByRole('heading', { name: 'Twinkle Twinkle Little Star' })).toBeVisible();
    await expect(page.getByText('Ode to Joy')).toBeVisible();
  });

  test('select song, enter practice, and exit back to library', async ({ page }) => {
    await openSongLibrary(page);
    await page.getByRole('button', { name: /beginner|初级/i }).click();
    await expect(page).toHaveURL(/\/library\?difficulty=beginner$/);

    await page.getByText('Twinkle Twinkle Little Star').click();

    await expect(page.getByRole('heading', { name: 'Twinkle Twinkle Little Star' })).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
    await expect(page.getByTestId('piano-display')).toBeVisible();
    await expect(page.getByRole('button', { name: /exit|退出/i })).toBeVisible();

    await page.getByRole('button', { name: /exit|退出/i }).click();
    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
    await expect(page).toHaveURL(/\/library\?difficulty=beginner$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/library$/);
  });

  test('song progress updates after playing notes', async ({ page }) => {
    await openSongLibrary(page);
    await page.getByText('Twinkle Twinkle Little Star').click();

    const initialProgress = await getSongProgress(page);

    await playCorrectTargetNote(page);
    await playCorrectTargetNote(page);
    await playCorrectTargetNote(page);

    await expect.poll(() => getSongProgress(page)).toBeGreaterThan(initialProgress);
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
