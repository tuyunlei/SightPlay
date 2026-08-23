import type { Page } from './fixtures/app-test';
import { expect, test } from './fixtures/system-test';

const INVITE_CODE = 'PRVV-E2E2';

async function register(page: Page): Promise<void> {
  await page.goto(`/register?code=${INVITE_CODE}`);
  await page.getByRole('button', { name: /create passkey|创建 Passkey/i }).click();
  await expect(page.getByRole('heading', { name: /sight-reading course|识谱课程/i })).toBeVisible({
    timeout: 15_000,
  });
}

test('@provider real Gemini returns the SightPlay chat contract', async ({ page, system }) => {
  test.skip(!process.env.GEMINI_API_KEY, 'GEMINI_API_KEY is required for the provider canary');
  await system.send({ action: 'seedInvite', code: INVITE_CODE });
  await register(page);

  const result = await page.evaluate(async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: 'Give one short sight-reading tip.',
        clef: 'treble',
        lang: 'en',
      }),
    });
    return { status: response.status, body: await response.json() };
  });

  expect(result.status).toBe(200);
  expect(result.body.ok).toBe(true);
  expect(result.body.data.replyText).toEqual(expect.any(String));
  expect(
    result.body.data.challengeData === null ||
      (typeof result.body.data.challengeData === 'object' &&
        result.body.data.challengeData !== null)
  ).toBe(true);
  expect(result.body.data.replyText.trim().length).toBeGreaterThan(0);
});
