import { test, expect, Page } from '@playwright/test';

type PracticeState = {
  handMode?: 'right-hand' | 'left-hand' | 'both-hands';
  practiceRange?: 'central' | 'upper' | 'combined';
  noteQueue?: Array<{ midi: number }>;
};

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
    });
  });
}

async function getPracticeState(page: Page): Promise<PracticeState> {
  return page.evaluate(() => {
    const api = (window as any).__sightplayTestAPI;
    if (!api) throw new Error('Test API not available');
    return api.getState();
  });
}

test.describe('Practice Settings E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');
    await expect(page.getByText('SightPlay')).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
  });

  test('2.3.3 should switch hand mode and reflect in UI/state', async ({ page }) => {
    const rightHandBtn = page.getByRole('button', { name: /right hand|右手/i });
    const leftHandBtn = page.getByRole('button', { name: /left hand|左手/i });
    const bothHandsBtn = page.getByRole('button', { name: /both hands|双手/i });

    await rightHandBtn.click();
    await expect(rightHandBtn).toHaveClass(/bg-indigo-600/);

    let state = await getPracticeState(page);
    expect(state.handMode).toBe('right-hand');

    await leftHandBtn.click();
    await expect(leftHandBtn).toHaveClass(/bg-indigo-600/);
    await expect(rightHandBtn).not.toHaveClass(/bg-indigo-600/);

    state = await getPracticeState(page);
    expect(state.handMode).toBe('left-hand');

    await bothHandsBtn.click();
    await expect(bothHandsBtn).toHaveClass(/bg-indigo-600/);
    await expect(leftHandBtn).not.toHaveClass(/bg-indigo-600/);

    state = await getPracticeState(page);
    expect(state.handMode).toBe('both-hands');

    // In both-hands mode, queue starts as right-hand + left-hand pair
    const firstMidi = state.noteQueue?.[0]?.midi ?? -1;
    const secondMidi = state.noteQueue?.[1]?.midi ?? -1;
    expect(firstMidi).toBeGreaterThanOrEqual(60);
    expect(secondMidi).toBeLessThan(60);
  });

  test('2.3.4 should adjust practice range and regenerate note queue', async ({ page }) => {
    const centralBtn = page.getByRole('button', { name: /middle octave|中央八度/i });
    const upperBtn = page.getByRole('button', { name: /upper octave|高一八度/i });
    const combinedBtn = page.getByRole('button', { name: /middle \+ upper|中央 \+ 高/i });

    await centralBtn.click();
    await expect(centralBtn).toHaveClass(/bg-indigo-600/);

    let state = await getPracticeState(page);
    expect(state.practiceRange).toBe('central');
    const centralQueue = (state.noteQueue ?? []).slice(0, 5).map((note) => note.midi);

    await upperBtn.click();
    await expect(upperBtn).toHaveClass(/bg-indigo-600/);

    state = await getPracticeState(page);
    expect(state.practiceRange).toBe('upper');
    const upperQueue = (state.noteQueue ?? []).slice(0, 5).map((note) => note.midi);

    await combinedBtn.click();
    await expect(combinedBtn).toHaveClass(/bg-indigo-600/);

    state = await getPracticeState(page);
    expect(state.practiceRange).toBe('combined');
    const combinedQueue = (state.noteQueue ?? []).slice(0, 5).map((note) => note.midi);

    expect(upperQueue).not.toEqual(centralQueue);
    expect(combinedQueue).not.toEqual(upperQueue);
  });
});
