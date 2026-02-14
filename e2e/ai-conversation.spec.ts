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

async function mockChatApi(page: Page) {
  const aiReplies = ['Mock AI reply - round 1', 'Mock AI reply - round 2'];
  let callCount = 0;

  await page.route('**/api/chat', async (route) => {
    callCount += 1;
    const requestBody = route.request().postDataJSON() as {
      message: string;
      clef: string;
      lang: string;
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        replyText: aiReplies[Math.min(callCount - 1, aiReplies.length - 1)],
        challengeData: null,
        echo: requestBody.message,
      }),
    });
  });
}

function chatDrawerInput(page: Page) {
  return page.getByTestId('chat-drawer-input');
}

async function openChatDrawer(page: Page) {
  await page.getByTestId('open-chat-button').click();
  await expect(chatDrawerInput(page)).toBeVisible();
}

async function sendMessage(page: Page, message: string) {
  await chatDrawerInput(page).fill(message);
  await chatDrawerInput(page).press('Enter');
}

test.describe('AI conversation E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockChatApi(page);
    await page.goto('/');

    await expect(page.getByText('SightPlay')).toBeVisible();
    // Open the chat drawer
    await openChatDrawer(page);
  });

  test('should show user and AI messages in correct order across multiple rounds', async ({
    page,
  }) => {
    const userRound1 = 'Please help me with note reading';
    const userRound2 = 'Give me another quick tip';
    const aiRound1 = 'Mock AI reply - round 1';
    const aiRound2 = 'Mock AI reply - round 2';

    await sendMessage(page, userRound1);

    await expect(page.getByText(userRound1, { exact: true })).toBeVisible();
    await expect(page.getByText(aiRound1, { exact: true })).toBeVisible();

    await sendMessage(page, userRound2);

    await expect(page.getByText(userRound2, { exact: true })).toBeVisible();
    await expect(page.getByText(aiRound2, { exact: true })).toBeVisible();

    const drawer = page.locator('[data-testid="chat-drawer-input"]').locator('..');
    const conversationText = await drawer.locator('..').innerText();
    expect(conversationText.indexOf(userRound1)).toBeGreaterThan(-1);
    expect(conversationText.indexOf(aiRound1)).toBeGreaterThan(
      conversationText.indexOf(userRound1)
    );
    expect(conversationText.indexOf(userRound2)).toBeGreaterThan(
      conversationText.indexOf(aiRound1)
    );
    expect(conversationText.indexOf(aiRound2)).toBeGreaterThan(
      conversationText.indexOf(userRound2)
    );
  });
});
