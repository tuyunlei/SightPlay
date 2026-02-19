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

type ChatMockOptions = {
  shouldFail?: boolean;
  delayMs?: number;
};

async function mockChatApi(page: Page, options: ChatMockOptions = {}) {
  const aiReplies = ['Mock AI reply - round 1', 'Mock AI reply - round 2'];
  let callCount = 0;

  await page.route('**/api/chat', async (route) => {
    callCount += 1;

    if (options.delayMs) {
      await page.waitForTimeout(options.delayMs);
    }

    if (options.shouldFail) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'mocked failure' }),
      });
      return;
    }

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

  return {
    getCallCount: () => callCount,
  };
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
  test('should show user and AI messages in correct order across multiple rounds', async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await mockChatApi(page);
    await page.goto('/');

    await expect(page.getByText('SightPlay')).toBeVisible();
    await openChatDrawer(page);

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

  test('should show localized AI connection error when API fails', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockChatApi(page, { shouldFail: true });
    await page.goto('/');
    await openChatDrawer(page);

    await sendMessage(page, 'Can you help me?');

    await expect(
      page.getByText(/sorry, i'm having trouble connecting|抱歉，连接出现问题/i)
    ).toBeVisible();
  });

  test('should not send empty or whitespace-only message', async ({ page }) => {
    await mockAuthenticatedSession(page);
    const chatMock = await mockChatApi(page);
    await page.goto('/');
    await openChatDrawer(page);

    await sendMessage(page, '   ');

    await expect(page.getByText('Mock AI reply - round 1')).not.toBeVisible();
    expect(chatMock.getCallCount()).toBe(0);
  });

  test('should preserve chat history when navigating between tabs', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockChatApi(page);
    await page.goto('/');
    await openChatDrawer(page);

    const userMessage = 'Remember this context please';
    await sendMessage(page, userMessage);
    await expect(page.getByText(userMessage, { exact: true })).toBeVisible();
    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();

    await page.getByTestId('close-chat-drawer').click();
    await page.getByRole('button', { name: /song library|曲库/i }).click();
    await page.getByRole('button', { name: /random practice|随机练习/i }).click();

    await openChatDrawer(page);
    await expect(page.getByText(userMessage, { exact: true })).toBeVisible();
    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();
  });

  test('should support long user message and show loading state while waiting', async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await mockChatApi(page, { delayMs: 1200 });
    await page.goto('/');
    await openChatDrawer(page);

    const longMessage = `Long message: ${'practice '.repeat(80)}`;
    const loadingDots = page.locator('.animate-bounce');

    await sendMessage(page, longMessage);

    await expect(page.getByText(longMessage, { exact: true })).toBeVisible();
    await expect(loadingDots.first()).toBeVisible();

    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();
    await expect(loadingDots.first()).not.toBeVisible();
  });
});
