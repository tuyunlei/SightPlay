import { expect, test, mockAuthenticatedSession } from './fixtures/app-test';

test.describe('Critical navigation smoke (no blank screens)', () => {
  test('course ↔ free practice ↔ song library, open/close AI chat with meaningful content', async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/course$/);
    await expect(
      page.getByRole('heading', { name: /sight-reading course|识谱课程/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /free practice|自由练习/i }).click();
    await expect(page.getByTestId('staff-display')).toBeVisible();

    await page.getByRole('button', { name: /song library|曲库/i }).click();
    await expect(page.getByRole('heading', { name: /song library|曲库/i })).toBeVisible();
    await expect(page.getByText(/twinkle twinkle little star|小星星/i)).toBeVisible();

    await page.getByRole('button', { name: /free practice|自由练习/i }).click();
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
