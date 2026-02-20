import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../../../i18n';
import { useUiStore } from '../../../store/uiStore';
import { PasskeyManagement } from '../PasskeyManagement';

const { checkSessionMock, logoutMock, writeTextMock } = vi.hoisted(() => ({
  checkSessionMock: vi.fn(),
  logoutMock: vi.fn(),
  writeTextMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../useAuthContext', () => ({
  useAuthContext: () => ({
    checkSession: checkSessionMock,
    logout: logoutMock,
  }),
}));

describe('PasskeyManagement integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ lang: 'en' });

    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    window.confirm = vi.fn(() => true);
  });

  it('renders passkey list and updates after deleting one passkey', async () => {
    const user = userEvent.setup();
    let passkeys = [
      { id: 'pk-1', name: 'Phone', createdAt: Date.now() },
      { id: 'pk-2', name: 'Laptop', createdAt: Date.now() },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === '/api/auth/passkeys' && !init?.method) {
          return { ok: true, json: async () => passkeys } as Response;
        }
        if (input === '/api/auth/passkeys?id=pk-2' && init?.method === 'DELETE') {
          passkeys = passkeys.filter((item) => item.id !== 'pk-2');
          return { ok: true } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(<PasskeyManagement onClose={vi.fn()} />);

    expect(await screen.findByText('Phone')).toBeTruthy();
    expect(screen.getByText('Laptop')).toBeTruthy();

    const removeButtons = screen.getAllByRole('button', { name: translations.en.passkeyRemove });
    await user.click(removeButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Phone')).toBeTruthy();
      expect(screen.queryByText('Laptop')).toBeFalsy();
    });

    expect(checkSessionMock).toHaveBeenCalledTimes(1);
  });

  it('generates invite code and supports copy interaction', async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === '/api/auth/passkeys') {
          return {
            ok: true,
            json: async () => [{ id: 'pk-1', name: 'Phone', createdAt: Date.now() }],
          } as Response;
        }
        if (input === '/api/auth/invite' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ codes: ['ABCD-EFGH'] }) } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(<PasskeyManagement onClose={vi.fn()} />);

    await user.click(
      await screen.findByRole('button', { name: translations.en.inviteCodeGenerate })
    );

    expect(await screen.findByText('ABCD-EFGH')).toBeTruthy();

    await user.click(screen.getByText(translations.en.inviteCodeCopy));

    await waitFor(() => {
      expect(screen.getByText(translations.en.inviteCodeCopied)).toBeTruthy();
    });
  });

  it('calls auth logout when logout button is clicked', async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => [{ id: 'pk-1', name: 'Phone', createdAt: Date.now() }],
          }) as Response
      )
    );

    render(<PasskeyManagement onClose={vi.fn()} />);

    await screen.findByText('Phone');
    await user.click(screen.getByRole('button', { name: translations.en.authLogoutButton }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('keeps list + invite + logout functional across language switch', async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === '/api/auth/passkeys') {
          return {
            ok: true,
            json: async () => [{ id: 'pk-1', name: 'Phone', createdAt: Date.now() }],
          } as Response;
        }
        if (input === '/api/auth/invite' && init?.method === 'POST') {
          return { ok: true, json: async () => ({ codes: ['ZXCV-BNMQ'] }) } as Response;
        }
        return { ok: false, json: async () => ({}) } as Response;
      })
    );

    render(<PasskeyManagement onClose={vi.fn()} />);

    expect(await screen.findByText('Phone')).toBeTruthy();

    act(() => {
      useUiStore.setState({ lang: 'zh' });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: translations.zh.inviteCodeGenerate })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: translations.zh.inviteCodeGenerate }));
    expect(await screen.findByText('ZXCV-BNMQ')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: translations.zh.authLogoutButton }));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
