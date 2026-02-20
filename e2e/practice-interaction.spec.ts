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

async function getTargetNoteMidi(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) return null;
    return api.getTargetNoteMidi();
  });
}

async function getScore(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) return 0;
    return api.getScore();
  });
}

async function getStreak(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) return 0;
    return api.getState().streak;
  });
}

async function requireTargetMidi(page: Page): Promise<number> {
  const targetMidi = await getTargetNoteMidi(page);
  if (targetMidi === null) {
    throw new Error('Target note not found');
  }
  return targetMidi;
}

async function playWrongThenCorrect(page: Page): Promise<void> {
  const targetMidi = await requireTargetMidi(page);

  const wrongMidi = targetMidi + 2;
  await simulateMidiNote(page, wrongMidi, 'on');
  await page.waitForTimeout(100);
  await simulateMidiNote(page, wrongMidi, 'off');

  await simulateMidiNote(page, targetMidi, 'on');
  await page.waitForTimeout(100);
  await simulateMidiNote(page, targetMidi, 'off');
  await page.waitForTimeout(350);
}

test.describe('Practice Interaction E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await expect(page.getByText('SightPlay')).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
  });

  test('should recognize correct note and update score', async ({ page }) => {
    const initialScore = await getScore(page);
    const targetMidi = await requireTargetMidi(page);

    await simulateMidiNote(page, targetMidi, 'on');
    await page.waitForTimeout(100);
    await simulateMidiNote(page, targetMidi, 'off');
    await page.waitForTimeout(500);

    const newScore = await getScore(page);
    expect(newScore).toBeGreaterThan(initialScore);

    const scoreDisplayText = await page.getByTestId('score-display').first().textContent();
    expect(parseInt(scoreDisplayText ?? '0', 10)).toBe(newScore);
  });

  test('should mark mistake when wrong note is played', async ({ page }) => {
    const targetMidi = await requireTargetMidi(page);

    const initialStats = await page.evaluate(() => {
      const api = (window as any).__sightplayTestAPI;
      return api?.getSessionStats() ?? { cleanHits: 0, totalAttempts: 0 };
    });

    const wrongMidi = targetMidi + 2;
    await simulateMidiNote(page, wrongMidi, 'on');
    await page.waitForTimeout(100);
    await simulateMidiNote(page, wrongMidi, 'off');
    await page.waitForTimeout(200);

    const newTargetMidi = await getTargetNoteMidi(page);
    expect(newTargetMidi).toBe(targetMidi);

    await simulateMidiNote(page, targetMidi, 'on');
    await page.waitForTimeout(100);
    await simulateMidiNote(page, targetMidi, 'off');
    await page.waitForTimeout(500);

    const finalStats = await page.evaluate(() => {
      const api = (window as any).__sightplayTestAPI;
      return api?.getSessionStats() ?? { cleanHits: 0, totalAttempts: 0 };
    });

    expect(finalStats.totalAttempts).toBeGreaterThan(initialStats.totalAttempts);
    const finalAccuracy =
      finalStats.totalAttempts > 0 ? (finalStats.cleanHits / finalStats.totalAttempts) * 100 : 100;
    const initialAccuracy =
      initialStats.totalAttempts > 0
        ? (initialStats.cleanHits / initialStats.totalAttempts) * 100
        : 100;

    expect(finalAccuracy).toBeLessThanOrEqual(initialAccuracy);
  });

  test('should build streak with consecutive correct answers', async ({ page }) => {
    const initialStreak = await getStreak(page);
    const initialScore = await getScore(page);

    for (let i = 0; i < 3; i++) {
      const targetMidi = await getTargetNoteMidi(page);
      expect(targetMidi).not.toBeNull();

      await simulateMidiNote(page, targetMidi, 'on');
      await page.waitForTimeout(100);
      await simulateMidiNote(page, targetMidi, 'off');
      await page.waitForTimeout(500);

      const currentStreak = await getStreak(page);
      expect(currentStreak).toBe(initialStreak + i + 1);
    }

    const finalScore = await getScore(page);
    expect(finalScore).toBeGreaterThan(initialScore);
  });

  test('2.4.1 should show HintBubble with hint text after repeated mistakes', async ({ page }) => {
    await page.route('**/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          replyText: 'Try staying near middle C and read one note at a time.',
          challengeData: null,
        }),
      });
    });

    await playWrongThenCorrect(page);
    await playWrongThenCorrect(page);
    await playWrongThenCorrect(page);

    const hintBubble = page.getByTestId('hint-bubble');
    await expect(hintBubble).toBeVisible();
    await expect(hintBubble).toContainText(
      'Try staying near middle C and read one note at a time.'
    );
  });
});
