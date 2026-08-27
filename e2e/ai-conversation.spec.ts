import { guidanceFailed, guidanceSucceeded } from '@sightplay/api-contracts';

import { test, expect, Page, mockAuthenticatedSession } from './fixtures/app-test';

type ChatMockOptions = {
  shouldFail?: boolean;
  deferred?: boolean;
};

async function mockChatApi(page: Page, options: ChatMockOptions = {}) {
  const aiReplies = ['Mock AI reply - round 1', 'Mock AI reply - round 2'];
  let callCount = 0;
  let successCount = 0;
  let remainingFailures = options.shouldFail ? 1 : 0;
  let releaseResponse = () => undefined;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });

  await page.route('**/api/chat', async (route) => {
    callCount += 1;

    if (options.deferred) await responseGate;

    if (remainingFailures > 0) {
      remainingFailures -= 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify(guidanceFailed('internal', true, `mock-${callCount}`)),
      });
      return;
    }

    const requestBody = route.request().postDataJSON() as {
      message: string;
      clef: string;
      lang: string;
    };
    successCount += 1;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        guidanceSucceeded(
          {
            replyText: aiReplies[Math.min(successCount - 1, aiReplies.length - 1)],
            challengeData: null,
          },
          `mock-${callCount}-${requestBody.message.length}`
        )
      ),
    });
  });

  return {
    getCallCount: () => callCount,
    releaseResponse,
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
    await page.goto('/practice');

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

  test('should accept a retry after a failed AI request', async ({ page, diagnostics }) => {
    diagnostics.allowHttpError('/api/chat', 500);
    await mockAuthenticatedSession(page);
    await mockChatApi(page, { shouldFail: true });
    await page.goto('/practice');
    await openChatDrawer(page);

    await sendMessage(page, 'Can you help me?');

    await expect(chatDrawerInput(page)).toBeEnabled();
    await sendMessage(page, 'Please try again');
    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();
  });

  test('should not send empty or whitespace-only message', async ({ page }) => {
    await mockAuthenticatedSession(page);
    const chatMock = await mockChatApi(page);
    await page.goto('/practice');
    await openChatDrawer(page);

    await sendMessage(page, '   ');

    await expect(page.getByText('Mock AI reply - round 1')).not.toBeVisible();
    expect(chatMock.getCallCount()).toBe(0);
  });

  test('should preserve chat history when navigating between tabs', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockChatApi(page);
    await page.goto('/practice');
    await openChatDrawer(page);

    const userMessage = 'Remember this context please';
    await sendMessage(page, userMessage);
    await expect(page.getByText(userMessage, { exact: true })).toBeVisible();
    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();

    await page.getByTestId('close-chat-drawer').click();
    await page.getByRole('button', { name: /song library|曲库/i }).click();
    await page.getByRole('button', { name: /free practice|自由练习/i }).click();

    await openChatDrawer(page);
    await expect(page.getByText(userMessage, { exact: true })).toBeVisible();
    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();
  });

  test('should support long user message and show loading state while waiting', async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    const chatMock = await mockChatApi(page, { deferred: true });
    await page.goto('/practice');
    await openChatDrawer(page);

    const longMessage = `Long message: ${'practice '.repeat(80)}`;
    const loadingDots = page.locator('.animate-bounce');

    await sendMessage(page, longMessage);

    await expect(page.getByText(longMessage, { exact: true })).toBeVisible();
    await expect(loadingDots.first()).toBeVisible();

    chatMock.releaseResponse();
    await expect(page.getByText('Mock AI reply - round 1', { exact: true })).toBeVisible();
    await expect(loadingDots.first()).not.toBeVisible();
  });
});
