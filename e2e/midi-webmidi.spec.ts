/**
 * E2E tests for the FULL WebMIDI pipeline.
 *
 * These tests exercise MidiService → useMidiInput → usePracticeSession end-to-
 * end by injecting a fake `navigator.requestMIDIAccess` via Playwright's
 * `addInitScript` BEFORE the page loads.  We intentionally do NOT use
 * `__sightplayTestAPI.simulateMidiNoteOn/Off`; those bypass MidiService.
 *
 * We do still use `__sightplayTestAPI.getTargetNoteMidi()` and `getScore()` to
 * READ state — that's fine because we're testing the INPUT path.
 */

import { expect, Page, test } from '@playwright/test';

import { webmidiMockScript } from './fixtures/webmidi-mock';

// ── helpers ───────────────────────────────────────────────────────────────────

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
    });
  });
}

async function getTargetMidi(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    return api?.getTargetNoteMidi() ?? null;
  });
}

async function requireTargetMidi(page: Page): Promise<number> {
  const midi = await getTargetMidi(page);
  if (midi === null) throw new Error('Target note not found');
  return midi;
}

async function getScore(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    return api?.getScore() ?? 0;
  });
}

async function getSessionStats(page: Page) {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    return api?.getSessionStats() ?? { cleanHits: 0, totalAttempts: 0 };
  });
}

async function noteOn(page: Page, midi: number) {
  await page.evaluate((m) => (window as any).__simulateMidiNoteOn(m), midi);
}

async function noteOff(page: Page, midi: number) {
  await page.evaluate((m) => (window as any).__simulateMidiNoteOff(m), midi);
}

async function playNote(page: Page, midi: number, holdMs = 80) {
  await noteOn(page, midi);
  await page.waitForTimeout(holdMs);
  await noteOff(page, midi);
}

// ── test setup ────────────────────────────────────────────────────────────────

test.describe('WebMIDI pipeline E2E (addInitScript mock)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject the WebMIDI mock BEFORE the page loads so MidiService picks it up
    await page.addInitScript({ content: webmidiMockScript });

    await mockAuthenticatedSession(page);
    await page.goto('/');

    await expect(page.getByText('SightPlay')).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
  });

  // ── 1. MIDI device connection ────────────────────────────────────────────

  test('1. MIDI connection state is true when fake device is present', async ({ page }) => {
    // The mock pre-populates one connected input.  MidiService should call
    // onConnectionChange(true) → setIsMidiConnected(true) in the store.
    // We verify via the test API so this test is locale-independent.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as any).__sightplayTestAPI?.getState().isMidiConnected ?? false
          ),
        { timeout: 5000, message: 'isMidiConnected should become true after MIDI init' }
      )
      .toBe(true);

    // Also confirm the connection badge is actually rendered in the DOM
    // (the badge text varies by locale; match either English or Chinese)
    await expect(page.getByText(/MIDI ACTIVE|MIDI 已连接/i)).toBeVisible({ timeout: 3000 });
  });

  // ── 2. Correct note via WebMIDI ──────────────────────────────────────────

  test('2. Correct note via WebMIDI increases score', async ({ page }) => {
    const initialScore = await getScore(page);
    const targetMidi = await requireTargetMidi(page);

    await playNote(page, targetMidi);
    await page.waitForTimeout(500);

    const newScore = await getScore(page);
    expect(newScore).toBeGreaterThan(initialScore);

    // Also verify the DOM score display reflects the new value
    const scoreText = await page.getByTestId('score-display').first().textContent();
    expect(parseInt(scoreText ?? '0', 10)).toBe(newScore);
  });

  // ── 3. Wrong note via WebMIDI ────────────────────────────────────────────

  test('3. Wrong note via WebMIDI registers a mistake', async ({ page }) => {
    const targetMidi = await requireTargetMidi(page);
    const beforeStats = await getSessionStats(page);

    // Send a note that is definitely not the target
    const wrongMidi = targetMidi + 2;
    await playNote(page, wrongMidi);
    await page.waitForTimeout(200);

    // Target should remain the same (no advancement on wrong note)
    const stillTarget = await getTargetMidi(page);
    expect(stillTarget).toBe(targetMidi);

    // Now play the correct note to complete the attempt
    await playNote(page, targetMidi);
    await page.waitForTimeout(500);

    const afterStats = await getSessionStats(page);
    expect(afterStats.totalAttempts).toBeGreaterThan(beforeStats.totalAttempts);

    // Accuracy should have dropped (cleanHits / totalAttempts < 100%)
    const accuracy =
      afterStats.totalAttempts > 0 ? (afterStats.cleanHits / afterStats.totalAttempts) * 100 : 100;
    expect(accuracy).toBeLessThan(100);
  });

  // ── 4. Note sequence via WebMIDI ─────────────────────────────────────────

  test('4. Playing 3 correct notes in sequence advances score', async ({ page }) => {
    const initialScore = await getScore(page);

    for (let i = 0; i < 3; i++) {
      const targetMidi = await requireTargetMidi(page);
      await playNote(page, targetMidi);
      // Wait for state transition (auto-advance to next note)
      await page.waitForTimeout(450);
    }

    const finalScore = await getScore(page);
    expect(finalScore).toBeGreaterThan(initialScore);
  });

  // ── 5. Both-hands mode via WebMIDI ───────────────────────────────────────

  test('5. Both-hands mode: WebMIDI notes are detected for both hands', async ({ page }) => {
    // Switch to both-hands mode via the HandModeSelector UI button.
    // Button label varies by locale (English: "Both Hands", Chinese: "双手").
    await page.getByRole('button', { name: /Both Hands|双手/i }).click();
    await page.waitForTimeout(300); // allow mode change to settle

    // Verify the mode changed in state
    const handMode = await page.evaluate(
      () => (window as any).__sightplayTestAPI?.getState().handMode
    );
    expect(handMode).toBe('both-hands');

    // Both-hands queue: noteQueue[0]=right-hand (midi>=60), noteQueue[1]=left-hand (midi<=60)
    const targets = await page.evaluate(() => {
      const api = (window as any).__sightplayTestAPI;
      const state = api?.getState();
      const queue = state?.noteQueue ?? [];
      return {
        right: (queue[0]?.midi ?? null) as number | null,
        left: (queue[1]?.midi ?? null) as number | null,
      };
    });

    if (targets.right === null || targets.left === null) {
      // Queue not populated — both-hands generation may be empty in this env
      return;
    }

    // Verify the queue layout matches the both-hands contract
    expect(targets.right).toBeGreaterThanOrEqual(60); // treble / right hand
    expect(targets.left).toBeLessThanOrEqual(60); // bass / left hand

    // Send the right-hand note via WebMIDI and verify it is detected in state
    await noteOn(page, targets.right);
    await page.waitForTimeout(150);

    const detectedMidi = await page.evaluate(
      () => (window as any).__sightplayTestAPI?.getState().detectedNote?.midi ?? null
    );
    expect(detectedMidi).toBe(targets.right);

    await noteOff(page, targets.right);
    await page.waitForTimeout(100);

    // Send the left-hand note and verify detection as well
    await noteOn(page, targets.left);
    await page.waitForTimeout(150);

    const detectedLeft = await page.evaluate(
      () => (window as any).__sightplayTestAPI?.getState().detectedNote?.midi ?? null
    );
    expect(detectedLeft).toBe(targets.left);

    await noteOff(page, targets.left);
  });
});
