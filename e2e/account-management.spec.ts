import { test, expect, Page } from '@playwright/test';

type Passkey = { id: string; name: string; createdAt: number };

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, hasPasskeys: true }),
    });
  });
}

async function openPasskeyManagement(page: Page) {
  await page.goto('/');
  await expect(page.getByText('SightPlay')).toBeVisible();

  const manageButton = page.getByTitle(/manage passkeys|管理 passkey/i);
  await expect(manageButton).toBeVisible();
  await manageButton.click();

  await expect(page.getByRole('heading', { name: /manage passkeys|管理 passkey/i })).toBeVisible();
}

test.describe('Account Management E2E', () => {
  test('1.5.1 should show passkey list after opening passkey management', async ({ page }) => {
    const passkeys: Passkey[] = [
      { id: 'pk-1', name: 'MacBook Pro', createdAt: 1700000000000 },
      { id: 'pk-2', name: 'iPhone 15', createdAt: 1701000000000 },
    ];

    await mockAuthenticatedSession(page);
    await page.route('**/api/auth/passkeys', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(passkeys),
      });
    });

    await openPasskeyManagement(page);

    await expect(page.getByText('MacBook Pro')).toBeVisible();
    await expect(page.getByText('iPhone 15')).toBeVisible();
  });

  test('1.5.2 should delete a non-last passkey and refresh list', async ({ page }) => {
    let currentPasskeys: Passkey[] = [
      { id: 'pk-1', name: 'MacBook Pro', createdAt: 1700000000000 },
      { id: 'pk-2', name: 'iPhone 15', createdAt: 1701000000000 },
    ];

    await mockAuthenticatedSession(page);

    await page.route('**/api/auth/passkeys', (route, request) => {
      if (request.method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentPasskeys),
        });
        return;
      }
      route.fallback();
    });

    await page.route('**/api/auth/passkeys?id=*', (route, request) => {
      if (request.method() === 'DELETE') {
        const id = new URL(request.url()).searchParams.get('id');
        currentPasskeys = currentPasskeys.filter((item) => item.id !== id);
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      route.fallback();
    });

    page.on('dialog', (dialog) => dialog.accept());

    await openPasskeyManagement(page);

    const deleteButtons = page.getByRole('button', { name: /remove|删除/i });
    await expect(deleteButtons).toHaveCount(2);
    await deleteButtons.nth(1).click();

    await expect(page.getByText('iPhone 15')).not.toBeVisible();
    await expect(page.getByText('MacBook Pro')).toBeVisible();
  });

  test('1.5.3 should refuse deleting the last passkey', async ({ page }) => {
    let deleteCalled = false;

    await mockAuthenticatedSession(page);
    await page.route('**/api/auth/passkeys', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'pk-only', name: 'Only Device', createdAt: 1700000000000 }]),
      });
    });

    await page.route('**/api/auth/passkeys?id=*', (route, request) => {
      if (request.method() === 'DELETE') {
        deleteCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      route.fallback();
    });

    await openPasskeyManagement(page);

    const disabledDelete = page.getByRole('button', {
      name: /cannot remove the last passkey|无法删除最后一个 passkey/i,
    });
    await expect(disabledDelete).toBeDisabled();
    await expect(disabledDelete).toHaveAttribute(
      'title',
      /cannot remove the last passkey|无法删除最后一个 passkey/i
    );
    expect(deleteCalled).toBe(false);
  });

  test('1.5.4 should generate invite code in XXXX-XXXX format', async ({ page }) => {
    await mockAuthenticatedSession(page);

    await page.route('**/api/auth/passkeys', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'pk-1', name: 'MacBook Pro', createdAt: 1700000000000 }]),
      });
    });

    await page.route('**/api/auth/invite', (route, request) => {
      if (request.method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: ['ABCD-1234'] }),
        });
        return;
      }
      route.fallback();
    });

    await openPasskeyManagement(page);

    await page.getByRole('button', { name: /generate invite code|生成邀请码/i }).click();

    const inviteCode = page.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await expect(inviteCode).toBeVisible();
    await expect(inviteCode).toHaveText('ABCD-1234');
  });
});
