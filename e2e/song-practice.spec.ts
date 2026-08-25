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

async function sendSongFrame(page: Page, pitches: readonly number[]): Promise<void> {
  await page.evaluate((notes) => {
    notes.forEach((note) => window.__simulateMidiNoteOn(note));
    notes.forEach((note) => window.__simulateMidiNoteOff(note));
  }, pitches);
}

async function playAcceptedSongFrame(page: Page, pitches: readonly number[]): Promise<void> {
  const progressBefore = await getSongProgress(page);
  await expect
    .poll(
      async () => {
        await sendSongFrame(page, pitches);
        if (await page.getByRole('heading', { name: /song complete|完成曲目/i }).isVisible()) {
          return 100;
        }
        return getSongProgress(page);
      },
      {
        timeout: 5_000,
        message: `song frame ${pitches.join('+')} should be accepted through WebMIDI`,
      }
    )
    .toBeGreaterThan(progressBefore);
}

async function completeSong(page: Page) {
  const song = getSongById(SONG_ID);
  if (!song) throw new Error('missing song fixture');
  for (const frame of song.frames) await playAcceptedSongFrame(page, frame.pitches);
  await expect(page.getByRole('heading', { name: /song complete|完成曲目/i })).toBeVisible();
}

test.describe('Song Library Practice flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ content: webmidiMockScript });
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
    ).toBeVisible();
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

    for (const frame of song.frames.slice(0, 3)) {
      await playAcceptedSongFrame(page, frame.pitches);
    }
    await expect.poll(() => getSongProgress(page)).toBeGreaterThan(initialProgress);
  });

  test('requires both pitches in the Canon two-hand lesson', async ({ page }) => {
    const song = getSongById('canon-in-d-two-hands');
    if (!song) throw new Error('missing Canon two-hand fixture');
    const firstFrame = song.frames[0];
    if (!firstFrame) throw new Error('missing Canon two-hand opening frame');

    await openSongLibrary(page);
    await page.getByText('Canon in D — Two-Hand Theme').click();
    await expect(page).toHaveURL(/\/songs\/canon-in-d-two-hands$/);
    await expect(page.getByText(/normalizes rhythm|统一了节奏/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /source|谱源/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Creative Commons Attribution 4.0/i })
    ).toBeVisible();

    expect(firstFrame.pitches).toHaveLength(2);
    const initialProgress = await getSongProgress(page);
    await sendSongFrame(page, firstFrame.pitches.slice(0, 1));
    await expect.poll(() => getSongProgress(page)).toBe(initialProgress);

    await playAcceptedSongFrame(page, firstFrame.pitches);
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
