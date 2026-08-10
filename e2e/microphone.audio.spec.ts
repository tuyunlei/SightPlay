import { expect, mockAuthenticatedSession, test } from './fixtures/app-test';

test.use({ randomValue: 0.45 });

test('@critical fake capture device drives the real Web Audio pitch pipeline', async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.goto('/');
  await expect(page.getByTestId('staff-display')).toBeVisible();
  await expect(page.getByTestId('score-display').first()).toHaveText('0');

  await page.getByTitle(/start mic|开启麦克风/i).click();
  await expect(page.getByText(/mic on|监听中/i)).toBeVisible();
  await expect
    .poll(async () => Number(await page.getByTestId('score-display').first().textContent()), {
      timeout: 10_000,
      message: '440 Hz fixture should be detected as the deterministic A4 target',
    })
    .toBeGreaterThan(0);
});
