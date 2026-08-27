import { expect, test } from './fixtures/app-test';

test.beforeAll(() => {
  if (!process.env.SIGHTPLAY_E2E_EXTERNAL_BASE_URL) {
    throw new Error('SIGHTPLAY_E2E_EXTERNAL_BASE_URL is required');
  }
});

test('@preview deployed app serves a usable entry state without runtime failures', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/SightPlay/i);
  await expect(
    page
      .getByTestId('login-screen')
      .or(page.getByTestId('register-screen'))
      .or(page.getByTestId('staff-display'))
      .or(page.getByRole('heading', { name: /sight-reading course|识谱课程/i }))
  ).toBeVisible({ timeout: 15_000 });
});
