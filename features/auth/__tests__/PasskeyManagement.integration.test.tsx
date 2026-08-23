import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountAccessProvider, type AccountAccessPorts } from '@sightplay/account-access-client';
import { PreferencesProvider } from '@sightplay/preferences';

import { translations } from '../../../i18n';
import { PasskeyManagement } from '../PasskeyManagement';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));

vi.mock('@sightplay/identity-client', () => ({
  useIdentity: () => ({ logout: logoutMock }),
}));

function renderManagement(api: AccountAccessPorts['api'], onCredentialSetChanged = vi.fn()) {
  render(
    <PreferencesProvider initialLanguage="en">
      <AccountAccessProvider
        ports={{ api }}
        onOutput={(output) => {
          if (output.kind === 'credentialSetChanged') onCredentialSetChanged();
        }}
      >
        <PasskeyManagement onClose={vi.fn()} />
      </AccountAccessProvider>
    </PreferencesProvider>
  );
  return onCredentialSetChanged;
}

function accountApi(overrides: Partial<AccountAccessPorts['api']> = {}): AccountAccessPorts['api'] {
  return {
    loadAccountAccess: vi.fn(async () => ({
      ok: true as const,
      value: { credentials: [], invitationAccess: null },
    })),
    createInvitation: vi.fn(),
    revokeCredential: vi.fn(),
    createInvitationAccess: vi.fn(),
    revokeInvitationAccess: vi.fn(),
    ...overrides,
  };
}

describe('PasskeyManagement assembled behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('executes credential revocation through the core and reports the resulting capability output', async () => {
    const user = userEvent.setup();
    const api = accountApi({
      loadAccountAccess: vi.fn(async () => ({
        ok: true as const,
        value: {
          credentials: [
            { id: 'phone', name: 'Phone', createdAt: 1 },
            { id: 'laptop', name: 'Laptop', createdAt: 2 },
          ],
          invitationAccess: null,
        },
      })),
      revokeCredential: vi.fn(async () => ({ ok: true as const, value: undefined })),
    });
    const onCredentialSetChanged = renderManagement(api);

    await user.click(
      (await screen.findAllByRole('button', { name: translations.en.passkeyRemove }))[1]
    );

    await waitFor(() => expect(screen.queryByText('Laptop')).toBeNull());
    expect(api.revokeCredential).toHaveBeenCalledWith('laptop', expect.any(AbortSignal));
    expect(onCredentialSetChanged).toHaveBeenCalledTimes(1);
  });

  it('creates an invitation through the injected capability and preserves copy as local UI feedback', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const api = accountApi({
      loadAccountAccess: vi.fn(async () => ({
        ok: true as const,
        value: {
          credentials: [{ id: 'phone', name: 'Phone', createdAt: 1 }],
          invitationAccess: null,
        },
      })),
      createInvitation: vi.fn(async () => ({ ok: true as const, value: 'ABCD-EFGH' })),
    });
    renderManagement(api);

    await user.click(
      await screen.findByRole('button', { name: translations.en.inviteCodeGenerate })
    );
    await user.click(await screen.findByRole('button', { name: translations.en.inviteCodeCopy }));

    expect(writeText).toHaveBeenCalledWith('ABCD-EFGH');
  });

  it('shows an invitation-only CLI credential once and copies it locally', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const api = accountApi({
      createInvitationAccess: vi.fn(async () => ({
        ok: true as const,
        value: {
          token: 'sp_inv_example-token-for-ui-testing-1234567890',
          credential: { id: 'access-1', createdAt: 1, expiresAt: 2 },
        },
      })),
    });
    renderManagement(api);

    await user.click(await screen.findByRole('button', { name: translations.en.inviteCliCreate }));
    await user.click(await screen.findByRole('button', { name: translations.en.inviteCliCopy }));

    expect(writeText).toHaveBeenCalledWith('sp_inv_example-token-for-ui-testing-1234567890');
  });

  it('keeps logout as an Identity intent rather than an Account Access mutation', async () => {
    const user = userEvent.setup();
    renderManagement(accountApi());

    await user.click(await screen.findByRole('button', { name: translations.en.authLogoutButton }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
