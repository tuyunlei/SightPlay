import { expect, mockAuthenticatedSession, test } from './fixtures/app-test';

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
      message: 'the real audio pipeline should accept the generated Practice target',
    })
    .toBeGreaterThan(0);
});
