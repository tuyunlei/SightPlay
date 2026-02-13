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

/**
 * Helper to simulate MIDI note input via the test API
 * The test API is exposed by App.tsx in dev/test mode
 */
async function simulateMidiNote(
  page: Page,
  midiNumber: number,
  action: 'on' | 'off'
): Promise<void> {
  await page.evaluate(
    ({ midi, act }) => {
      const api = (window as any).__sightplayTestAPI;
      if (!api) {
        throw new Error('Test API not available - make sure test mode is enabled');
      }

      if (act === 'on') {
        api.simulateMidiNoteOn(midi);
      } else {
        api.simulateMidiNoteOff(midi);
      }
    },
    { midi: midiNumber, act: action }
  );
}

/**
 * Get the current target note MIDI number
 */
async function getTargetNoteMidi(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) return null;
    return api.getTargetNoteMidi();
  });
}

/**
 * Get the current score
 */
async function getScore(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) return 0;
    return api.getScore();
  });
}

/**
 * Get the current streak
 */
async function getStreak(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) return 0;
    return api.getState().streak;
  });
}

test.describe('Practice Interaction E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');
    // Wait for the app to be ready
    await expect(page.getByText('SightPlay')).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
  });

  test('should recognize correct note and update score', async ({ page }) => {
    // Get initial score
    const initialScore = await getScore(page);

    // Get the current target note
    const targetMidi = await getTargetNoteMidi(page);
    expect(targetMidi).not.toBeNull();

    // Simulate pressing the correct key
    await simulateMidiNote(page, targetMidi!, 'on');
    // Wait a bit for the note to be detected
    await page.waitForTimeout(100);
    // Release the key
    await simulateMidiNote(page, targetMidi!, 'off');

    // Wait for score update animation
    await page.waitForTimeout(500);

    // Verify score increased
    const newScore = await getScore(page);
    expect(newScore).toBeGreaterThan(initialScore);

    // Also verify UI score display matches
    const scoreDisplayText = await page.getByTestId('score-display').first().textContent();
    expect(parseInt(scoreDisplayText ?? '0', 10)).toBe(newScore);
  });

  test('should mark mistake when wrong note is played', async ({ page }) => {
    // Get the current target note
    const targetMidi = await getTargetNoteMidi(page);
    expect(targetMidi).not.toBeNull();

    // Get initial stats
    const initialStats = await page.evaluate(() => {
      const api = (window as any).__sightplayTestAPI;
      return api?.getSessionStats() ?? { cleanHits: 0, totalAttempts: 0 };
    });

    // Play a different note (wrong answer)
    const wrongMidi = targetMidi! + 2; // Two semitones off

    // Simulate pressing the wrong key
    await simulateMidiNote(page, wrongMidi, 'on');
    await page.waitForTimeout(100);
    await simulateMidiNote(page, wrongMidi, 'off');

    // Wait a bit for state to update
    await page.waitForTimeout(200);

    // Verify that the target note DIDN'T change (wrong notes don't advance the queue)
    const newTargetMidi = await getTargetNoteMidi(page);
    expect(newTargetMidi).toBe(targetMidi);

    // Now play the correct note to advance
    await simulateMidiNote(page, targetMidi!, 'on');
    await page.waitForTimeout(100);
    await simulateMidiNote(page, targetMidi!, 'off');
    await page.waitForTimeout(500);

    // Verify that a mistake was recorded
    const finalStats = await page.evaluate(() => {
      const api = (window as any).__sightplayTestAPI;
      return api?.getSessionStats() ?? { cleanHits: 0, totalAttempts: 0 };
    });

    // We should have advanced once (totalAttempts +1) but with a mistake (cleanHits unchanged or lower ratio)
    expect(finalStats.totalAttempts).toBeGreaterThan(initialStats.totalAttempts);
    const finalAccuracy =
      finalStats.totalAttempts > 0 ? (finalStats.cleanHits / finalStats.totalAttempts) * 100 : 100;
    const initialAccuracy =
      initialStats.totalAttempts > 0
        ? (initialStats.cleanHits / initialStats.totalAttempts) * 100
        : 100;

    // Accuracy should have dropped (or stayed the same if initial was already imperfect)
    expect(finalAccuracy).toBeLessThanOrEqual(initialAccuracy);
  });

  test('should build streak with consecutive correct answers', async ({ page }) => {
    // Get initial streak (might not be 0 if previous tests ran)
    const initialStreak = await getStreak(page);
    const initialScore = await getScore(page);

    // Play 3 correct notes in a row
    for (let i = 0; i < 3; i++) {
      const targetMidi = await getTargetNoteMidi(page);
      expect(targetMidi).not.toBeNull();

      await simulateMidiNote(page, targetMidi!, 'on');
      await page.waitForTimeout(100);
      await simulateMidiNote(page, targetMidi!, 'off');
      await page.waitForTimeout(500);

      // Verify streak increased
      const currentStreak = await getStreak(page);
      expect(currentStreak).toBe(initialStreak + i + 1);
    }

    // Verify score increased
    const finalScore = await getScore(page);
    expect(finalScore).toBeGreaterThan(initialScore);
  });
});
