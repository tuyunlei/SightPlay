import { expect, test, Page } from '@playwright/test';

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
    });
  });
}

test.describe('Critical navigation smoke (no blank screens)', () => {
  test('random practice ↔ song library, open/close AI chat with meaningful content', async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');

    await expect(page.getByText('SightPlay')).toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();

    await page.getByRole('button', { name: /song library|曲库/i }).click();
    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
    await expect(page.getByText(/twinkle twinkle little star|小星星/i)).toBeVisible();

    await page.getByRole('button', { name: /random practice|随机练习/i }).click();
    await expect(page.getByTestId('staff-display')).toBeVisible();
    await expect(page.getByTestId('piano-display')).toBeVisible();

    await page.getByTestId('open-chat-button').click();
    await expect(page.getByText(/ai coach|ai 教练/i).first()).toBeVisible();
    await expect(page.getByTestId('close-chat-drawer')).toBeVisible();

    await page.getByTestId('close-chat-drawer').click();
    await expect(page.getByTestId('chat-drawer-input')).not.toBeVisible();
    await expect(page.getByTestId('staff-display')).toBeVisible();
  });
});
