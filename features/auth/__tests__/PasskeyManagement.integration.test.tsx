import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountAccessProvider, type AccountAccessPorts } from '@sightplay/account-access-client';

import { translations } from '../../../i18n';
import { useUiStore } from '../../../store/uiStore';
import { PasskeyManagement } from '../PasskeyManagement';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));

vi.mock('@sightplay/identity-client', () => ({
  useIdentity: () => ({ logout: logoutMock }),
}));

function renderManagement(api: AccountAccessPorts['api'], onCredentialSetChanged = vi.fn()) {
  render(
    <AccountAccessProvider
      ports={{ api }}
      onOutput={(output) => {
        if (output.kind === 'credentialSetChanged') onCredentialSetChanged();
      }}
    >
      <PasskeyManagement onClose={vi.fn()} />
    </AccountAccessProvider>
  );
  return onCredentialSetChanged;
}

describe('PasskeyManagement assembled behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ lang: 'en' });
    window.confirm = vi.fn(() => true);
  });

  it('executes credential revocation through the core and reports the resulting capability output', async () => {
    const user = userEvent.setup();
    const api: AccountAccessPorts['api'] = {
      listCredentials: vi.fn(async () => ({
        ok: true as const,
        value: [
          { id: 'phone', name: 'Phone', createdAt: 1 },
          { id: 'laptop', name: 'Laptop', createdAt: 2 },
        ],
      })),
      createInvitation: vi.fn(),
      revokeCredential: vi.fn(async () => ({ ok: true as const, value: undefined })),
    };
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
    const api: AccountAccessPorts['api'] = {
      listCredentials: vi.fn(async () => ({
        ok: true as const,
        value: [{ id: 'phone', name: 'Phone', createdAt: 1 }],
      })),
      createInvitation: vi.fn(async () => ({ ok: true as const, value: 'ABCD-EFGH' })),
      revokeCredential: vi.fn(),
    };
    renderManagement(api);

    await user.click(
      await screen.findByRole('button', { name: translations.en.inviteCodeGenerate })
    );
    await user.click(await screen.findByRole('button', { name: translations.en.inviteCodeCopy }));

    expect(writeText).toHaveBeenCalledWith('ABCD-EFGH');
  });

  it('keeps logout as an Identity intent rather than an Account Access mutation', async () => {
    const user = userEvent.setup();
    renderManagement({
      listCredentials: vi.fn(async () => ({ ok: true as const, value: [] })),
      createInvitation: vi.fn(),
      revokeCredential: vi.fn(),
    });

    await user.click(await screen.findByRole('button', { name: translations.en.authLogoutButton }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
