/**
 * Browser WebMIDI boundary proof.
 *
 * The injected device is test-owned, but every MIDI message traverses the production browser adapter
 * and Practice runtime. Expected frames come from the public deterministic Exercise contract; no
 * production test API reads or mutates Practice state.
 */

import { createRandomExercise, frameAt, type RandomExerciseConfig } from '@sightplay/practice';

import { expect, type Page, test, mockAuthenticatedSession } from './fixtures/app-test';
import { E2E_PRACTICE_SEED, webmidiMockScript } from './fixtures/webmidi-mock';

const DEFAULT_CONFIG: RandomExerciseConfig = {
  clef: 'treble',
  practiceRange: 'combined',
  handMode: 'right-hand',
  includeAccidentals: false,
};

function expectedPitches(config: RandomExerciseConfig, index: number): readonly number[] {
  const exercise = createRandomExercise({ seed: E2E_PRACTICE_SEED, config });
  if (!exercise.ok) throw new Error('invalid deterministic WebMIDI fixture');
  const frame = frameAt(exercise.value, index);
  if (!frame) throw new Error(`missing deterministic frame ${index}`);
  return frame.pitches.map(Number);
}

async function visibleScore(page: Page): Promise<number> {
  return Number(await page.getByTestId('score-display').first().textContent());
}

async function sendFrame(page: Page, pitches: readonly number[]): Promise<void> {
  await page.evaluate((notes) => {
    notes.forEach((note) => window.__simulateMidiNoteOn(note));
    notes.forEach((note) => window.__simulateMidiNoteOff(note));
  }, pitches);
}

async function playAcceptedFrame(page: Page, pitches: readonly number[]): Promise<void> {
  const scoreBefore = await visibleScore(page);
  await expect
    .poll(
      async () => {
        await sendFrame(page, pitches);
        return visibleScore(page);
      },
      { timeout: 5_000, message: `Practice should accept MIDI frame ${pitches.join('+')}` }
    )
    .toBeGreaterThan(scoreBefore);
}

test.describe('WebMIDI production adapter', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ content: webmidiMockScript });
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await expect(page.getByTestId('staff-display')).toBeVisible();
  });

  test('reports a connected device through the Practice projection', async ({ page }) => {
    await expect(page.getByText(/MIDI ACTIVE|MIDI 已连接/i)).toBeVisible();
  });

  test('accepts a deterministic note through the complete WebMIDI pipeline', async ({ page }) => {
    await playAcceptedFrame(page, expectedPitches(DEFAULT_CONFIG, 0));
    await expect(page.getByTestId('score-display').first()).not.toHaveText('0');
  });

  test('advances consecutive deterministic frames through WebMIDI', async ({ page }) => {
    for (let index = 0; index < 3; index += 1) {
      await playAcceptedFrame(page, expectedPitches(DEFAULT_CONFIG, index));
    }
    expect(await visibleScore(page)).toBeGreaterThan(0);
  });

  test('accepts both pitches of a both-hands frame through WebMIDI', async ({ page }) => {
    await page.getByRole('button', { name: /Both Hands|双手/i }).click();
    const bothHands = { ...DEFAULT_CONFIG, handMode: 'both-hands' } as const;
    const pitches = expectedPitches(bothHands, 0);

    expect(pitches).toHaveLength(2);
    expect(pitches[0]).toBeGreaterThanOrEqual(60);
    expect(pitches[1]).toBeLessThanOrEqual(60);
    await playAcceptedFrame(page, pitches);
  });
});
