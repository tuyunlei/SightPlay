import { createCurriculumExercise } from '@sightplay/practice';

import { expect, test, mockAuthenticatedSession } from './fixtures/app-test';
import { E2E_PRACTICE_SEED, webmidiMockScript } from './fixtures/webmidi-mock';

async function completedFrames(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByText(/^\d+ \/ \d+$/).textContent();
  const match = text?.match(/^(\d+)\s*\/\s*\d+$/);
  return match ? Number(match[1]) : 0;
}

async function playAcceptedNote(page: import('@playwright/test').Page, midi: number) {
  const before = await completedFrames(page);
  await expect
    .poll(async () => {
      await page.evaluate((note) => {
        window.__simulateMidiNoteOn(note);
        window.__simulateMidiNoteOff(note);
      }, midi);
      return completedFrames(page);
    })
    .toBeGreaterThan(before);
}

test('authenticated entry starts a structured curriculum lesson', async ({ page }) => {
  await page.addInitScript({ content: webmidiMockScript });
  await mockAuthenticatedSession(page);
  await page.goto('/');

  await expect(page).toHaveURL(/\/course$/);
  await expect(page.getByRole('heading', { name: /sight-reading course|识谱课程/i })).toBeVisible();

  const plannedKeyboardLesson = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: /groups of two and three|两黑键与三黑键/i }),
  });
  await expect(plannedKeyboardLesson.getByText(/planned|规划中/i)).toBeVisible();
  await expect(plannedKeyboardLesson.getByRole('button')).toHaveCount(0);

  const landmarkLesson = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: /steps around middle c|中央 c 附近的级进/i }),
  });
  await landmarkLesson.getByRole('button', { name: /start lesson|开始练习/i }).click();

  await expect(page).toHaveURL(/\/course\/landmark-steps$/);
  await expect(page.getByTestId('staff-display')).toBeVisible();
  await expect(page.getByText(/warm-up|热身/i)).toBeVisible();

  const exercise = createCurriculumExercise({
    lessonId: 'landmark-steps',
    seed: E2E_PRACTICE_SEED,
  });
  if (!exercise.ok) throw new Error('invalid curriculum E2E fixture');
  for (const frame of exercise.value.frames) {
    await playAcceptedNote(page, Number(frame.pitches[0]));
  }

  await expect(page.getByRole('heading', { name: /lesson complete|完成课程/i })).toBeVisible();
  await expect(page.getByText(/^(new phrase|陌生短句)$/i)).toBeVisible();
  await page.getByRole('button', { name: /new variation|换个变体/i }).click();
  await expect(page.getByText(/^0 \/ \d+$/)).toBeVisible();
});
