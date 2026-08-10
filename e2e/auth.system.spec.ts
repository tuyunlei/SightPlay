import type { Page } from '@playwright/test';

import { expect, test } from './fixtures/system-test';

const INVITE_CODE = 'ABCD-EFGH';

async function registerWithRealPasskey(page: Page): Promise<void> {
  await page.goto(`/register?code=${INVITE_CODE}`);
  await expect(page.getByTestId('register-screen')).toBeVisible();
  await expect(page.locator('#invite-code')).toHaveValue(INVITE_CODE);
  await page.getByRole('button', { name: /create passkey|创建 Passkey/i }).click();
  await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 15_000 });
}

test.describe('real local system journeys', () => {
  test('@critical register → session → logout → reload → passkey login', async ({
    page,
    system,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Playwright virtual WebAuthn is Chromium-only');
    await system.send({ action: 'seedInvite', code: INVITE_CODE });
    await registerWithRealPasskey(page);

    const authenticatedSession = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      return { ok: response.ok, body: await response.json() };
    });
    expect(authenticatedSession).toEqual({
      ok: true,
      body: { authenticated: true, hasPasskeys: true },
    });

    await page.getByTitle(/manage passkeys|管理 Passkey/i).click();
    await expect(
      page.getByRole('heading', { name: /manage passkeys|管理 Passkey/i })
    ).toBeVisible();
    await expect(page.getByText(/platform authenticator|passkey/i).first()).toBeVisible();

    await page.getByRole('button', { name: /logout|退出登录/i }).click();
    await expect(page.getByTestId('login-screen')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('login-screen')).toBeVisible();

    await page.getByRole('button', { name: /use passkey|sign in|登录/i }).click();
    await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 15_000 });
  });

  test('@critical authenticated UI → real chat handler → controlled Gemini upstream', async ({
    page,
    system,
  }) => {
    await system.send({ action: 'seedAuthenticatedSession' });
    await system.send({
      action: 'setChatScenario',
      scenario: { kind: 'success', replyText: 'Controlled system response.' },
    });
    await page.goto('/');
    await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('open-chat-button').click();
    await page.getByTestId('chat-drawer-input').fill('Explain middle C');
    await page.getByTestId('chat-drawer-input').press('Enter');

    await expect(page.getByText('Controlled system response.')).toBeVisible({ timeout: 10_000 });
  });

  test('@critical seeded session → real session handler → logout → reload', async ({
    page,
    system,
  }) => {
    await system.send({ action: 'seedAuthenticatedSession' });
    await page.goto('/');
    await expect(page.getByTestId('staff-display')).toBeVisible({ timeout: 15_000 });

    const authenticatedSession = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      return { ok: response.ok, body: await response.json() };
    });
    expect(authenticatedSession).toEqual({
      ok: true,
      body: { authenticated: true, hasPasskeys: true },
    });

    await page.getByTitle(/manage passkeys|管理 Passkey/i).click();
    await page.getByRole('button', { name: /logout|退出登录/i }).click();
    await expect(page.getByTestId('login-screen')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('login-screen')).toBeVisible();
  });
});
