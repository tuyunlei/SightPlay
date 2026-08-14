import { getSongById } from '../data/songs';

import { expect, type Page, test, mockAuthenticatedSession } from './fixtures/app-test';
import { webmidiMockScript } from './fixtures/webmidi-mock';

const SONG_ID = 'twinkle-twinkle';

async function openSongLibrary(page: Page) {
  await page.getByRole('button', { name: /song library|曲库/i }).click();
  await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
}

async function enterSong(page: Page) {
  await openSongLibrary(page);
  await page.getByText('Twinkle Twinkle Little Star').click();
  await expect(page.getByTestId('staff-display')).toBeVisible();
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

async function playAcceptedSongNote(page: Page, midi: number): Promise<void> {
  const progressBefore = await getSongProgress(page);
  await expect
    .poll(
      async () => {
        await page.evaluate(async (note) => {
          window.__simulateMidiNoteOn(note);
          await new Promise((resolve) => setTimeout(resolve, 100));
          window.__simulateMidiNoteOff(note);
        }, midi);
        if (await page.getByRole('heading', { name: /song complete|完成曲目/i }).isVisible()) {
          return 100;
        }
        return getSongProgress(page);
      },
      { timeout: 5_000, message: `song note ${midi} should be accepted through WebMIDI` }
    )
    .toBeGreaterThan(progressBefore);
}

async function completeSong(page: Page) {
  const song = getSongById(SONG_ID);
  if (!song) throw new Error('missing song fixture');
  for (const note of song.notes) await playAcceptedSongNote(page, note.midi);
  await expect(page.getByRole('heading', { name: /song complete|完成曲目/i })).toBeVisible();
}

test.describe('Song Library Practice flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ content: webmidiMockScript });
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await expect(page.getByText('SightPlay')).toBeVisible();
  });

  test('navigate to library and see songs', async ({ page }) => {
    await openSongLibrary(page);
    await expect(page.getByRole('heading', { name: 'Twinkle Twinkle Little Star' })).toBeVisible();
    await expect(page.getByText('Ode to Joy')).toBeVisible();
  });

  test('select song, enter practice, and exit back to the exact library route', async ({
    page,
  }) => {
    await openSongLibrary(page);
    await page.getByRole('button', { name: /beginner|初级/i }).click();
    await expect(page).toHaveURL(/\/library\?difficulty=beginner$/);

    await page.getByText('Twinkle Twinkle Little Star').click();
    await expect(page.getByRole('heading', { name: 'Twinkle Twinkle Little Star' })).toBeVisible();
    await expect(page.getByTestId('piano-display')).toBeVisible();

    await page.getByRole('button', { name: /exit|退出/i }).click();
    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
    await expect(page).toHaveURL(/\/library\?difficulty=beginner$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/library$/);
  });

  test('real WebMIDI input advances song progress', async ({ page }) => {
    await enterSong(page);
    const song = getSongById(SONG_ID);
    if (!song) throw new Error('missing song fixture');
    const initialProgress = await getSongProgress(page);

    for (const note of song.notes.slice(0, 3)) await playAcceptedSongNote(page, note.midi);
    await expect.poll(() => getSongProgress(page)).toBeGreaterThan(initialProgress);
  });

  test('complete a song through WebMIDI and return from the result', async ({ page }) => {
    await enterSong(page);
    await completeSong(page);

    await expect(page.getByText(/accuracy|正确率/i).first()).toBeVisible();
    await expect(page.getByText(/correct notes|正确音符/i)).toBeVisible();
    await page.getByRole('button', { name: /back to library|返回曲库/i }).click();
    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
  });
});
